require('dotenv').config();
const path   = require('path');
const express = require('express');
const cors = require('cors');

const profileRouter  = require('./routes/profile');
const generateRouter = require('./routes/generate');
const historyRouter  = require('./routes/history');

const app      = express();
const PORT     = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '../frontend/dist');

app.use(cors());
app.use(express.json());
app.use(express.static(DIST_DIR));

app.get('/health', (_req, res) => res.json({ message: 'QuackYourFuture backend running' }));

app.use('/api/profile',  profileRouter);
app.use('/api/generate', generateRouter);
app.use('/api/history',  historyRouter);

app.get('*', (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
