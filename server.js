const express = require('express');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());

const TINES_WEBHOOK = process.env.TINES_WEBHOOK_URL;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

// ─── Retry fetch with timeout ─────────────────────────

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      const isLast = attempt === retries;
      if (err.name === 'AbortError') {
        if (isLast) throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
      } else {
        if (isLast) throw err;
      }
      // Exponential backoff: 1s, 2s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      console.log(`Retrying request (attempt ${attempt + 2}/${retries + 1})...`);
    }
  }
}

// ─── Response validation ──────────────────────────────

const VALID_OUTCOMES = new Set([
  'american_victory', 'british_victory', 'french_victory',
  'prussian_victory', 'spanish_victory', 'other_victory', 'inconclusive',
]);

const VALID_SIDES = new Set(['american', 'british', 'french', 'hessian', 'neutral']);

function validateCoord(lat, lng, context) {
  const errors = [];
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90)
    errors.push(`${context}: invalid latitude ${lat}`);
  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180)
    errors.push(`${context}: invalid longitude ${lng}`);
  return errors;
}

function validateMapData(data) {
  const errors = [];

  // Required top-level string fields
  for (const field of ['name', 'date', 'location', 'description', 'outcomeLabel', 'significance']) {
    if (!data[field] || typeof data[field] !== 'string' || !data[field].trim())
      errors.push(`Missing or empty field: "${field}"`);
  }

  // Center coordinates
  if (!Array.isArray(data.center) || data.center.length !== 2) {
    errors.push('center must be a [lat, lng] array');
  } else {
    errors.push(...validateCoord(data.center[0], data.center[1], 'center'));
  }

  // Zoom
  if (typeof data.zoom !== 'number' || data.zoom < 1 || data.zoom > 20)
    errors.push(`Invalid zoom: ${data.zoom} (must be 1–20)`);

  // Outcome
  if (!VALID_OUTCOMES.has(data.outcome))
    errors.push(`Invalid outcome: "${data.outcome}"`);

  // Markers
  if (!Array.isArray(data.markers)) {
    errors.push('markers must be an array');
  } else {
    data.markers.forEach((m, i) => {
      if (!m.id || !m.label) errors.push(`markers[${i}]: missing id or label`);
      errors.push(...validateCoord(m.lat, m.lng, `markers[${i}]`));
      if (!VALID_SIDES.has(m.side)) errors.push(`markers[${i}]: invalid side "${m.side}"`);
    });
  }

  // Movements
  if (!Array.isArray(data.movements)) {
    errors.push('movements must be an array');
  } else {
    data.movements.forEach((m, i) => {
      if (!m.id || !m.label) errors.push(`movements[${i}]: missing id or label`);
      if (!Array.isArray(m.points) || m.points.length < 2)
        errors.push(`movements[${i}]: must have at least 2 points`);
      else {
        m.points.forEach((p, j) => {
          if (!Array.isArray(p) || p.length !== 2)
            errors.push(`movements[${i}].points[${j}]: must be [lat, lng]`);
          else
            errors.push(...validateCoord(p[0], p[1], `movements[${i}].points[${j}]`));
        });
      }
    });
  }

  // Zones
  if (!Array.isArray(data.zones)) {
    errors.push('zones must be an array');
  } else {
    data.zones.forEach((z, i) => {
      if (!z.id || !z.label) errors.push(`zones[${i}]: missing id or label`);
      if (!Array.isArray(z.points) || z.points.length < 3)
        errors.push(`zones[${i}]: must have at least 3 points`);
    });
  }

  return errors;
}

// ─── Route ───────────────────────────────────────────

app.post('/api/generate-map', async (req, res) => {
  const { query } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  if (!TINES_WEBHOOK) {
    return res.status(500).json({ error: 'TINES_WEBHOOK_URL is not configured in .env' });
  }

  try {
    console.log(`Generating map for: "${query}"`);

    const response = await fetchWithRetry(TINES_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tines error:', response.status, errorText);
      return res.status(502).json({
        error: `Tines returned ${response.status}. Check your story configuration.`,
      });
    }

    const raw = await response.json();

    // Tines sometimes wraps the AI output as a string
    const mapData = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Validate before sending to the client
    const validationErrors = validateMapData(mapData);
    if (validationErrors.length > 0) {
      console.error('Validation failed:', validationErrors);
      return res.status(422).json({
        error: 'AI returned invalid map data. Please try again.',
        details: validationErrors,
      });
    }

    console.log(`Map generated: ${mapData.name} (${mapData.markers.length} markers, ${mapData.movements.length} movements)`);
    res.json(mapData);

  } catch (err) {
    console.error('Server error:', err.message);
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'Could not parse AI response as JSON. Please try again.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve built frontend (production) ───────────────
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA fallback — must come after API routes
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  console.log('Serving built frontend from /dist');
}

// ─── Start ────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MapMaker running on http://localhost:${PORT}`);
  if (!TINES_WEBHOOK) console.warn('WARNING: TINES_WEBHOOK_URL is not set');
});
