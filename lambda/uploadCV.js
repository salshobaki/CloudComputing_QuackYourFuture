"use strict";

const busboy = require("busboy");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const OpenAI = require("openai").default;
const { getOpenAIKey, httpResponse } = require("./shared");

const PROFILES_BUCKET = process.env.PROFILES_BUCKET || "quackurfuture-profiles";
const REGION          = process.env.AWS_REGION       || "us-east-1";
const DEFAULT_USER    = "default-user";

const s3 = new S3Client({ region: REGION });

// ─── Multipart parser ─────────────────────────────────────────────────────────

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType =
      event.headers?.["content-type"] ||
      event.headers?.["Content-Type"] ||
      "";

    const bb = busboy({ headers: { "content-type": contentType } });
    const files  = {};
    const fields = {};

    bb.on("file", (name, stream, info) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        files[name] = { filename: info.filename, contentType: info.mimeType, data: Buffer.concat(chunks) };
      });
    });

    bb.on("field", (name, value) => { fields[name] = value; });
    bb.on("close", () => resolve({ files, fields }));
    bb.on("error", reject);

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body || "");

    bb.write(body);
    bb.end();
  });
}

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractText(buffer, mimeType) {
  if (mimeType.includes("pdf")) {
    const pdfParse = require("pdf-parse");
    const { text } = await pdfParse(buffer);
    return text;
  }
  if (mimeType.includes("wordprocessingml") || mimeType.includes("docx")) {
    const mammoth = require("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  throw new Error("Unsupported file type. Please upload a PDF or DOCX.");
}

// ─── LLM profile extraction ───────────────────────────────────────────────────

async function extractProfile(apiKey, cvText) {
  const openai = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });

  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    temperature: 0.1,
    response_format: { type: "json_object" },
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

// ─── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return httpResponse(200, {});
  }

  // 1. Parse multipart body
  let files, fields;
  try {
    ({ files, fields } = await parseMultipart(event));
  } catch (err) {
    return httpResponse(400, { error: "Invalid multipart request: " + err.message });
  }

  const upload = files.file;
  if (!upload) return httpResponse(400, { error: "No file received. Form field name must be 'file'." });

  const userId = fields.userId || DEFAULT_USER;
  const ext    = upload.contentType.includes("pdf") ? "pdf" : "docx";
  const rawKey = `${userId}/cv-original.${ext}`;

  // 2. Store raw file in S3
  try {
    await s3.send(new PutObjectCommand({
      Bucket:      PROFILES_BUCKET,
      Key:         rawKey,
      Body:        upload.data,
      ContentType: upload.contentType,
    }));
  } catch (err) {
    console.error("S3 raw upload failed:", err);
    return httpResponse(500, { error: "Failed to store uploaded file." });
  }

  // 3. Extract plain text from file
  let cvText;
  try {
    cvText = await extractText(upload.data, upload.contentType);
  } catch (err) {
    return httpResponse(422, { error: err.message });
  }

  // 4. Extract structured profile via LLM
  let profile;
  try {
    const apiKey = await getOpenAIKey();
    profile = await extractProfile(apiKey, cvText);
  } catch (err) {
    console.error("Profile extraction failed:", err);
    return httpResponse(502, { error: "Failed to extract profile from CV: " + err.message });
  }

  // 5. Save profile JSON to S3
  const profileKey = `${userId}/profile.json`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket:      PROFILES_BUCKET,
      Key:         profileKey,
      Body:        JSON.stringify(profile),
      ContentType: "application/json",
    }));
  } catch (err) {
    console.error("Profile JSON save failed:", err);
    return httpResponse(500, { error: "Failed to save extracted profile." });
  }

  return httpResponse(200, { profileKey });
};
