module.exports = async (req, res) => {
  try {
    const r = await fetch("https://newest-mlb-1.onrender.com/api/auth/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "aldaye2015@gmail.com" })
    });
    const d = await r.json();
    res.status(200).json(d);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
