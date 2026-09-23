import sharp from "sharp";
import { mkdir, writeFile, copyFile, access } from "node:fs/promises";
await mkdir("public/images", { recursive: true });
const restaurants = [
  "north",
  "pin",
  "jiang",
  "buffet",
  "famiglia",
  "antonio",
  "wong",
];
await mkdir("public/images/restaurants", { recursive: true });
for (const name of restaurants)
  await sharp(`assets/source/restaurants/${name}.jpg`)
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(`public/images/restaurants/${name}.webp`);
for (const name of ["venetian", "senado"])
  await sharp(`assets/source/${name}.jpg`)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(`public/images/${name}.webp`);
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="#214e43"/><rect x="24" y="24" width="144" height="144" rx="3" fill="none" stroke="#dfd4b7" stroke-width="3"/><g fill="#dfd4b7"><ellipse cx="96" cy="96" rx="20" ry="58"/><ellipse cx="96" cy="96" rx="20" ry="58" transform="rotate(45 96 96)"/><ellipse cx="96" cy="96" rx="20" ry="58" transform="rotate(90 96 96)"/><ellipse cx="96" cy="96" rx="20" ry="58" transform="rotate(135 96 96)"/></g><circle cx="96" cy="96" r="13" fill="#214e43"/></svg>`;
await writeFile("public/favicon.svg", favicon);
await sharp(Buffer.from(favicon))
  .resize(180, 180)
  .png()
  .toFile("public/apple-touch-icon.png");
await sharp(Buffer.from(favicon))
  .resize(192, 192)
  .png()
  .toFile("public/icon-192.png");
await sharp(Buffer.from(favicon))
  .resize(512, 512)
  .png()
  .toFile("public/icon-512.png");
await writeFile(
  "public/manifest.webmanifest",
  JSON.stringify({
    name: "우리의 마카오 · 가족여행",
    short_name: "우리의 마카오",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7f2",
    theme_color: "#214e43",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }),
);
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f4f2e8"/><rect x="30" y="30" width="1140" height="570" rx="5" fill="none" stroke="#b8c1a8"/><path d="M800 630V240a170 170 0 0 1 340 0v390" fill="#214e43"/><g fill="none" stroke="#bbcca5" opacity=".28"><circle cx="970" cy="340" r="120"/><circle cx="970" cy="340" r="86"/><path d="M810 420h330M810 480h330M810 540h330M880 200v400M940 150v450M1000 150v450M1060 200v400"/></g><text x="85" y="120" font-family="sans-serif" font-size="18" letter-spacing="5" fill="#718267">OUR MACAO JOURNAL</text><text x="80" y="262" font-family="Malgun Gothic,Noto Sans CJK KR,sans-serif" font-size="65" font-weight="bold" fill="#214e43">마카오 가족여행</text><text x="85" y="340" font-family="Malgun Gothic,Noto Sans CJK KR,sans-serif" font-size="30" fill="#728466">함께라서 더 특별한 네 번의 하루</text><text x="85" y="482" font-family="sans-serif" font-size="37" fill="#214e43">2026.10.12–10.15</text><text x="85" y="550" font-family="sans-serif" font-size="14" letter-spacing="4" fill="#9a9e89">SLOW DAYS. WARM MEMORIES.</text><text x="878" y="355" font-family="Georgia,serif" font-size="63" font-style="italic" fill="#e4d7af">Macao</text><text x="894" y="394" font-family="sans-serif" font-size="14" letter-spacing="4" fill="#e4d7af">WITH FAMILY</text></svg>`;
// Commit the verified Korean PNG. Linux hosts may lack Korean fonts; preserve it.
let hasOg = true;
try {
  await access("public/og.png");
} catch {
  hasOg = false;
}
if (!hasOg || process.argv.includes("--regenerate-og"))
  await sharp(Buffer.from(og)).png().toFile("public/og.png");
await writeFile(
  "public/robots.txt",
  "User-agent: *\nDisallow: /api/\nDisallow: /uploads/\n",
);
// Vite copies public before this postbuild step; synchronize generated assets.
await mkdir("dist/images", { recursive: true });
await mkdir("dist/images/restaurants", { recursive: true });
for (const name of restaurants)
  await copyFile(
    `public/images/restaurants/${name}.webp`,
    `dist/images/restaurants/${name}.webp`,
  );
for (const name of ["venetian", "senado"])
  await copyFile(`public/images/${name}.webp`, `dist/images/${name}.webp`);
for (const file of [
  "favicon.svg",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "manifest.webmanifest",
  "og.png",
  "robots.txt",
])
  await copyFile(`public/${file}`, `dist/${file}`);
console.log("Optimized photographs, social preview and app icons ready.");
