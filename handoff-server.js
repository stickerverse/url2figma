const express = require('express');
const cors = require('cors');
const { v4: uuid } = require('uuid');
const { processSchema } = require('./server/yoga-processor');

const PORT = process.env.HANDOFF_PORT ? Number(process.env.HANDOFF_PORT) : 4411;

const app = express();
const queue = [];

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, queueLength: queue.length });
});

app.post('/jobs', (req, res) => {
  if (!req.body) {
    return res.status(400).json({ ok: false, error: 'Missing request body' });
  }

  const applyYoga = req.query.applyYoga !== 'false';
  let payload = req.body;

  if (applyYoga) {
    try {
      const clone =
        typeof structuredClone === 'function'
          ? structuredClone(req.body)
          : JSON.parse(JSON.stringify(req.body));
      payload = processSchema(clone);
    } catch (error) {
      console.warn('[handoff] Yoga processing failed, enqueuing original payload', error);
    }
  }

  const job = {
    id: uuid(),
    timestamp: Date.now(),
    payload
  };

  queue.push(job);
  console.log(`[handoff] received job ${job.id} (queue=${queue.length})`);
  res.json({ ok: true, id: job.id, queueLength: queue.length });
});

app.get('/jobs/next', (_req, res) => {
  const job = queue.shift() || null;
  if (job) {
    console.log(`[handoff] delivering job ${job.id} (queue=${queue.length})`);
  }
  res.json({ job });
});

app.listen(PORT, () => {
  console.log(`[handoff] server listening on http://127.0.0.1:${PORT}`);
});
