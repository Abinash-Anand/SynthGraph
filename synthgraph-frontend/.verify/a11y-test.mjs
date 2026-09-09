import { chromium } from "playwright";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome-stable" });

// --- reduced motion ---
const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await rm.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://localhost:3111/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/rm-hero.png` });
await page.evaluate(() => window.scrollTo(0, 3400));
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/rm-assembly.png` });
console.log("reduced-motion errors:", errs.length ? errs.join("\n") : "none");
await rm.close();

// --- keyboard / skip link ---
const kb = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await kb.newPage();
await p2.goto("http://localhost:3111/", { waitUntil: "networkidle" });
await p2.keyboard.press("Tab");
const first = await p2.evaluate(() => {
  const a = document.activeElement;
  const r = a?.getBoundingClientRect();
  return `${a?.tagName} "${a?.textContent?.trim()}" visible=${r && r.width > 0 && r.top >= 0}`;
});
console.log("first tab stop:", first);
await p2.screenshot({ path: `${out}/kb-skip.png` });

const stops = [];
for (let i = 0; i < 9; i++) {
  await p2.keyboard.press("Tab");
  stops.push(await p2.evaluate(() => `${document.activeElement?.tagName}:${document.activeElement?.textContent?.trim().slice(0,26)}`));
}
console.log("tab order:", stops.join(" | "));

// Headings outline
const headings = await p2.evaluate(() =>
  [...document.querySelectorAll("h1,h2,h3")].slice(0, 14).map((h) => `${h.tagName} ${h.textContent?.trim().slice(0, 40)}`));
console.log("headings:\n  " + headings.join("\n  "));

// Canvas labelling
const canvases = await p2.evaluate(() =>
  [...document.querySelectorAll("canvas")].map((c) => ({
    role: c.getAttribute("role"),
    label: (c.getAttribute("aria-label") || "").slice(0, 48),
  })));
console.log("canvases:", JSON.stringify(canvases));
await browser.close();
