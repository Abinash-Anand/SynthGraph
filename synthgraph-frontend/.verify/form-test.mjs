import { chromium } from "playwright";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome-stable" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto("http://localhost:3111/demo", { waitUntil: "networkidle" });

// 1. Submitting empty should surface accessible validation, not a request.
await page.click('button[type="submit"]');
await page.waitForTimeout(600);
const alerts = await page.locator('[role="alert"]').count();
const invalid = await page.locator('[aria-invalid="true"]').count();
console.log(`empty submit -> alerts=${alerts} aria-invalid=${invalid}`);
await page.screenshot({ path: `${out}/f-validation.png` });

// 2. Fill it in properly.
const fill = async (label, value) => {
  await page.getByLabel(label, { exact: true }).fill(value);
};
await fill("Name", "A. Researcher");
await fill("Work email", "a.researcher@example.edu");
await fill("Institution or company", "Example University");
await page.getByLabel("Research area", { exact: true }).fill("object detection in adverse weather");
await page.getByLabel("Team size", { exact: true }).selectOption("6–15");
await page.getByText("Blender", { exact: true }).click();
await page.getByText("Custom Python", { exact: true }).click();
await fill("Current tools", "Blender 4.2, PyTorch, W&B, Git");
await page.getByLabel("What would you like to reproduce or track?", { exact: true })
  .fill("The rain sweep from last autumn, including which asset versions were used.");
await page.getByLabel("Message", { exact: true })
  .fill("We run nightly Blender sweeps and lose track of which seed produced which dataset.");
await page.getByLabel(/^Generator/).fill("Blender 4.2");

const active = await page.evaluate(() =>
  [...document.querySelectorAll("li")].filter((l) => l.className.includes("text-cyan")).map((l) => l.textContent));
console.log("lit graph nodes:", active.join(", "));
await page.screenshot({ path: `${out}/f-filled.png` });

const [response] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/demo")),
  page.click('button[type="submit"]'),
]);
console.log("POST /api/demo ->", response.status(), await response.text());
await page.waitForTimeout(2500);
const heading = await page.locator("h2").first().textContent();
console.log("success heading:", heading?.trim());
await page.screenshot({ path: `${out}/f-success.png` });
console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "no console errors");
await browser.close();
