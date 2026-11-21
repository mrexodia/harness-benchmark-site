const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("http://127.0.0.1:8000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  async function dump(x0, y0, x1, y1, tag) {
    const map = await page.evaluate(({ x0, y0, x1, y1 }) => {
      const P = {
        s: ["#e6b184","#c68c5e"], h: ["#d9b96b","#b3934b","#ecd58f"],
        o: ["#3d6f9e","#2a5178"], S: ["#c85c4a","#9c4136","#e07a63"],
        k: ["#463526","#5a3b22","#17232b","#20242c","#141820"],
        w: ["#6b4a2a","#8c6538","#4f331d","#7d5230","#96653c","#b07f4e"],
        r: ["#e0503f","#a8322a","#f4f2e6"], e: ["#9fb4a5","#6ec06a","#57a9e8","#b06ae0","#4fd7c6"],
        G: ["#2c5a29","#3d7c33","#4c8f3b","#63aa46","#86c75a","#245021","#35722c","#458a38","#5fa844","#7cc356"],
        D: ["#c2934f","#dcb877","#efd8a3","#f7ebc9"],
      };
      const cc = {}; for (const k in P) cc[k] = P[k].map(h => { const n = parseInt(h.slice(1), 16); return [(n>>16)&255,(n>>8)&255,n&255]; });
      const c = document.getElementById("scene");
      const g = c.getContext("2d");
      const d = g.getImageData(0, 0, 320, 180).data;
      let out = "";
      for (let y = y0; y < y1; y++) {
        let line = "";
        for (let x = x0; x < x1; x++) {
          const i = (y*320+x)*4, r=d[i], gg=d[i+1], b=d[i+2];
          let best=".", bd=1e9;
          for (const k in cc) for (const [rr,gg2,bb] of cc[k]) { const dd=(rr-r)**2+(gg2-gg)**2+(bb-b)**2; if(dd<bd){bd=dd;best=k;} }
          if (bd > 2600 && r>90 && b>120 && gg>120 && b>=r) best = "~"; // waterish
          line += best;
        }
        out += line + "\n";
      }
      return out;
    }, { x0, y0, x1, y1 });
    console.log("==== " + tag + " (" + x0 + "," + y0 + ")-(" + x1 + "," + y1 + ") ====");
    console.log(map);
  }

  await dump(98, 44, 152, 84, "angler+rod+dock");
  await dump(20, 140, 70, 175, "rowboat");
  await dump(150, 30, 210, 70, "shore/reeds");
  await dump(190, 90, 235, 120, "bobber target");

  await browser.close();
})();
