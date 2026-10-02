import fs from 'fs';
import path from 'path';

const API_KEY = process.env.KENARI_API_KEY || 'kn-0022f14de6ba95aa10b8b71a37073ae06e59b538411fbd88';
const BASE_URL = process.env.KENARI_BASE_URL || 'https://kenari.id/v1';

const ASSETS = [
  {
    name: 'hero-mihrab-backdrop.png',
    size: '1536x1024',
    prompt: 'Grand Islamic architectural mihrab arch, modern sacred interior design, elegant deep sage olive green and warm ivory marble walls, intricate champagne gold filigree trims, soft romantic volumetric god-rays light streaming from above, clean luxurious atmosphere, no people, photorealistic, 8k resolution, cinematic lighting'
  },
  {
    name: 'floral-corner-sage.png',
    size: '1024x1024',
    prompt: 'Elegant bridal floral bouquet arrangement corner accent, lush white garden roses, ivory peonies, soft sage green eucalyptus leaves, delicate gold sprig branches, isolated on pure white background, high quality botanical illustration, wedding decor style'
  },
  {
    name: 'lantern-glow.png',
    size: '1024x1024',
    prompt: 'Hanging antique gold Moroccan fanous lantern with intricate filigree cutouts, warm golden candle flame glowing brightly inside, dangling from a slender gold chain, soft amber luminescence, isolated on dark background, photorealistic 3D render, luxury Islamic art'
  },
  {
    name: 'arabesque-pattern.png',
    size: '1024x1024',
    prompt: 'Seamless repeating Islamic geometric arabesque star pattern, delicate thin champagne gold lines on subtle warm ivory parchment paper texture, minimalist, sacred luxury, elegant background wallpaper'
  },
  {
    name: 'taaruf-rings-symbol.png',
    size: '1024x1024',
    prompt: 'Two entwined gold wedding rings sitting on luxurious sage green satin ribbon with delicate white jasmine blossoms and olive sprigs, soft bokeh background, warm heavenly glow, symbolic of halal love and sacred marriage, elegant 3D render'
  }
];

async function generateOne(item) {
  const outputPath = path.join(process.cwd(), 'public', 'img', item.name);
  console.log(`\n[Generating] ${item.name} (${item.size})...`);
  
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
  if (!data) throw new Error('No data in response');

  if (data.b64_json) {
    fs.writeFileSync(outputPath, Buffer.from(data.b64_json, 'base64'));
  } else if (data.url?.startsWith('data:image/')) {
    const b64 = data.url.split(',')[1];
    fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
  } else if (data.url) {
    const res = await fetch(data.url);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outputPath, buf);
  } else {
    throw new Error('Unrecognized image format');
  }

  const stat = fs.statSync(outputPath);
  console.log(`[Success] Saved ${item.name} (${(stat.size / 1024).toFixed(1)} KB)`);
}

async function main() {
  for (const asset of ASSETS) {
    try {
      await generateOne(asset);
    } catch (e) {
      console.error(`[Error] Failed ${asset.name}:`, e.message);
    }
  }
  console.log('\n[Done] All asset generations completed!');
}

main();
