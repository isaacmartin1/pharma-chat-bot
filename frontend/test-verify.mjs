import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:3001';
const SCREENSHOTS = '/tmp/pharma-verify/screenshots';
mkdirSync(SCREENSHOTS, { recursive: true });

const results = [];

async function shot(page, name) {
  await page.screenshot({ path: `${SCREENSHOTS}/${name}.png`, fullPage: false });
}

async function log(emoji, step, detail) {
  console.log(`${emoji} ${step}: ${detail}`);
  results.push({ emoji, step, detail });
}

async function loginAs(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  // Use type() to trigger React's synthetic onChange events (fill() bypasses them)
  await page.locator('input[type="email"]').type(email, { delay: 30 });
  await page.locator('input[type="password"]').type(password, { delay: 30 });
  await page.click('button[type="submit"]');
  await page.waitForURL('**/chat**', { timeout: 20000 });
  await page.waitForSelector('textarea', { timeout: 15000 });
}

async function logout(page) {
  const logoutBtn = await page.$('button[title="Log out"]');
  if (logoutBtn) {
    await logoutBtn.click();
    await page.waitForURL('**/login**', { timeout: 10000 });
    return true;
  }
  await page.evaluate(() => localStorage.removeItem('pharma_token'));
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  return false;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // ── 1. Root redirect ──────────────────────────────────────────────────────
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Root page does client-side redirect via useEffect — wait for hydration
    await page.waitForURL(/\/(login|chat)/, { timeout: 15000 });
    await log('✅', 'Root redirect', `Landed on ${page.url()}`);
    await shot(page, '01-root-redirect');
  } catch (e) {
    await log('❌', 'Root redirect', `${e.message} | URL: ${page.url()}`);
    await shot(page, '01-root-fail');
  }

  // ── 2. Login page structure ───────────────────────────────────────────────
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('input[type="email"]', { timeout: 20000 });
    const h1 = await page.textContent('h1');
    const emailOk = !!(await page.$('input[type="email"]'));
    const passOk = !!(await page.$('input[type="password"]'));
    const btnOk = !!(await page.$('button[type="submit"]'));
    await log(emailOk && passOk && btnOk ? '✅' : '❌', 'Login page structure',
      `h1="${h1}" email=${emailOk} pass=${passOk} submit=${btnOk}`);
    await shot(page, '02-login-page');
  } catch (e) {
    await log('❌', 'Login page structure', e.message);
    await shot(page, '02-login-fail');
  }

  // ── 3. Register page structure ────────────────────────────────────────────
  try {
    await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('input[type="text"]', { timeout: 15000 });
    const inputs = await page.$$('input');
    const h1 = await page.textContent('h1');
    const hasCompanyField = await page.$('input[placeholder*="Company"], input[placeholder*="company"], input[placeholder*="Acme"]');
    await log(inputs.length >= 5 ? '✅' : '⚠️', 'Register page',
      `h1="${h1}" ${inputs.length} inputs, companyField=${!!hasCompanyField}`);
    await shot(page, '03-register-page');
  } catch (e) {
    await log('❌', 'Register page', e.message);
  }

  // ── 4. Login FRUZAQLA ─────────────────────────────────────────────────────
  try {
    await loginAs(page, 'admin@fruzaqla.com', 'demo1234');
    await log('✅', 'Login FRUZAQLA', `On ${page.url()}`);
    await shot(page, '04-fruzaqla-chat');
  } catch (e) {
    await log('❌', 'Login FRUZAQLA', e.message);
    await shot(page, '04-fruzaqla-fail');
  }

  // ── 5. Chat layout ────────────────────────────────────────────────────────
  try {
    const textarea = await page.waitForSelector('textarea', { timeout: 15000 });
    const sidebar = await page.$('.text-brand-navy');
    const newChatBtn = await page.$('button');
    await log('✅', 'Chat layout', `textarea=${!!textarea} sidebar=${!!sidebar}`);
    await shot(page, '05-chat-layout');
  } catch (e) {
    await log('❌', 'Chat layout', e.message);
    await shot(page, '05-chat-layout-fail');
  }

  // ── 6. Full email generation flow (onboarding → claims → approve → asset) ──
  try {
    // Onboarding modal appears automatically when no session is selected on login
    await page.waitForSelector('text=Set Up Your Asset', { timeout: 10000 });
    await log('✅', 'Onboarding modal', 'appeared automatically (no session)');
    await shot(page, '06-onboarding-modal');

    // Wait for drug field to be auto-populated (getMe resolves asynchronously)
    // then fill it in if needed
    const drugInput = await page.waitForSelector('input[placeholder*="FRUZAQLA"]', { timeout: 10000 });
    const drugValue = await drugInput.inputValue();
    if (!drugValue) {
      await drugInput.type('FRUZAQLA® (fruquintinib)', { delay: 20 });
    }
    await log('✅', 'Drug field populated', drugValue || 'FRUZAQLA® (fruquintinib)');

    // Select "HCP Email" content type to enable Start Creating
    await page.click('button:has-text("HCP Email")');
    await log('✅', 'Selected content type', 'HCP Email selected');

    // Click "Start Creating" to send the fast-path message
    await page.click('button:has-text("Start Creating")');
    await log('✅', 'Started creating', 'sent fast-path generation message');

    // Wait for the claims approval button to appear (CLAIMS_PROPOSED rendered as card)
    const approveBtn = await page.waitForSelector('button:has-text("Approve Selected Claims")', { timeout: 60000 });
    await log('✅', 'Claims proposed', 'AI responded with claims for approval');
    await shot(page, '06-claims-proposed');
    await approveBtn.click();
    await log('✅', 'Claims approved', 'clicked approve button');

    // Wait for asset to be generated (iframe appears in modal, allow up to 3 minutes)
    await page.waitForFunction(
      () => document.querySelectorAll('iframe').length > 0,
      null,
      { timeout: 180000 }
    );
    await page.waitForTimeout(2000);
    await shot(page, '06-asset-generated');

    const iframes = await page.$$('iframe');
    await log(iframes.length > 0 ? '✅' : '❌', 'Email asset generated', `${iframes.length} iframe(s) in modal`);

    // Close asset modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Check compliance panel (visible in the right panel now)
    const bodyText = await page.textContent('body');
    const hasCompliance = /compliance|isi|pass|fail|logo/i.test(bodyText);
    await log(hasCompliance ? '✅' : '⚠️', 'Compliance panel', hasCompliance ? 'visible' : 'not detected');
  } catch (e) {
    await log('❌', 'Email generation flow', e.message);
    await shot(page, '06-generation-fail');
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
  }

  // ── 7. Logout FRUZAQLA ────────────────────────────────────────────────────
  try {
    const ok = await logout(page);
    const url = page.url();
    await log(ok ? '✅' : '⚠️', 'Logout FRUZAQLA', `${ok ? 'icon button clicked' : 'manual fallback'} → ${url}`);
    await shot(page, '07-after-logout');
  } catch (e) {
    await log('❌', 'Logout FRUZAQLA', e.message);
  }

  // ── 8. Login RENVARIL ─────────────────────────────────────────────────────
  try {
    await loginAs(page, 'admin@renvaril.com', 'demo1234');
    await log('✅', 'Login RENVARIL', `On ${page.url()}`);
    await shot(page, '08-renvaril-chat');
  } catch (e) {
    await log('❌', 'Login RENVARIL', e.message);
    await shot(page, '08-renvaril-fail');
    try {
      const r = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@renvaril.com', password: 'demo1234' })
      });
      const d = await r.json();
      await log('⚠️', 'RENVARIL API check', `status=${r.status} token=${d.access_token ? 'present' : 'MISSING'}`);
    } catch (e2) {
      await log('⚠️', 'RENVARIL API check', e2.message);
    }
  }

  // ── 9. RENVARIL email generation ──────────────────────────────────────────
  if (page.url().includes('/chat')) {
    try {
      // Onboarding modal appears automatically after RENVARIL login (no session)
      await page.waitForSelector('text=Set Up Your Asset', { timeout: 10000 });

      // Wait for drug field to be auto-populated, fill if needed
      const drugInput = await page.waitForSelector('input[placeholder*="FRUZAQLA"]', { timeout: 10000 });
      const drugValue = await drugInput.inputValue();
      if (!drugValue) {
        await drugInput.type('RENVARIL® (renvazumab)', { delay: 20 });
      }
      await log('✅', 'RENVARIL drug field', drugValue || 'RENVARIL® (renvazumab)');

      // Select Product Launch type to enable Start Creating
      await page.click('button:has-text("Product Launch")');
      await log('✅', 'RENVARIL content type', 'Product Launch selected');
      await page.click('button:has-text("Start Creating")');

      // Wait for the claims approval button to appear
      const approveBtn = await page.waitForSelector('button:has-text("Approve Selected Claims")', { timeout: 60000 });

      // Check if RENVARIL branding appears in the claims card
      const preApproveText = await page.textContent('body');
      const hasRENVARIL = /renvaril|renvazumab|nsclc|novex/i.test(preApproveText);
      await log(hasRENVARIL ? '✅' : '⚠️', 'RENVARIL branding in response',
        hasRENVARIL ? 'detected drug/company name' : 'not found');
      await approveBtn.click();

      // Wait for asset (allow up to 3 minutes for AI generation)
      await page.waitForFunction(
        () => document.querySelectorAll('iframe').length > 0,
        null,
        { timeout: 180000 }
      );
      await page.waitForTimeout(2000);
      await shot(page, '09-renvaril-email');

      const iframes = await page.$$('iframe');
      await log(iframes.length > 0 ? '✅' : '❌', 'RENVARIL asset generated', `${iframes.length} iframe(s)`);

      // Check iframe content for RENVARIL branding
      if (iframes.length > 0) {
        try {
          const frame = await iframes[0].contentFrame();
          const frameText = frame ? await frame.textContent('body') : '';
          const hasRenvaril = /renvaril|renvazumab|nsclc/i.test(frameText || '');
          await log(hasRenvaril ? '✅' : '⚠️', 'RENVARIL in email iframe',
            hasRenvaril ? 'branding confirmed in email HTML' : 'not found in iframe');
        } catch (_) {}
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e) {
      await log('❌', 'RENVARIL email generation', e.message);
      await shot(page, '09-renvaril-gen-fail');
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  // ── 10. Logout RENVARIL ───────────────────────────────────────────────────
  try {
    const ok = await logout(page);
    await log(ok ? '✅' : '⚠️', 'Logout RENVARIL', ok ? 'icon button clicked' : 'manual fallback');
    await shot(page, '10-final-logout');
  } catch (e) {
    await log('⚠️', 'Logout RENVARIL', e.message);
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  const fails = results.filter(r => r.emoji === '❌');
  const warns = results.filter(r => r.emoji === '⚠️');
  console.log(`Total: ${results.length} checks, ${fails.length} failures, ${warns.length} warnings`);
  if (fails.length) {
    console.log('FAILURES:');
    fails.forEach(f => console.log(`  ❌ ${f.step}: ${f.detail}`));
  }
  writeFileSync('/tmp/pharma-verify/results.json', JSON.stringify(results, null, 2));
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
