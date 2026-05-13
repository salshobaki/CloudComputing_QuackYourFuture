const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CV Tailoring System</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f0f4f8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 48px 64px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }
    h1 { font-size: 2rem; color: #1a202c; }
    p  { margin-top: 12px; color: #718096; font-size: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>CV Tailoring System is Running 🚀</h1>
    <p>Server is up and healthy on port 3000.</p>
  </div>
</body>
</html>`);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
