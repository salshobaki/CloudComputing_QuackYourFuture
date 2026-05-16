const { Router } = require('express');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const router = Router();
const s3 = new S3Client({ region: 'us-east-1' });

const BUCKET = 'quackurfuture-profiles';
const USER_ID = 'default-user';

router.get('/data', async (req, res) => {
  try {
    const response = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: `${USER_ID}/profile.json`,
    }));

    const body = await response.Body.transformToString();
    res.json(JSON.parse(body));
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      return res.json({ success: false, empty: true });
    }
    console.error('GET /profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const profile = req.body;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${USER_ID}/profile.json`,
      Body: JSON.stringify(profile),
      ContentType: 'application/json',
    }));

    res.json({ success: true });
  } catch (err) {
    console.error('POST /profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
