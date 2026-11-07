const { chromium } = require("@playwright/test");

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node scripts/capture-og-image.js <url-to-a-real-viewer-page>");
    process.exit(1);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "body { filter: blur(3px); }" });
  await page.screenshot({
    path: "client/public/og-image.jpg",
    type: "jpeg",
    quality: 82,
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  await browser.close();
  console.log("Saved client/public/og-image.jpg");
}

main();
