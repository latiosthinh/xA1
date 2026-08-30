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
  gemini: "logos:google-gemini",
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

const customUrls = {
  capcut: "https://upload.wikimedia.org/wikipedia/en/a/a0/Capcut-logo.svg",
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

  for (const [name, url] of Object.entries(customUrls)) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "MMOStoreBot/1.0 (https://github.com/latiosthinh/xA1; bot@store.com)",
        },
      });
      if (!res.ok) continue;
      const svgText = await res.text();
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
