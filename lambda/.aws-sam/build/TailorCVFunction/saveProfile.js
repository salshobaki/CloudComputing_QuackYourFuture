"use strict";

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { httpResponse } = require("./shared");

const PROFILES_BUCKET = process.env.PROFILES_BUCKET || "quackurfuture-profiles";
const REGION          = process.env.AWS_REGION       || "us-east-1";
const PROFILE_KEY     = "default-user/profile.json";

const s3 = new S3Client({ region: REGION });

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return httpResponse(200, {});
  }

  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body ?? {});
  } catch {
    return httpResponse(400, { error: "Request body must be valid JSON." });
  }

  try {
    await s3.send(new PutObjectCommand({
      Bucket:      PROFILES_BUCKET,
      Key:         PROFILE_KEY,
      Body:        JSON.stringify(body),
      ContentType: "application/json",
    }));
    return httpResponse(200, { success: true });
  } catch (err) {
    console.error("POST /save-profile error:", err);
    return httpResponse(500, { error: err.message });
  }
};
