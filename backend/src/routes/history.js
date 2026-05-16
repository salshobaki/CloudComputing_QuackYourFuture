const { Router } = require('express');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const router = Router();
const s3 = new S3Client({ region: 'us-east-1' });

const BUCKET = 'quackurfuture-outputs';
const USER_ID = 'default-user';

router.get('/', async (req, res) => {
  try {
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `${USER_ID}/`,
    }));

    const history = (response.Contents ?? []).map((obj) => ({
      key: obj.Key,
      lastModified: obj.LastModified,
      size: obj.Size,
    }));

    res.json({ history });
  } catch (err) {
    console.error('GET /history error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
