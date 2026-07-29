const express = require('express');

const router = express.Router();

// Nominatim (OpenStreetMap) doesn't send CORS headers, so the browser can't call it
// directly — this proxies the request server-side with a proper User-Agent per their
// usage policy (https://operations.osmfoundation.org/policies/nominatim/).
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim().slice(0, 200);
  if (!q) return res.json({ results: [] });

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Taklifnoma/1.0 (https://taklifnoma.online)' }
    });
    const data = await upstream.json();
    const results = data.map((r) => ({
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      display_name: r.display_name
    }));
    res.json({ results });
  } catch (e) {
    res.status(502).json({ error: "Manzilni topib bo'lmadi", results: [] });
  }
});

module.exports = router;
