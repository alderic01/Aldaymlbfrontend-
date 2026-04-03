export default function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(200).json({
      status: 'NOT SET',
      message: 'ANTHROPIC_API_KEY environment variable is not configured in Vercel.',
      fix: 'Go to Vercel Dashboard > aldaymlbfrontend > Settings > Environment Variables > Add ANTHROPIC_API_KEY'
    });
  }
  // Mask the key for security
  const masked = key.substring(0, 7) + '...' + key.substring(key.length - 4);
  return res.status(200).json({
    status: 'SET',
    key: masked,
    length: key.length,
    startsWithSk: key.startsWith('sk-ant-'),
    message: 'API key is configured. If AI picks still fail, the key may be invalid or expired.'
  });
}
