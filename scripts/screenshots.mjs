import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
const browser = await chromium.launch();
const code = (await readFile("storage/local-access-code.txt", "utf8")).trim();
await mkdir("doc/screenshots", { recursive: true });
for (const [name, width, height] of [
  ["desktop", 1440, 1050],
  ["mobile", 390, 844],
  ["tablet-portrait", 820, 1180],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5174/");
  await page.locator("#code").waitFor();
  await page.screenshot({ path: `doc/screenshots/${name}-welcome.png` });
  await page.locator("#code").fill(code);
  await page.getByRole("button", { name: "여행 시작하기" }).click();
  await page.getByRole("button", { name: /최태준.*A팀/ }).waitFor();
  await page.screenshot({ path: `doc/screenshots/${name}-travelers.png` });
  await page.getByRole("button", { name: /최태준.*A팀/ }).click();
  await page.locator(".hero").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".hero img").evaluate((img) => img.decode());
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
  await page.screenshot({ path: `doc/screenshots/${name}-dashboard.png` });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  console.log(name, { overflow });
  await context.close();
}
await browser.close();
