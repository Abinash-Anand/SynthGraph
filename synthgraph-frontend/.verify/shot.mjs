import { chromium } from "playwright";

const [, , url, out, widthArg, scrollArg] = process.argv;
const width = Number(widthArg ?? 1440);
const scroll = Number(scrollArg ?? 0);

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width, height: width > 800 ? 900 : 844 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
if (scroll) {
  await page.evaluate((y) => window.scrollTo(0, y), scroll);
  await page.waitForTimeout(2500);
} else {
  await page.waitForTimeout(3500);
}
await page.screenshot({ path: out });
console.log(errors.length ? errors.slice(0, 25).join("\n") : "no console errors");
await browser.close();
