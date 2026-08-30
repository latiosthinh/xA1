// Brand icon mapping for products based on name keywords
// Uses downloaded emoji-pack icons from public/icons/emoji-pack/

export function getProductIconUrl(name: string, customImageUrl?: string | null): string | null {
  if (customImageUrl && customImageUrl.trim() !== "") {
    return customImageUrl;
  }

  const lower = (name || "").toLowerCase();

  const map: Array<[string[], string]> = [
    // Video & creative
    [["capcut"], "/icons/emoji-pack/capcut.png"],
    [["canva"], "/icons/emoji-pack/canva.png"],
    [["figma"], "/icons/emoji-pack/figma.png"],
    [["adobe", "photoshop", "illustrator", "premiere"], "/icons/emoji-pack/adobe.png"],
    [["youtube"], "/icons/emoji-pack/youtube.png"],
    [["netflix"], "/icons/emoji-pack/netflix.png"],
    [["spotify"], "/icons/emoji-pack/spotify.png"],
    [["tiktok"], "/icons/emoji-pack/tiktok.png"],

    // AI & Dev
    [["gemini", "google-gemini"], "/icons/emoji-pack/gemini.png"],
    [["chatgpt", "openai", "gpt"], "/icons/emoji-pack/chatgpt.png"],
    [["claude", "anthropic"], "/icons/emoji-pack/claude.png"],
    [["cursor"], "/icons/emoji-pack/cursor.png"],
    [["deepseek"], "/icons/emoji-pack/deepseek.png"],
    [["midjourney"], "/icons/emoji-pack/midjourney.png"],
    [["elevenlabs"], "/icons/emoji-pack/elevenlabs.png"],
    [["huggingface", "hugging face"], "/icons/emoji-pack/huggingface.png"],
    [["replit"], "/icons/emoji-pack/replit.png"],
    [["github"], "/icons/emoji-pack/github.png"],

    // Education & Productivity
    [["coursera"], "/icons/emoji-pack/coursera.png"],
    [["duolingo"], "/icons/emoji-pack/duolingo.png"],
    [["notion"], "/icons/emoji-pack/notion.png"],
    [["microsoft", "office", "365"], "/icons/emoji-pack/microsoft365.png"],
    [["gmail", "google"], "/icons/emoji-pack/gmail.png"],
    [["apple"], "/icons/emoji-pack/apple.png"],
    [["zoom"], "/icons/emoji-pack/zoom.png"],

    // Security & Trading & Social
    [["nordvpn", "vpn"], "/icons/emoji-pack/nordvpn.png"],
    [["tradingview", "trading"], "/icons/emoji-pack/tradingview.png"],
    [["telegram"], "/icons/emoji-pack/telegram.png"],
    [["discord"], "/icons/emoji-pack/discord.png"],
    [["facebook"], "/icons/emoji-pack/facebook.png"],
  ];

  for (const [keywords, iconPath] of map) {
    if (keywords.some((k) => lower.includes(k))) {
      return iconPath;
    }
  }

  return null;
}
