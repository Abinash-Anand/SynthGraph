// Captures the dashboard screenshots used on the website, from a real build.
//
// 1. Start a local backend and a production build of this frontend (npm run build, npx next start -p 3003).
// 2. Run seed-demo.py against the backend with a throwaway account, and note the ids it prints.
// 3. In an empty folder outside the repo: npm init -y && npm install playwright-core
//    (it drives the Microsoft Edge that is already installed, so no browser is downloaded).
// 4. From that folder:
//      SYNTHGRAPH_API_KEY=... PROJECT=<vision project id> EXPERIMENT=<its experiment id> \
//      OUT=./png node /path/to/capture-screens.mjs
// 5. Convert to WebP and put the files in public/screens (see README.md).
//
// The key goes into a session cookie for localhost only. Use the throwaway account's key.

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const key = process.env.SYNTHGRAPH_API_KEY;
const PROJECT = process.env.PROJECT;
const EXPERIMENT = process.env.EXPERIMENT;
const BASE = process.env.BASE ?? "http://localhost:3003";
const OUT = process.env.OUT ?? "./png";
if (!key || !PROJECT || !EXPERIMENT) throw new Error("set SYNTHGRAPH_API_KEY, PROJECT and EXPERIMENT");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
await context.addCookies([
  {
    name: "sg_session",
    value: encodeURIComponent(JSON.stringify({ apiKeyId: "demo", apiKey: key })),
    domain: new URL(BASE).hostname,
    path: "/",
  },
]);
const page = await context.newPage();
const workspace = `${BASE}/dashboard/projects/${PROJECT}/experiments/${EXPERIMENT}`;

async function shot(name, url, prepare) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  // The onboarding tour opens on first sight of a screen; dismiss it before the picture.
  const skip = page.getByRole("button", { name: "Skip tour" });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(500);
  }
  if (prepare) await prepare();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("captured", name);
}

await shot("workspace-overview", `${workspace}?tab=overview`);
await shot("workspace-runs", `${workspace}?tab=runs`);
await shot("workspace-lineage", `${workspace}?tab=lineage`, () => page.waitForTimeout(2500));
await shot("workspace-metrics", `${workspace}?tab=metrics`, () => page.waitForTimeout(2500));
await shot("workspace-reproduction", `${workspace}?tab=reproduction`);
await shot("leaderboard", `${BASE}/dashboard/reports/efficiency-leaderboard?projectId=${PROJECT}`, async () => {
  const selects = page.locator("select");
  const count = await selects.count();
  for (let i = 0; i < count; i++) {
    const options = await selects.nth(i).locator("option").allTextContents();
    if (options.includes("mAP50")) await selects.nth(i).selectOption("mAP50");
  }
  await page.waitForTimeout(800);
  for (let i = 0; i < count; i++) {
    const options = await selects.nth(i).locator("option").allTextContents();
    const heavy = options.find((o) => o.startsWith("test_heavy_rain"));
    if (heavy) await selects.nth(i).selectOption({ label: heavy });
  }
  await page.waitForTimeout(2000);
});
await shot("capture-completeness", `${BASE}/dashboard/reports/capture-completeness?projectId=${PROJECT}`);
await browser.close();
