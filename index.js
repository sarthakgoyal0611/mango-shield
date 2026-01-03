const isProd = process.env.NODE_ENV === 'production';
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');
const crypto = require('crypto');

function makeLeadPublicId() {
  // 6 bytes => 12 hex chars
  return 'LEAD-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

dotenv.config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

/* ------------------ HEALTH ------------------ */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

/* ------------------ CREATE LEAD ------------------ */
app.post('/api/leads', (req, res) => {
  const { name, phone, city, quantity, message } = req.body;

  if (!name || !phone) {
    return res.status(400).json({
      message: 'Name and phone are required',
    });
  }

  const publicId = makeLeadPublicId();

const stmt = db.prepare(`
  INSERT INTO leads (public_id, name, phone, city, quantity, message)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const result = stmt.run(publicId, name, phone, city, quantity, message);

res.status(201).json({
  id: publicId,
  message: 'Lead saved successfully',
});

});

/* ------------------ GET ALL LEADS ------------------ */
app.get('/api/leads', (req, res) => {
  const rows = db
    .prepare(`SELECT * FROM leads ORDER BY created_at DESC`)
    .all();

  res.json(rows);
});

/* ------------------ GET SINGLE LEAD ------------------ */
app.get('/api/leads/:id', (req, res) => {
  const { id } = req.params;

  const lead = db
    .prepare(`SELECT * FROM leads WHERE id = ?`)
    .get(id);

  if (!lead) {
    return res.status(404).json({
      message: 'Lead not found',
    });
  }

  res.json(lead);
});

/* ------------------ DELETE LEAD ------------------ */
app.delete('/api/leads/:id', (req, res) => {
  const { id } = req.params;

  const result = db
    .prepare(`DELETE FROM leads WHERE id = ?`)
    .run(id);

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Lead not found',
    });
  }

  res.json({
    message: 'Lead deleted successfully',
  });
});

/* ------------------ STATS ------------------ */
app.get('/api/stats', (req, res) => {
  const total = db
    .prepare(`SELECT COUNT(*) as count FROM leads`)
    .get();

  res.json({
    totalLeads: total.count,
  });
});

/* ------------------ START SERVER ------------------ */
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
