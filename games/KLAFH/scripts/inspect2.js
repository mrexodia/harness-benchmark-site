const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("http://127.0.0.1:8000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  async function composite(tag, step = 8) {
    const map = await page.evaluate((step) => {
      const a = document.getElementById("scene");
      const b = document.getElementById("ui");
      const t = document.createElement("canvas"); t.width = 1280; t.height = 720;
      const g = t.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.drawImage(a, 0, 0, 1280, 720);
      g.drawImage(b, 0, 0);
      const d = g.getImageData(0, 0, 1280, 720).data;
      let out = "";
      for (let y = 0; y < 720; y += step) {
        let line = "";
        for (let x = 0; x < 1280; x += step) {
          const i = (y * 1280 + x) * 4, r = d[i], gg = d[i + 1], bl = d[i + 2];
          const lum = 0.299 * r + 0.587 * gg + 0.114 * bl;
          const blue = bl - r;
          let ch;
          if (lum < 45) ch = " ";
          else if (lum < 85) ch = ".";
          else if (blue > 25) ch = "~";
          else if (lum < 130) ch = ":";
          else if (lum < 175) ch = "+";
          else ch = "#";
          line += ch;
        }
        out += line + "\n";
      }
      return out;
    }, step);
    console.log("==== COMPOSITE " + tag + " ====");
    console.log(map);
  }

  await composite("ready");
  await page.keyboard.press("Space");
  await page.waitForTimeout(1000);
  await composite("waiting");
  let st = "waiting";
  for (let i = 0; i < 80 && st !== "bite"; i++) { await page.waitForTimeout(120); st = await page.evaluate(() => window.fishing.state); }
  await page.waitForTimeout(120);
  await composite("bite");
  await page.keyboard.press("Space");
  await page.waitForTimeout(1700);
  await composite("reveal");
  await browser.close();
})();
