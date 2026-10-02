import fs from 'fs';
import path from 'path';

const API_KEY = process.env.KENARI_API_KEY || 'kn-0022f14de6ba95aa10b8b71a37073ae06e59b538411fbd88';
const BASE_URL = process.env.KENARI_BASE_URL || 'https://kenari.id/v1';

async function run() {
  const item = {
    name: 'taaruf-journey-scene.png',
    size: '1536x1024',
    prompt: 'Cinematic wide artistic scene of a tranquil Islamic bridal pavilion with soft morning sunlight streaming through graceful arched stone colonnades, white jasmine and cream roses blooming softly, gentle sage green drapery, warm champagne gold accents, subtle bokeh, peaceful serene atmosphere, elegant and sacred, photorealistic, 8k resolution'
  };

  const outputPath = path.join(process.cwd(), 'public', 'img', item.name);
  console.log(`Generating ${item.name}...`);

  const response = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: item.prompt,
      size: item.size,
      n: 1
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error (${response.status}): ${err}`);
  }

  const result = await response.json();
  const data = result.data?.[0];
  if (!data) throw new Error('No data');

  let buffer;
  if (data.b64_json) {
    buffer = Buffer.from(data.b64_json, 'base64');
  } else if (data.url) {
    const imgRes = await fetch(data.url);
    buffer = Buffer.from(await imgRes.arrayBuffer());
  }

  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved to ${outputPath} (${buffer.length} bytes)`);
}

run().catch(console.error);
