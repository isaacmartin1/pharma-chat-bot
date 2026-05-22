import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

const apiCalls = [];
page.on('response', r => {
  if (r.url().includes('/api/')) {
    apiCalls.push({ url: r.url(), status: r.status() });
    console.log('API:', r.status(), r.url());
  }
});
page.on('console', msg => {
  if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
});

// Replicate the exact sequence from the main test
// Step 1: root
await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForURL(/\/(login|chat)/, { timeout: 15000 });
console.log('Step 1 URL:', page.url());

// Step 2: login page structure
await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForSelector('input[type="email"]', { timeout: 20000 });
console.log('Step 2: login page loaded');

// Step 3: register page
await page.goto('http://localhost:3001/register', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForSelector('input[type="text"]', { timeout: 15000 });
console.log('Step 3: register page loaded');

// Step 4: FRUZAQLA login - the failing step
console.log('Step 4: attempting FRUZAQLA login');
await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForSelector('input[type="email"]', { timeout: 20000 });
await page.fill('input[type="email"]', 'admin@fruzaqla.com');
await page.fill('input[type="password"]', 'demo1234');
await page.click('button[type="submit"]');

// Don't use waitForURL - just observe what happens
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(1000);
  const url = page.url();
  const token = await page.evaluate(() => localStorage.getItem('pharma_token')).catch(() => null);
  console.log(`t+${i+1}s URL: ${url} token: ${token ? 'set' : 'null'}`);
  if (url.includes('/chat')) {
    console.log('SUCCESS: reached /chat');
    break;
  }
}

const screenshot = '/tmp/pharma-verify/screenshots/debug-flow.png';
await page.screenshot({ path: screenshot });
console.log('Screenshot saved to', screenshot);

await browser.close();
