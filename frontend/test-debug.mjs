import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  
  // Capture console.log from the page
  const page = await context.newPage();
  page.on('console', msg => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[browser ERROR] ${err.message}`));
  
  // Intercept network requests
  const requests = [];
  page.on('response', async resp => {
    if (resp.url().includes('/api/')) {
      let body = '';
      try { body = await resp.text(); } catch(_) {}
      const preview = body.length > 200 ? body.slice(0,200)+'...' : body;
      console.log(`[network] ${resp.status()} ${resp.url()} → ${preview}`);
      requests.push({ url: resp.url(), status: resp.status(), body });
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  
  console.log('\n=== Attempting FRUZAQLA login ===');
  await page.fill('input[type="email"]', 'admin@fruzaqla.com');
  await page.fill('input[type="password"]', 'demo1234');
  await page.click('button[type="submit"]');
  
  // Wait a bit and capture what happens
  await page.waitForTimeout(5000);
  console.log(`\nURL after 5s: ${page.url()}`);
  
  // Check localStorage
  const token = await page.evaluate(() => localStorage.getItem('pharma_token'));
  console.log(`localStorage.pharma_token: ${token ? token.slice(0,30)+'...' : 'NULL'}`);
  
  // Check for error messages on page
  const errorText = await page.$eval('.bg-red-50', el => el.textContent).catch(() => null);
  console.log(`Error message on page: ${errorText || 'none'}`);
  
  await browser.close();
}

run().catch(e => console.error('Fatal:', e));
