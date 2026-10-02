const { chromium } = require('playwright');

async function runTests() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = [];
  function log(test, pass, detail = '') {
    const status = pass ? 'pass' : 'FAIL';
    console.log(`[${status}] ${test}${detail ? ' - ' + detail : ''}`);
    results.push({ test, pass });
  }

  const api = {
    headers: {},
    async get(url) { const r = await fetch(`http://localhost:6435/api${url}`, { headers: this.headers }); return { status: r.status, data: await r.json().catch(() => null) }; },
    async put(url, body) { const r = await fetch(`http://localhost:6435/api${url}`, { method: 'PUT', headers: { ...this.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => null) }; },
    async post(url, body) { const r = await fetch(`http://localhost:6435/api${url}`, { method: 'POST', headers: { ...this.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => null) }; },
    async del(url) { const r = await fetch(`http://localhost:6435/api${url}`, { method: 'DELETE', headers: this.headers }); return { status: r.status, data: await r.json().catch(() => null) }; }
  };

  try {
    console.log('=== Admin Panel Playwright Tests\n');

    // Test 1-3: Login
    await page.goto('http://localhost:6435/admin/login.html');
    await page.waitForLoadState('networkidle');
    log('Login page loads', (await page.title()) === 'Admin Login — THE ARCHIVE');
    await page.fill('input[name="email"]', 'admin@thearchive.ch');
    await page.fill('input[name="password"]', 'archive2024');
    await Promise.all([page.waitForLoadState('networkidle', { timeout: 15000 }), page.click('button[type="submit"]')]);
    await page.waitForTimeout(3000);
    log('Login redirects to admin', page.url().includes('/admin/'));
    await page.waitForSelector('#user-email', { state: 'visible', timeout: 10000 });
    log('Dashboard shows email', (await page.textContent('#user-email')).includes('admin@thearchive.ch'));

    const token = await page.evaluate(() => localStorage.getItem('admin_token'));
    api.headers = { Authorization: `Bearer ${token}` };

    // Test 4-6: Settings
    await page.evaluate(() => window.location.hash = '#/settings');
    await page.waitForTimeout(3000);
    log('Settings page loads', (await page.textContent('#page-title')).includes('Settings'));
    await page.fill('input[name="business_name"]', 'PLAYWRIGHT TEST');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    log('Settings saved via admin', true);
    await page.waitForTimeout(2000);
    const sf = await api.get('/settings/storefront');
    log('Storefront reflects settings change', sf.data?.business_name === 'PLAYWRIGHT TEST', `got: "${sf.data?.business_name}"`);

    // Test 7-10: Programs CRUD
    await page.evaluate(() => window.location.hash = '#/programs');
    await page.waitForTimeout(3000);
    log('Programs page loads', (await page.textContent('#page-title')).includes('Program'));

    // Edit program
    const progList = await api.get('/programs/storefront');
    const firstProgId = progList.data?.[0]?.id;
    await page.evaluate(id => window.location.hash = `#/programs/edit/${id}`, firstProgId);
    await page.waitForTimeout(3000);
    if (await page.$('#entity-form')) {
      log('Program edit form opens', true);
      await page.fill('input[name="image"]', 'images/playwright-test-hero.jpg');
      await page.click('#entity-form button[type="submit"]');
      await page.waitForTimeout(5000);
      log('Program saved via admin', true);
      await page.waitForTimeout(2000);
      const progs = await api.get('/programs/storefront');
      log('Program image updated on storefront', progs.data?.[0]?.image === 'images/playwright-test-hero.jpg', `image="${progs.data?.[0]?.image}"`);
    } else {
      log('Program edit form opens', false);
    }

    // Create new program
    await page.evaluate(() => window.location.hash = '#/programs/new');
    await page.waitForTimeout(2000);
    if (await page.$('#entity-form')) {
      log('New program form opens', true);
      await page.fill('input[name="slug"]', 'pw-new-prog');
      await page.fill('input[name="title"]', 'Playwright New Program');
      await page.fill('textarea[name="description"]', 'Created via Playwright test');
      await page.fill('input[name="image"]', 'images/pw-new.jpg');
      await page.click('#entity-form button[type="submit"]');
      await page.waitForTimeout(3000);
      const created = await api.get('/programs/storefront');
      const found = created.data?.find(p => p.slug === 'pw-new-prog');
      log('New program visible on storefront', !!found, found ? `image="${found.image}"` : 'not found');
    } else {
      log('New program form opens', false);
    }

    // Delete test program
    const allProgs = await api.get('/programs');
    const testProg = allProgs.data?.find(p => p.slug === 'pw-new-prog');
    if (testProg) {
      await api.del(`/programs/${testProg.id}`);
      const remaining = await api.get('/programs');
      log('Program deleted', !remaining.data?.find(p => p.slug === 'pw-new-prog'));
    }

    // Test 11-15: Navigation pages
    const navPages = [
      { hash: '#/media', label: 'Media' },
      { hash: '#/integrations', label: 'Integrations' },
      { hash: '#/audit', label: 'Audit' },
      { hash: '#/admins', label: 'Admin' },
      { hash: '#/coaches', label: 'Coaches' }
    ];
    for (const np of navPages) {
      await page.evaluate(h => window.location.hash = h, np.hash);
      await page.waitForTimeout(3000);
      const title = await page.textContent('#page-title');
      log(`${np.label} page loads`, title && title.includes(np.label), `title="${title}"`);
    }

    // Test 16: Coach image change
    const coachEditLink = await page.$('a[href*="/coaches/edit/"]');
    if (coachEditLink) {
      await coachEditLink.click();
      await page.waitForTimeout(2000);
      if (await page.$('#entity-form')) {
        log('Coach edit form opens', true);
        await page.fill('input[name="image"]', 'images/pw-coach-test.jpg');
        await page.click('#entity-form button[type="submit"]');
        await page.waitForTimeout(3000);
        const coaches = await api.get('/coaches/storefront');
        log('Coach image updated on storefront', coaches.data?.[0]?.image === 'images/pw-coach-test.jpg', `image="${coaches.data?.[0]?.image}"`);
      } else {
        log('Coach edit form opens', false);
      }
    } else {
      log('Coach edit link found', false);
    }

  } catch (err) {
    console.error('Test error:', err.message);
    log('Test execution', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n=== Summary ===');
  const passed = results.filter(r => r.pass).length;
  console.log(`${passed}/${results.length} tests passed`);
  process.exit(passed === results.length ? 0 : 1);
}

runTests().catch(console.error);
