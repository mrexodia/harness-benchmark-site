// Reusable Playwright harness for Tideline.
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:8000/';

async function launch() {
  const browser = await chromium.launch({ args: ['--force-device-scale-factor=1'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  return { browser, page, errors };
}

module.exports = { launch, URL };
