import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome-stable" });
for (const width of [1440, 768, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const bad = [];
  page.on("console", (m) => { if (/hydrat|did not match/i.test(m.text())) bad.push(m.text()); });
  page.on("pageerror", (e) => { if (/hydrat/i.test(e.message)) bad.push(e.message); });
  for (const r of ["/", "/demo", "/how-it-works", "/product", "/security", "/about", "/research", "/developers"]) {
    await page.goto(`http://localhost:3111${r}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
  }
  console.log(`${width}: ${bad.length ? bad.join("\n") : "no hydration warnings"}`);
  await page.close();
}
await browser.close();
