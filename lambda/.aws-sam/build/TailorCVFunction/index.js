"use strict";

// Re-exports for local testing. Each function is deployed separately in AWS
// and configured to point at its own file (e.g. uploadCV.handler).
const { handler: uploadCV }    = require("./uploadCV");
const { handler: tailorCV }    = require("./tailorCV");
const { handler: getProfile }  = require("./getProfile");
const { handler: saveProfile } = require("./saveProfile");
const { handler: getHistory }  = require("./getHistory");

module.exports = { uploadCV, tailorCV, getProfile, saveProfile, getHistory };
