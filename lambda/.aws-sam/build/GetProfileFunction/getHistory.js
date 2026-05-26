"use strict";

const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { httpResponse } = require("./shared");

const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || "quackurfuture-outputs";
const REGION         = process.env.AWS_REGION      || "us-east-1";
const PREFIX         = "default-user/";

const s3 = new S3Client({ region: REGION });

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return httpResponse(200, {});
  }

  try {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: OUTPUTS_BUCKET, Prefix: PREFIX }));

    const history = (res.Contents ?? []).map((obj) => ({
      key:          obj.Key,
      lastModified: obj.LastModified,
      size:         obj.Size,
    }));

    return httpResponse(200, { history });
  } catch (err) {
    console.error("GET /get-history error:", err);
    return httpResponse(500, { error: err.message });
  }
};
