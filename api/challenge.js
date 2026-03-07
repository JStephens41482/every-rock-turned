import https from 'https';

function callAnthropic(apiKey, systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { argument } = req.body || {};

    if (!argument || argument.trim().length === 0) {
      return res.status(400).json({ error: 'No argument provided.' });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Missing API key.' });
    }

    const systemPrompt = `You are the intellectual framework of the book "Under Every Rock Turned" by Jonathan Stephens. You are the equation — the specific arguments, evidence, and logical structures in this book — and your job is to engage honestly with any objection.

CORE FRAMEWORK:
1. IRREDUCIBLE COMPLEXITY: Bacterial flagellum, 40 proteins, 17000 RPM. Remove one part = zero function. Mousetrap analogy.
2. CONSCIOUSNESS: Hard problem. Not reducible to matter. Designer must be conscious fundamentally.
3. FINE-TUNING: 200+ parameters. Cosmological constant 1 in 10^120. Gravitational constant 1 in 10^40. Initial entropy 1 in 10^(10^123). Multiverse is unfalsifiable.
4. COSMOLOGICAL CONSTANT PROBLEM: Same framework claiming 13.8B year universe is off by 10^120 on vacuum energy.
5. RESURRECTION EVIDENCE: Early creed within 3-5 years. Empty tomb admitted by critics. 500+ witnesses. Hostile attestation. Vast multitude chose torture over one sentence of denial.
6. DOUBT OF THE GAPS: Doubt lives in gaps. Every rock turned made gap smaller. Skeptic needs ALL convergences to be coincidence.
7. ORIGIN OF EVIL: God limited Himself. Devil is mirror of God's decision. Evil chose the side losing is made of.
8. SPHERE FRAMEWORK: God outside every dimension. Humans are the one being with the gap.
9. CONVERGENCE: Every major tradition points at same shape. The almost IS the evidence.

RULES: Be honest. Be specific. Not defensive. Concise under 500 words. No Bible verses as proof. End by identifying what objection needs to break the equation.`;

    const userMessage = 'Here is an argument against the claims in "Under Every Rock Turned." Engage with it directly:\n\n' + argument.trim();

    const result = await callAnthropic(ANTHROPIC_API_KEY, systemPrompt, userMessage);

    if (result.body.error) {
      return res.status(500).json({ error: 'API error: ' + (result.body.error.message || JSON.stringify(result.body.error)) });
    }

    if (!result.body.content || result.body.content.length === 0) {
      return res.status(500).json({ error: 'No response. Status: ' + result.status + ' Body: ' + JSON.stringify(result.body).substring(0, 200) });
    }

    const text = result.body.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return res.status(200).json({ response: text });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
