const GOOGLE_KEY = process.env.GOOGLE_AI_KEY || 'AIzaSyCPjCulnJhCYx-XAZOPK_zy5kTpISlAyVk';

// Team uniform data for prompt generation
const TEAMS = {
  NYY: { name: 'Yankees', primary: 'Navy Blue', secondary: 'White', emblem: 'interlocking NY logo', pinstripe: true },
  BOS: { name: 'Red Sox', primary: 'Red', secondary: 'Navy Blue', emblem: 'red B on cap', pinstripe: false },
  LAD: { name: 'Dodgers', primary: 'Dodger Blue', secondary: 'White', emblem: 'interlocking LA logo', pinstripe: false },
  ATL: { name: 'Braves', primary: 'Navy Blue', secondary: 'Red', emblem: 'script A logo', pinstripe: false },
  HOU: { name: 'Astros', primary: 'Navy Blue', secondary: 'Orange', emblem: 'star H logo', pinstripe: false },
  NYM: { name: 'Mets', primary: 'Royal Blue', secondary: 'Orange', emblem: 'NY Mets logo', pinstripe: true },
  PHI: { name: 'Phillies', primary: 'Red', secondary: 'White', emblem: 'P logo', pinstripe: true },
  SD:  { name: 'Padres', primary: 'Brown', secondary: 'Gold', emblem: 'SD logo', pinstripe: false },
  SF:  { name: 'Giants', primary: 'Orange', secondary: 'Black', emblem: 'SF logo', pinstripe: false },
  CHC: { name: 'Cubs', primary: 'Royal Blue', secondary: 'Red', emblem: 'C logo', pinstripe: true },
  STL: { name: 'Cardinals', primary: 'Red', secondary: 'Navy', emblem: 'STL birds on bat', pinstripe: false },
  MIL: { name: 'Brewers', primary: 'Navy Blue', secondary: 'Gold', emblem: 'M glove logo', pinstripe: false },
  CIN: { name: 'Reds', primary: 'Red', secondary: 'White', emblem: 'C logo', pinstripe: false },
  PIT: { name: 'Pirates', primary: 'Black', secondary: 'Gold', emblem: 'P logo', pinstripe: false },
  ARI: { name: 'Diamondbacks', primary: 'Sedona Red', secondary: 'Teal', emblem: 'A logo', pinstripe: false },
  COL: { name: 'Rockies', primary: 'Purple', secondary: 'Silver', emblem: 'CR logo', pinstripe: true },
  MIA: { name: 'Marlins', primary: 'Blue', secondary: 'Red', emblem: 'M marlin logo', pinstripe: false },
  WSH: { name: 'Nationals', primary: 'Red', secondary: 'Navy', emblem: 'curly W logo', pinstripe: false },
  TB:  { name: 'Rays', primary: 'Navy Blue', secondary: 'Light Blue', emblem: 'TB ray logo', pinstripe: false },
  BAL: { name: 'Orioles', primary: 'Orange', secondary: 'Black', emblem: 'cartoon bird O logo', pinstripe: false },
  CLE: { name: 'Guardians', primary: 'Navy', secondary: 'Red', emblem: 'C logo', pinstripe: false },
  DET: { name: 'Tigers', primary: 'Navy Blue', secondary: 'Orange', emblem: 'Old English D', pinstripe: false },
  KC:  { name: 'Royals', primary: 'Royal Blue', secondary: 'White', emblem: 'KC crown logo', pinstripe: false },
  MIN: { name: 'Twins', primary: 'Navy Blue', secondary: 'Red', emblem: 'TC logo', pinstripe: true },
  CWS: { name: 'White Sox', primary: 'Black', secondary: 'Silver', emblem: 'Sox logo', pinstripe: true },
  TEX: { name: 'Rangers', primary: 'Royal Blue', secondary: 'Red', emblem: 'T logo', pinstripe: false },
  LAA: { name: 'Angels', primary: 'Red', secondary: 'Navy Blue', emblem: 'halo A logo', pinstripe: false },
  SEA: { name: 'Mariners', primary: 'Navy Blue', secondary: 'Teal', emblem: 'S compass logo', pinstripe: false },
  OAK: { name: 'Athletics', primary: 'Green', secondary: 'Gold', emblem: 'A elephant logo', pinstripe: false },
  TOR: { name: 'Blue Jays', primary: 'Royal Blue', secondary: 'Red', emblem: 'blue jay bird logo', pinstripe: false },
  ATH: { name: 'Athletics', primary: 'Green', secondary: 'Gold', emblem: 'A logo', pinstripe: false },
};

const cache = {};

export default async function handler(req, res) {
  const { name, team } = req.query;
  if (!name || !team) {
    return res.status(400).json({ error: 'Missing name or team query params' });
  }

  const cacheKey = `${name.toLowerCase()}_${team.toUpperCase()}`;
  if (cache[cacheKey]) {
    return res.status(200).json({ url: cache[cacheKey], cached: true });
  }

  const teamData = TEAMS[team.toUpperCase()] || { name: team, primary: 'Gray', secondary: 'White', emblem: 'generic logo', pinstripe: false };

  const prompt = `A bold cartoon mascot-style baseball player avatar in a full mid-swing batting stance, bat fully extended, powerful follow-through. Wearing a ${teamData.name} uniform with ${teamData.primary} and ${teamData.secondary} colors, ${teamData.emblem} on cap and jersey. ${teamData.pinstripe ? 'White pinstripe uniform.' : 'Solid color uniform.'} Batting helmet, cleats. Clean dark background, flat vector illustration style, strong outlines, bright colors. No text, no watermarks, 1:1 square format.`;

  try {
    // Try image generation models in order of preference
    const imageModels = [
      'gemini-3.1-flash-image-preview',  // Nano Banana 2
      'gemini-2.5-flash-image',          // Nano Banana
      'gemini-3-pro-image-preview',      // Nano Banana Pro
    ];

    let imageUrl = null;
    let lastError = '';

    for (const model of imageModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_KEY}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
          })
        });

        if (!resp.ok) {
          lastError = `${model}: ${resp.status}`;
          continue;
        }

        const data = await resp.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find(p => p.inlineData);

        if (imgPart && imgPart.inlineData) {
          imageUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
          cache[cacheKey] = imageUrl;
          return res.status(200).json({ url: imageUrl, player: name, team: team, source: model });
        }
        lastError = `${model}: no image in response`;
      } catch (e) {
        lastError = `${model}: ${e.message}`;
      }
    }

    // Fallback: try Imagen 4
    try {
      const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${GOOGLE_KEY}`;
      const imgResp = await fetch(imgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' }
        })
      });
      if (imgResp.ok) {
        const imgData = await imgResp.json();
        const predictions = imgData.predictions || [];
        if (predictions.length && predictions[0].bytesBase64Encoded) {
          imageUrl = `data:image/png;base64,${predictions[0].bytesBase64Encoded}`;
          cache[cacheKey] = imageUrl;
          return res.status(200).json({ url: imageUrl, player: name, team: team, source: 'imagen-4' });
        }
      }
    } catch (e) { lastError += ` | imagen-4: ${e.message}`; }

    return res.status(200).json({ error: 'All models failed', detail: lastError });
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
