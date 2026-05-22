import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

page.on('response', r => {
  if (r.url().includes('/api/')) console.log('API:', r.status(), r.url());
});

await page.goto('http://localhost:3001/register', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForSelector('input[type="text"]', { timeout: 15000 });
console.log('Visited /register');

await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForSelector('input[type="email"]', { timeout: 20000 });
console.log('Login page loaded');

// Use type() instead of fill() to trigger React synthetic events
await page.locator('input[type="email"]').type('admin@fruzaqla.com', { delay: 30 });
await page.locator('input[type="password"]').type('demo1234', { delay: 30 });
await page.click('button[type="submit"]');
console.log('Clicked submit');

await page.waitForTimeout(5000);
console.log('URL after 5s:', page.url());
const token = await page.evaluate(() => localStorage.getItem('pharma_token')).catch(() => null);
console.log('Token:', token ? 'SET' : 'null');

await browser.close();
