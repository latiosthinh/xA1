import fs from "fs";
import path from "path";
import sharp from "sharp";

const outputDir = path.resolve(process.cwd(), "public/icons/emoji-pack");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
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

async function downloadAndResize() {
  console.log("Generating 100x100 transparent PNG icons for Telegram Custom Emoji Pack...");

  for (const [name, slug] of Object.entries(iconifyIcons)) {
    const url = `https://api.iconify.design/${slug}.svg`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Failed to fetch ${slug} (${res.status})`);
        continue;
      }
      const svgText = await res.text();
      const outputPath = path.join(outputDir, `${name}.png`);

      await sharp(Buffer.from(svgText))
        .resize(100, 100, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Saved ${name}.png`);
    } catch (err) {
      console.error(`Error processing ${name}:`, err.message);
    }
  }

  for (const [name, url] of Object.entries(customUrls)) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "MMOStoreBot/1.0 (https://github.com/latiosthinh/xA1; bot@store.com)",
        },
      });
      if (!res.ok) {
        console.warn(`Failed custom ${name} (${res.status})`);
        continue;
      }
      const svgText = await res.text();
      const outputPath = path.join(outputDir, `${name}.png`);

      await sharp(Buffer.from(svgText))
        .resize(100, 100, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Saved ${name}.png (custom source)`);
    } catch (err) {
      console.error(`Error processing custom ${name}:`, err.message);
    }
  }

  console.log(`\n🎉 All icons ready in folder: ${outputDir}`);
}

downloadAndResize();
