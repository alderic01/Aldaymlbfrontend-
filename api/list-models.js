const KEY = process.env.GOOGLE_AI_KEY || 'AIzaSyCPjCulnJhCYx-XAZOPK_zy5kTpISlAyVk';

export default async function handler(req, res) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}&pageSize=100`);
    if (!r.ok) return res.status(200).json({ error: r.status, body: await r.text() });
    const data = await r.json();
    const models = (data.models || []).map(m => ({
      name: m.name,
      displayName: m.displayName,
      methods: m.supportedGenerationMethods
    }));
    // Filter to image-capable
    const imageModels = models.filter(m =>
      m.name.includes('image') || m.name.includes('imagen') ||
      (m.methods && m.methods.some(method => method.includes('generate')))
    );
    return res.status(200).json({ total: models.length, imageModels, allModels: models.map(m => m.name) });
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
