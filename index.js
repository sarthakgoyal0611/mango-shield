const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { pool, initDb } = require('./db');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.development' });
}

function makeLeadPublicId() {
  return 'LEAD-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('OK')); // EB health check friendly

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

app.post('/api/leads', async (req, res) => {
  try {
    const { name, phone, city, quantity, message } = req.body;
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });

    const publicId = makeLeadPublicId();

    await pool.query(
      `INSERT INTO leads (public_id, name, phone, city, quantity, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [publicId, name, phone, city, quantity, message]
    );

    res.status(201).json({ id: publicId, message: 'Lead created successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/leads', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM leads ORDER BY created_at DESC`);
  res.json(rows);
});

app.get('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(`SELECT * FROM leads WHERE public_id=$1`, [id]);
  if (!rows[0]) return res.status(404).json({ message: 'Lead not found' });
  res.json(rows[0]);
});

app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(`DELETE FROM leads WHERE public_id=$1`, [id]);
  if (result.rowCount === 0) return res.status(404).json({ message: 'Lead not found' });
  res.json({ message: 'Lead deleted successfully' });
});

app.get('/api/stats', async (req, res) => {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM leads`);
  res.json({ totalLeads: rows[0].count });
});

(async () => {
  try {
    await initDb();
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  } catch (e) {
    console.error('DB init failed:', e);
    process.exit(1);
  }
})();
