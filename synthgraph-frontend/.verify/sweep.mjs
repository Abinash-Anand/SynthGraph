import { chromium } from "playwright";

const routes = ["/", "/product", "/how-it-works", "/research", "/developers", "/security", "/about", "/demo", "/nope-404"];
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome-stable" });

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width > 800 ? 900 : 844 } });
  for (const route of routes) {
    const msgs = [];
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    page.on("console", (m) => { if (m.type() === "error") msgs.push(`[console] ${m.text()}`); });
    page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));
    const res = await page.goto(`http://localhost:3111${route}`, { waitUntil: "networkidle", timeout: 60000 });
    // Walk the page so lazy scenes mount.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    console.log(`${width} ${route} -> ${res?.status()} ${overflow ? "H-OVERFLOW" : ""} ${msgs.length ? "\n    " + msgs.slice(0,6).join("\n    ") : ""}`);
  }
  await page.close();
}
await browser.close();
