const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login
    await page.goto('http://localhost:6435/admin/login.html');
    await page.fill('input[name="email"]', 'admin@thearchive.ch');
    await page.fill('input[name="password"]', 'archive2024');
    await Promise.all([page.waitForLoadState('networkidle'), page.click('button[type="submit"]')]);
    await page.waitForTimeout(3000);

    // Navigate to programs
    await page.evaluate(() => window.location.hash = '#/programs');
    await page.waitForTimeout(3000);
    
    // Check what's on the page
    const html = await page.content();
    console.log('Page contains entity-form:', html.includes('entity-form'));
    console.log('Page contains edit link:', html.includes('edit'));
    
    // List all links on the page
    const links = await page.$$eval('a', as => as.map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim() })));
    console.log('Links on programs page:', JSON.stringify(links));

    // Try clicking edit link
    const editLinks = await page.$$('a[href*="edit"]');
    console.log('Edit links found:', editLinks.length);
    
    if (editLinks.length > 0) {
      const href = await editLinks[0].getAttribute('href');
      console.log('First edit link href:', href);
      await editLinks[0].click();
      await page.waitForTimeout(3000);
      
      console.log('After click - URL hash:', await page.evaluate(() => window.location.hash));
      console.log('Entity form exists:', await page.$('#entity-form') !== null);
      console.log('Page contains entity-form:', await page.content().includes('entity-form'));
    }
    
    // Also try #/programs/new
    console.log('\n--- Testing /programs/new ---');
    await page.evaluate(() => window.location.hash = '#/programs/new');
    await page.waitForTimeout(3000);
    console.log('URL hash:', await page.evaluate(() => window.location.hash));
    console.log('Entity form exists:', await page.$('#entity-form') !== null);
    console.log('Page contains entity-form:', await page.content().includes('entity-form'));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
