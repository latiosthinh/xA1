import fs from "fs";
import path from "path";
import sharp from "sharp";

const emojiDir = path.resolve(process.cwd(), "public/icons/emoji-pack");
const sticker512Dir = path.resolve(process.cwd(), "public/icons/stickers-512");

for (const dir of [emojiDir, sticker512Dir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const iconifyIcons = {
  claude: "logos:claude-icon",
  cursor: "simple-icons:cursor",
  chatgpt: "logos:openai-icon",
  coursera: "simple-icons:coursera",
  youtube: "logos:youtube-icon",
  netflix: "logos:netflix-icon",
  spotify: "logos:spotify-icon",
  canva: "simple-icons:canva",
  adobe: "logos:adobe-icon",
  discord: "logos:discord-icon",
  telegram: "logos:telegram",
  duolingo: "simple-icons:duolingo",
  notion: "logos:notion-icon",
  github: "logos:github-icon",
  microsoft365: "logos:microsoft-icon",
  midjourney: "logos:midjourney",
  nordvpn: "simple-icons:nordvpn",
  zoom: "logos:zoom-icon",
  figma: "logos:figma",
  tiktok: "logos:tiktok-icon",
  apple: "logos:apple",
  gmail: "logos:google-gmail",
  deepseek: "simple-icons:deepseek",
  elevenlabs: "simple-icons:elevenlabs",
  replit: "logos:replit-icon",
  huggingface: "logos:hugging-face-icon",
  tradingview: "simple-icons:tradingview",
  facebook: "logos:facebook",
};

const customSvgs = {
  // Capcut symbol only: first path up to Z, bounding box ~0 0 31.056 24
  capcut: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24">
    <path d="M 31.056 4.979 V 0.215 l -5.73 3.008 v -0.178 C 25.326 1.146 23.965 0 21.994 0 H 3.831 C 1.755 0 0.5 1.146 0.5 3.045 v 4.8 L 8.523 12 L 0.5 16.191 v 4.8 C 0.5 22.854 1.755 24 3.831 24 h 18.162 c 1.97 0 3.33 -1.146 3.33 -3.009 v -0.25 l 5.731 3.044 V 18.95 L 17.73 12 l 13.327 -7.021 Z M 13.11 14.363 l 9.852 5.16 H 3.22 l 9.888 -5.16 Z m 9.78 -9.885 L 13.109 9.6 L 3.222 4.478 h 19.666 Z" fill="#000000"/>
  </svg>`,
  gemini: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 73 73">
    <defs>
      <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1ba1e3"/>
        <stop offset="50%" stop-color="#5460e6"/>
        <stop offset="100%" stop-color="#9b72cb"/>
      </linearGradient>
    </defs>
    <path fill="url(#geminiGrad)" d="M36.38 72.76c-2.846-18.788-17.592-33.533-36.38-36.38c18.788-2.847 33.534-17.593 36.38-36.38c2.847 18.787 17.593 33.533 36.38 36.38c-18.787 2.847-33.533 17.592-36.38 36.38"/>
  </svg>`,
};

async function generate() {
  console.log("Generating 100x100 and 512x512 PNGs...");

  for (const [name, slug] of Object.entries(iconifyIcons)) {
    const url = `https://api.iconify.design/${slug}.svg`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const svgText = await res.text();
      const buf = Buffer.from(svgText);

      // 100x100
      await sharp(buf)
        .resize(100, 100, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(emojiDir, `${name}.png`));

      // 512x512
      await sharp(buf)
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(sticker512Dir, `${name}.png`));

      console.log(`✓ Generated ${name} (100px & 512px)`);
    } catch (err) {
      console.error(`Error ${name}:`, err.message);
    }
  }

  for (const [name, svgText] of Object.entries(customSvgs)) {
    try {
      const buf = Buffer.from(svgText);

      await sharp(buf)
        .resize(100, 100, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(emojiDir, `${name}.png`));

      await sharp(buf)
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(sticker512Dir, `${name}.png`));

      console.log(`✓ Generated custom ${name} (100px & 512px)`);
    } catch (err) {
      console.error(`Error custom ${name}:`, err.message);
    }
  }

  console.log("Done.");
}

generate();
