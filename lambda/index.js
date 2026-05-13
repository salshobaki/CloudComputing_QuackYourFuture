"use strict";

const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } = require("docx");
const OpenAI = require("openai").default;

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFILES_BUCKET = "quackurfuture-profiles";
const OUTPUTS_BUCKET  = "quackurfuture-outputs";
const SECRET_NAME     = "quackurfuture/openai-key";
const REGION          = process.env.AWS_REGION || "us-east-1";
// Pre-signed URL expiry: 1 hour
const SIGNED_URL_TTL  = 3600;

// ─── AWS clients (initialised once, reused across warm invocations) ───────────

const s3Client      = new S3Client({ region: REGION });
const secretsClient = new SecretsManagerClient({ region: REGION });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a readable stream (S3 Body) to a UTF-8 string.
 */
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Retrieve the OpenAI API key from AWS Secrets Manager.
 * The secret is expected to be a JSON object with one of:
 *   { "apiKey": "sk-..." }  |  { "api_key": "sk-..." }  |  { "OPENAI_API_KEY": "sk-..." }
 */
async function getOpenAIKey() {
  const command  = new GetSecretValueCommand({ SecretId: SECRET_NAME });
  const response = await secretsClient.send(command);
  const secret   = JSON.parse(response.SecretString);
  const key = secret.apiKey || secret.api_key || secret.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI API key not found in secret — expected field: apiKey, api_key, or OPENAI_API_KEY");
  return key;
}

/**
 * Fetch the user's CV profile JSON from S3.
 * Expected S3 key format: <userId>/profile.json
 */
async function getCVProfile(userId) {
  const command  = new GetObjectCommand({
    Bucket: PROFILES_BUCKET,
    Key: `${userId}/profile.json`,
  });
  const response = await s3Client.send(command);
  const text     = await streamToString(response.Body);
  return JSON.parse(text);
}

/**
 * Ask OpenAI to tailor the CV for a given job description.
 *
 * Returns: { tailoredCV: string, fitScore: number, fitJustification: string }
 *
 * We request a strict JSON response so parsing is deterministic.
 */
async function tailorCVWithOpenAI(apiKey, cvProfile, jobDescription) {
  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert career coach and CV writer.
Your task is to rewrite a candidate's CV to best match a specific job description.

Rules:
- Keep all facts truthful — do not fabricate experience or skills.
- Reorder and rephrase bullet points to emphasise relevant experience.
- Use concise, active-voice language.
- Return ONLY valid JSON matching this exact schema (no markdown fences):
{
  "tailoredCV": "<full plain-text CV, sections separated by \\n\\n>",
  "fitScore": <integer 0-100>,
  "fitJustification": "<one sentence explaining the score>"
}`;

  const userPrompt = `JOB DESCRIPTION:
${jobDescription}

CANDIDATE CV PROFILE (JSON):
${JSON.stringify(cvProfile, null, 2)}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ],
  });

  const raw    = completion.choices[0].message.content;
  const parsed = JSON.parse(raw);

  // Validate required fields
  if (typeof parsed.tailoredCV       !== "string")  throw new Error("LLM response missing tailoredCV");
  if (typeof parsed.fitScore         !== "number")  throw new Error("LLM response missing fitScore");
  if (typeof parsed.fitJustification !== "string")  throw new Error("LLM response missing fitJustification");

  parsed.fitScore = Math.min(100, Math.max(0, Math.round(parsed.fitScore)));
  return parsed;
}

/**
 * Build a .docx Buffer from plain-text CV content.
 *
 * Sections are separated by blank lines; lines that are fully uppercase
 * (e.g. "EXPERIENCE", "EDUCATION") are treated as section headings.
 */
async function buildDocx(tailoredText, candidateName) {
  const lines      = tailoredText.split("\n");
  const paragraphs = [];

  // Cover page title
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: candidateName || "Tailored CV", bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      // Blank line → small spacing paragraph
      paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
      continue;
    }

    // Heuristic: all-caps short line is a section heading
    const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length < 60 && /[A-Z]/.test(trimmed);

    if (isHeading) {
      paragraphs.push(
        new Paragraph({
          text:     trimmed,
          heading:  HeadingLevel.HEADING_2,
          spacing:  { before: 240, after: 120 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, size: 22 })],
          spacing:  { after: 80 },
        })
      );
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [{ properties: {}, children: paragraphs }],
  });

  return Packer.toBuffer(doc);
}

/**
 * Upload a Buffer to S3 and return a 1-hour pre-signed download URL.
 */
async function uploadDocxAndSign(buffer, s3Key) {
  // Upload
  await s3Client.send(
    new PutObjectCommand({
      Bucket:      OUTPUTS_BUCKET,
      Key:         s3Key,
      Body:        buffer,
      ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
  );

  // Generate pre-signed URL (valid for SIGNED_URL_TTL seconds)
  const signedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: OUTPUTS_BUCKET, Key: s3Key }),
    { expiresIn: SIGNED_URL_TTL }
  );

  return signedUrl;
}

// ─── Lambda Handler ───────────────────────────────────────────────────────────

/**
 * Expected event body (JSON string or object):
 * {
 *   "userId":         "user-123",           // used to locate the S3 profile
 *   "jobDescription": "We are looking for…"
 * }
 *
 * Response (HTTP 200):
 * {
 *   "fitScore":         85,
 *   "fitJustification": "Strong Python background aligns with 80 % of requirements.",
 *   "downloadUrl":      "https://…"
 * }
 */
exports.handler = async (event) => {
  // ── 1. Parse & validate input ────────────────────────────────────────────

  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body ?? event);
  } catch {
    return response(400, { error: "Request body must be valid JSON" });
  }

  const { userId, jobDescription } = body;

  if (!userId)         return response(400, { error: "Missing required field: userId" });
  if (!jobDescription) return response(400, { error: "Missing required field: jobDescription" });

  // ── 2. Fetch CV profile from S3 ──────────────────────────────────────────

  let cvProfile;
  try {
    cvProfile = await getCVProfile(userId);
  } catch (err) {
    console.error("Failed to fetch CV profile:", err);
    return response(404, { error: `CV profile not found for userId: ${userId}` });
  }

  // ── 3. Retrieve OpenAI API key from Secrets Manager ──────────────────────

  let apiKey;
  try {
    apiKey = await getOpenAIKey();
  } catch (err) {
    console.error("Failed to retrieve OpenAI key:", err);
    return response(500, { error: "Could not retrieve OpenAI API key" });
  }

  // ── 4. Tailor the CV via OpenAI ───────────────────────────────────────────

  let tailoredCV, fitScore, fitJustification;
  try {
    ({ tailoredCV, fitScore, fitJustification } = await tailorCVWithOpenAI(apiKey, cvProfile, jobDescription));
  } catch (err) {
    console.error("OpenAI tailoring failed:", err);
    return response(502, { error: "Failed to tailor CV via OpenAI", detail: err.message });
  }

  // ── 5. Build .docx ────────────────────────────────────────────────────────

  let docxBuffer;
  try {
    const candidateName = [cvProfile.firstName, cvProfile.lastName].filter(Boolean).join(" ")
      || cvProfile.name
      || userId;
    docxBuffer = await buildDocx(tailoredCV, candidateName);
  } catch (err) {
    console.error("DOCX generation failed:", err);
    return response(500, { error: "Failed to generate .docx file" });
  }

  // ── 6. Upload to S3 & generate pre-signed URL ─────────────────────────────

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const s3Key     = `${userId}/tailored-cv-${timestamp}.docx`;

  let downloadUrl;
  try {
    downloadUrl = await uploadDocxAndSign(docxBuffer, s3Key);
  } catch (err) {
    console.error("S3 upload failed:", err);
    return response(500, { error: "Failed to upload .docx to S3" });
  }

  // ── 7. Return result ──────────────────────────────────────────────────────

  return response(200, { fitScore, fitJustification, downloadUrl });
};

// ─── Response helper ──────────────────────────────────────────────────────────

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
