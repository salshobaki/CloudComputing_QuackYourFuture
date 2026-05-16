const { Router } = require('express');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const router = Router();
const lambda = new LambdaClient({ region: 'us-east-1' });

const FUNCTION_NAME = 'quackurfuture-lambda';
const USER_ID = 'default-user';

router.post('/', async (req, res) => {
  const { jobDescription } = req.body;

  if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
    return res.status(400).json({ error: 'jobDescription is required.' });
  }

  try {
    const payload = JSON.stringify({ userId: USER_ID, jobDescription });

    const response = await lambda.send(new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: Buffer.from(payload),
    }));

    if (response.FunctionError) {
      const errBody = Buffer.from(response.Payload).toString();
      console.error('Lambda function error:', errBody);
      return res.status(502).json({ error: 'CV generation failed.', detail: errBody });
    }

    const result = JSON.parse(Buffer.from(response.Payload).toString());

    // Lambda may wrap its response in a body string (API Gateway style)
    const body = typeof result.body === 'string' ? JSON.parse(result.body) : result;

    res.json(body);
  } catch (err) {
    console.error('POST /generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
