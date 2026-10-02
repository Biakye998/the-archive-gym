const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  page.on('response', res => {
    if (res.url().includes('/api/')) {
      logs.push('API: ' + res.status() + ' ' + res.url());
    }
  });

  try {
    // Login
    await page.goto('http://localhost:6435/admin/login.html');
    await page.fill('input[name="email"]', 'admin@thearchive.ch');
    await page.fill('input[name="password"]', 'archive2024');
    await Promise.all([page.waitForLoadState('networkidle'), page.click('button[type="submit"]')]);
    await page.waitForTimeout(3000);

    // Navigate to settings
    await page.evaluate(() => window.location.hash = '#/settings');
    await page.waitForTimeout(3000);

    // Check form
    const formExists = await page.$('form') !== null;
    const inputExists = await page.$('input[name="business_name"]') !== null;
    const buttonExists = await page.$('button[type="submit"]') !== null;
    console.log('Form exists:', formExists);
    console.log('Input exists:', inputExists);
    console.log('Button exists:', buttonExists);

    // Fill and submit
    await page.fill('input[name="business_name"]', 'PLAYWRIGHT TEST NAME');
    await page.click('button[type="submit"]', { timeout: 10000 }).catch(e => console.log('Click error:', e.message));
    await page.waitForTimeout(4000);

    // Check for toast
    const toasts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.toast')).map(t => t.textContent);
    });
    console.log('Toasts:', JSON.stringify(toasts));

    // Check console logs
    console.log('Console logs:', logs.filter(l => l.includes('Save') || l.includes('error') || l.includes('settings')));
    
    // Check network logs for API calls
    console.log('API calls:', logs.filter(l => l.startsWith('API:')));
    
    // Verify via direct API
    const sf = await page.evaluate(async () => {
      const r = await fetch('/api/settings/storefront');
      const d = await r.json();
      return { status: r.status, business_name: d.business_name };
    });
    console.log('Storefront check:', sf);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
