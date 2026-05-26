"use strict";

const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const REGION = process.env.AWS_REGION || "us-east-1";
const SECRET_NAME = process.env.SECRET_NAME || "quackurfuture/API-key";

const secretsClient = new SecretsManagerClient({ region: REGION });

let _cachedKey = null;

async function getOpenAIKey() {
  if (_cachedKey) return _cachedKey;
  const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
  const secret = JSON.parse(res.SecretString);
  _cachedKey = secret.apiKey || secret.api_key || secret.OPENAI_API_KEY;
  if (!_cachedKey) throw new Error("OpenAI key not found in secret — expected field: apiKey, api_key, or OPENAI_API_KEY");
  return _cachedKey;
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function httpResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

module.exports = { getOpenAIKey, streamToString, httpResponse };
