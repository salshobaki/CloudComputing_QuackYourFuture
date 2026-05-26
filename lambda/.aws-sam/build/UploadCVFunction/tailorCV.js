"use strict";

const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } = require("docx");
const OpenAI = require("openai").default;
const { getOpenAIKey, streamToString, httpResponse } = require("./shared");

const PROFILES_BUCKET = process.env.PROFILES_BUCKET || "quackurfuture-profiles";
const OUTPUTS_BUCKET  = process.env.OUTPUTS_BUCKET  || "quackurfuture-outputs";
const REGION          = process.env.AWS_REGION       || "us-east-1";
const SIGNED_URL_TTL  = 3600;

const s3 = new S3Client({ region: REGION });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchProfile(profileKey) {
  const res  = await s3.send(new GetObjectCommand({ Bucket: PROFILES_BUCKET, Key: profileKey }));
  const text = await streamToString(res.Body);
  return JSON.parse(text);
}

async function tailorWithLLM(apiKey, cvProfile, jobDescription) {
  const openai = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });

  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    temperature: 0.3,
    response_format: { type: "json_object" },
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
      {
        role: "user",
        content: `JOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE CV PROFILE (JSON):\n${JSON.stringify(cvProfile, null, 2)}`,
      },
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
  const lines      = tailoredText.split("\n");
  const paragraphs = [];

  paragraphs.push(
    new Paragraph({
      children:  [new TextRun({ text: candidateName || "Tailored CV", bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing:   { after: 400 },
    })
  );

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
      continue;
    }

    const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length < 60 && /[A-Z]/.test(trimmed);

    paragraphs.push(
      isHeading
        ? new Paragraph({ text: trimmed, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } })
        : new Paragraph({ children: [new TextRun({ text: trimmed, size: 22 })], spacing: { after: 80 } })
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: {}, children: paragraphs }],
  });

  return Packer.toBuffer(doc);
}

async function uploadAndSign(buffer, s3Key) {
  await s3.send(new PutObjectCommand({
    Bucket:      OUTPUTS_BUCKET,
    Key:         s3Key,
    Body:        buffer,
    ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }));

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: OUTPUTS_BUCKET, Key: s3Key }),
    { expiresIn: SIGNED_URL_TTL }
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return httpResponse(200, {});
  }

  // 1. Parse & validate input
  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body ?? event);
  } catch {
    return httpResponse(400, { error: "Request body must be valid JSON." });
  }

  const { profileKey, jobDescription } = body;

  if (!profileKey)      return httpResponse(400, { error: "Missing required field: profileKey" });
  if (!jobDescription)  return httpResponse(400, { error: "Missing required field: jobDescription" });

  // 2. Fetch profile from S3
  let cvProfile;
  try {
    cvProfile = await fetchProfile(profileKey);
  } catch (err) {
    console.error("Profile fetch failed:", err);
    return httpResponse(404, { error: `Profile not found at key: ${profileKey}` });
  }

  // 3. Get API key
  let apiKey;
  try {
    apiKey = await getOpenAIKey();
  } catch (err) {
    console.error("Secret retrieval failed:", err);
    return httpResponse(500, { error: "Could not retrieve API key." });
  }

  // 4. Tailor CV via LLM
  let tailoredCV, fitScore, fitJustification;
  try {
    ({ tailoredCV, fitScore, fitJustification } = await tailorWithLLM(apiKey, cvProfile, jobDescription));
  } catch (err) {
    console.error("LLM tailoring failed:", err);
    return httpResponse(502, { error: "Failed to tailor CV.", detail: err.message });
  }

  // 5. Build .docx
  let docxBuffer;
  try {
    const candidateName = [
      cvProfile.basicInfo?.fullName,
      cvProfile.firstName,
      cvProfile.name,
    ].find(Boolean) || "Candidate";
    docxBuffer = await buildDocx(tailoredCV, candidateName);
  } catch (err) {
    console.error("DOCX generation failed:", err);
    return httpResponse(500, { error: "Failed to generate .docx file." });
  }

  // 6. Upload to S3 & sign
  const userId    = profileKey.split("/")[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const s3Key     = `${userId}/tailored-cv-${timestamp}.docx`;

  let downloadUrl;
  try {
    downloadUrl = await uploadAndSign(docxBuffer, s3Key);
  } catch (err) {
    console.error("S3 upload/sign failed:", err);
    return httpResponse(500, { error: "Failed to upload .docx to S3." });
  }

  return httpResponse(200, { fitScore, justification: fitJustification, downloadUrl });
};
