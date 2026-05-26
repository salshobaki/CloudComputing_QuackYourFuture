"use strict";

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { streamToString, httpResponse } = require("./shared");

const PROFILES_BUCKET = process.env.PROFILES_BUCKET || "quackurfuture-profiles";
const REGION          = process.env.AWS_REGION       || "us-east-1";
const PROFILE_KEY     = "default-user/profile.json";

const s3 = new S3Client({ region: REGION });

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return httpResponse(200, {});
  }

  try {
    const res  = await s3.send(new GetObjectCommand({ Bucket: PROFILES_BUCKET, Key: PROFILE_KEY }));
    const text = await streamToString(res.Body);
    return httpResponse(200, JSON.parse(text));
  } catch (err) {
    if (err.name === "NoSuchKey") {
      return httpResponse(200, { success: false, empty: true });
    }
    console.error("GET /get-profile error:", err);
    return httpResponse(500, { error: err.message });
  }
};
