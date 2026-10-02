const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const allLogs = [];
  page.on('console', msg => allLogs.push(`CONSOLE [${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', err => allLogs.push(`PAGE ERROR: ${err.message}`));
  page.on('response', res => allLogs.push(`RESPONSE: ${res.status()} ${res.url()}`));
  
  try {
    await page.goto('http://localhost:6435/admin/login.html');
    await page.fill('input[name="email"]', 'admin@thearchive.ch');
    await page.fill('input[name="password"]', 'archive2024');
    await Promise.all([page.waitForLoadState('networkidle'), page.click('button[type="submit"]')]);
    await page.waitForTimeout(3000);
    
    allLogs.length = 0; // Clear logs from login
    
    await page.evaluate(() => window.location.hash = '#/programs/new');
    await page.waitForTimeout(5000);
    
    console.log('=== All browser logs ===');
    allLogs.forEach(l => console.log(l));
    console.log('=== End logs ===');
    
    console.log('\nContent area:', await page.innerHTML('#content-area'));
    console.log('Has error msg:', await page.$('.text-danger') !== null);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
