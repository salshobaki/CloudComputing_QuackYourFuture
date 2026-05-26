"use strict";

const express    = require("express");
const cors       = require("cors");
const multer     = require("multer");
const serverless = require("serverless-http");

const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { getSignedUrl }  = require("@aws-sdk/s3-request-presigner");
const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } = require("docx");
const OpenAI = require("openai").default;
const { createClient } = require("@supabase/supabase-js");
const { getOpenAIKey, streamToString } = require("./shared");

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFILES_BUCKET = process.env.PROFILES_BUCKET || "quackurfuture-profiles";
const OUTPUTS_BUCKET  = process.env.OUTPUTS_BUCKET  || "quackurfuture-outputs";
const REGION          = process.env.AWS_REGION       || "us-east-1";
const SIGNED_URL_TTL  = 3600;

const s3     = new S3Client({ region: REGION });
const upload = multer({ storage: multer.memoryStorage() });

// ─── Supabase auth ────────────────────────────────────────────────────────────

let _supabase;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _supabase;
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing auth token." });
  }
  const { data: { user }, error } = await getSupabase().auth.getUser(header.slice(7));
  if (error || !user) return res.status(401).json({ error: "Invalid or expired token." });
  req.user = user;
  next();
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// ─── GET /get-profile ─────────────────────────────────────────────────────────

app.get("/get-profile", requireAuth, async (req, res) => {
  try {
    const response = await s3.send(new GetObjectCommand({
      Bucket: PROFILES_BUCKET,
      Key:    `${req.user.id}/profile.json`,
    }));
    const text = await streamToString(response.Body);
    res.json(JSON.parse(text));
  } catch (err) {
    if (err.name === "NoSuchKey") return res.json({ success: false, empty: true });
    console.error("GET /get-profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /save-profile ───────────────────────────────────────────────────────

app.post("/save-profile", requireAuth, async (req, res) => {
  try {
    await s3.send(new PutObjectCommand({
      Bucket:      PROFILES_BUCKET,
      Key:         `${req.user.id}/profile.json`,
      Body:        JSON.stringify(req.body),
      ContentType: "application/json",
    }));
    res.json({ success: true });
  } catch (err) {
    console.error("POST /save-profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /upload-cv ──────────────────────────────────────────────────────────

app.post("/upload-cv", requireAuth, upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file received. Form field name must be 'file'." });

  const userId = req.user.id;
  const ext    = file.mimetype.includes("pdf") ? "pdf" : "docx";
  const rawKey = `${userId}/cv-original.${ext}`;

  // 1. Store raw file
  try {
    await s3.send(new PutObjectCommand({
      Bucket: PROFILES_BUCKET, Key: rawKey, Body: file.buffer, ContentType: file.mimetype,
    }));
  } catch (err) {
    console.error("S3 raw upload failed:", err);
    return res.status(500).json({ error: "Failed to store uploaded file." });
  }

  // 2. Extract text
  let cvText;
  try {
    cvText = await extractText(file.buffer, file.mimetype);
  } catch (err) {
    return res.status(422).json({ error: err.message });
  }

  // 3. Extract profile via LLM
  let profile;
  try {
    const apiKey = await getOpenAIKey();
    profile = await extractProfile(apiKey, cvText);
  } catch (err) {
    console.error("Profile extraction failed:", err);
    return res.status(502).json({ error: "Failed to extract profile: " + err.message });
  }

  // 4. Save profile JSON
  const profileKey = `${userId}/profile.json`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: PROFILES_BUCKET, Key: profileKey, Body: JSON.stringify(profile), ContentType: "application/json",
    }));
  } catch (err) {
    console.error("Profile JSON save failed:", err);
    return res.status(500).json({ error: "Failed to save extracted profile." });
  }

  res.json({ profileKey });
});

// ─── POST /tailor-cv ──────────────────────────────────────────────────────────

app.post("/tailor-cv", requireAuth, async (req, res) => {
  const { profileKey, jobDescription } = req.body;

  if (!profileKey)     return res.status(400).json({ error: "Missing required field: profileKey" });
  if (!jobDescription) return res.status(400).json({ error: "Missing required field: jobDescription" });
  if (!profileKey.startsWith(req.user.id + "/")) return res.status(403).json({ error: "Forbidden." });

  // 1. Fetch profile
  let cvProfile;
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: PROFILES_BUCKET, Key: profileKey }));
    cvProfile = JSON.parse(await streamToString(response.Body));
  } catch (err) {
    console.error("Profile fetch failed:", err);
    return res.status(404).json({ error: `Profile not found at key: ${profileKey}` });
  }

  // 2. Tailor via LLM
  let tailoredCV, fitScore, fitJustification;
  try {
    const apiKey = await getOpenAIKey();
    ({ tailoredCV, fitScore, fitJustification } = await tailorWithLLM(apiKey, cvProfile, jobDescription));
  } catch (err) {
    console.error("LLM tailoring failed:", err);
    return res.status(502).json({ error: "Failed to tailor CV.", detail: err.message });
  }

  // 3. Build .docx
  let docxBuffer;
  try {
    const candidateName = [cvProfile.basicInfo?.fullName, cvProfile.firstName, cvProfile.name].find(Boolean) || "Candidate";
    docxBuffer = await buildDocx(tailoredCV, candidateName);
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate .docx file." });
  }

  // 4. Upload & sign
  const userId    = profileKey.split("/")[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const s3Key     = `${userId}/tailored-cv-${timestamp}.docx`;

  let downloadUrl;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: OUTPUTS_BUCKET, Key: s3Key, Body: docxBuffer,
      ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }));
    downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: OUTPUTS_BUCKET, Key: s3Key }), { expiresIn: SIGNED_URL_TTL });
  } catch (err) {
    return res.status(500).json({ error: "Failed to upload .docx to S3." });
  }

  res.json({ fitScore, justification: fitJustification, downloadUrl });
});

// ─── GET /get-history ─────────────────────────────────────────────────────────

app.get("/get-history", requireAuth, async (req, res) => {
  try {
    const response = await s3.send(new ListObjectsV2Command({ Bucket: OUTPUTS_BUCKET, Prefix: `${req.user.id}/` }));
    const history  = (response.Contents ?? []).map((obj) => ({ key: obj.Key, lastModified: obj.LastModified, size: obj.Size }));
    res.json({ history });
  } catch (err) {
    console.error("GET /get-history error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function extractText(buffer, mimeType) {
  if (mimeType.includes("pdf")) {
    const { text } = await require("pdf-parse")(buffer);
    return text;
  }
  if (mimeType.includes("wordprocessingml") || mimeType.includes("docx")) {
    const { value } = await require("mammoth").extractRawText({ buffer });
    return value;
  }
  throw new Error("Unsupported file type. Please upload a PDF or DOCX.");
}

async function extractProfile(apiKey, cvText) {
  const openai = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
  const completion = await openai.chat.completions.create({
    model: "deepseek-chat", temperature: 0.1, response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert CV parser. Extract structured profile data from the CV text.
Return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "basicInfo": { "fullName": "", "jobTitle": "", "email": "", "phone": "", "summary": "" },
  "experience": [{ "company": "", "role": "", "startDate": "", "endDate": "", "description": "" }],
  "education":  [{ "institution": "", "degree": "", "fieldOfStudy": "", "startDate": "", "endDate": "" }],
  "skills": [""]
}`,
      },
      { role: "user", content: `CV text:\n\n${cvText}` },
    ],
  });
  return JSON.parse(completion.choices[0].message.content);
}

async function tailorWithLLM(apiKey, cvProfile, jobDescription) {
  const openai = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
  const completion = await openai.chat.completions.create({
    model: "deepseek-chat", temperature: 0.3, response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert career coach and CV writer.
Rewrite the candidate's CV to best match the job description.
Rules:
- Keep all facts truthful — do not fabricate experience or skills.
- Reorder and rephrase bullet points to emphasise relevant experience.
- Use concise, active-voice language.
- Return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "tailoredCV":        "<full plain-text CV, sections separated by \\n\\n>",
  "fitScore":          <integer 0-100>,
  "fitJustification":  "<one sentence explaining the score>"
}`,
      },
      { role: "user", content: `JOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE CV PROFILE (JSON):\n${JSON.stringify(cvProfile, null, 2)}` },
    ],
  });
  const parsed = JSON.parse(completion.choices[0].message.content);
  if (typeof parsed.tailoredCV       !== "string") throw new Error("LLM response missing tailoredCV");
  if (typeof parsed.fitScore         !== "number") throw new Error("LLM response missing fitScore");
  if (typeof parsed.fitJustification !== "string") throw new Error("LLM response missing fitJustification");
  parsed.fitScore = Math.min(100, Math.max(0, Math.round(parsed.fitScore)));
  return parsed;
}

async function buildDocx(tailoredText, candidateName) {
  const paragraphs = [
    new Paragraph({
      children:  [new TextRun({ text: candidateName || "Tailored CV", bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing:   { after: 400 },
    }),
  ];
  for (const line of tailoredText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) { paragraphs.push(new Paragraph({ spacing: { after: 100 } })); continue; }
    const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length < 60 && /[A-Z]/.test(trimmed);
    paragraphs.push(
      isHeading
        ? new Paragraph({ text: trimmed, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } })
        : new Paragraph({ children: [new TextRun({ text: trimmed, size: 22 })], spacing: { after: 80 } })
    );
  }
  const doc = new Document({
    styles:   { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: {}, children: paragraphs }],
  });
  return Packer.toBuffer(doc);
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports.handler = serverless(app, {
  basePath: "/prod",
  binary: [
    "multipart/form-data",
    "application/octet-stream",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
});
