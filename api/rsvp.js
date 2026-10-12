const configured = () => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(process.env.RSVP_SCRIPT_URL || '') && !!process.env.RSVP_SCRIPT_SECRET;

export function validateRsvp(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Please complete the RSVP form.');
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (name.length < 2 || name.length > 100) throw new Error('Please enter your name (2–100 characters).');
  if (!['yes', 'no'].includes(body.attendance)) throw new Error('Please choose whether you can attend.');
  if (message.length > 1000) throw new Error('Please keep your message under 1,000 characters.');
  if (typeof body.submissionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.submissionId)) throw new Error('Please refresh and try again.');
  return { name, attendance: body.attendance, message, submissionId: body.submissionId };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ configured: configured() });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (!configured()) return res.status(503).json({ error: 'RSVP is not available yet. Please try again later.' });
  const origin = req.headers.origin;
  if (origin && origin !== 'https://gerald-and-girlie.vercel.app' && origin !== `https://${process.env.VERCEL_URL}`) return res.status(403).json({ error: 'Please submit from the invitation website.' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({ error: 'Please submit using the RSVP form.' });
  let record;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (body?.website) return res.status(400).json({ error: 'Please try again.' });
    record = validateRsvp(body);
  } catch (error) { return res.status(400).json({ error: error instanceof SyntaxError ? 'Please refresh and try again.' : error.message }); }
  try {
    const response = await fetch(process.env.RSVP_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...record, secret: process.env.RSVP_SCRIPT_SECRET }),
      signal: AbortSignal.timeout(12000),
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error('Sheet did not confirm the save');
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'We could not confirm your RSVP. Please try again; retries will not duplicate your response.' });
  }
}
