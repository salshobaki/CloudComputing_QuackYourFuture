"use strict";

// Entry point re-exports — each function is configured in AWS to point at its
// own file (uploadCV.handler / tailorCV.handler). This file exists for local
// testing convenience only.
const { handler: uploadCV } = require("./uploadCV");
const { handler: tailorCV } = require("./tailorCV");

module.exports = { uploadCV, tailorCV };
