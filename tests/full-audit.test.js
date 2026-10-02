const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'audit-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:6435';

const findings = [];
const ctaResults = [];
const routeResults = [];
const journeyResults = [];
const formResults = [];
const allNetworkEvents = [];

function addFinding(sev, cat, title, details) {
  findings.push({ severity: sev, category: cat, title, details });
  const sevIcon = sev === 'CRITICAL' ? '!!' : sev === 'HIGH' ? '!' : sev === 'MEDIUM' ? '~' : '-';
  console.log(`[${sevIcon} ${sev}] ${cat}: ${title}`);
  console.log(`       ${details}`);
}

function addCTA(loc, cta, dest, expected, works, evidence) {
  ctaResults.push({ loc, cta, dest, expected, works, evidence });
  console.log(`${works ? '[PASS]' : '[FAIL]'} CTA ${loc} > "${cta}" → ${dest} (expected: ${expected}) ${evidence || ''}`);
}

function addJourney(journey, action, dest, works, notes) {
  journeyResults.push({ journey, action, dest, works, notes });
  console.log(`[${journey}] ${action} → ${dest} (works: ${works}) ${notes || ''}`);
}

function addForm(pageLoc, formName, validation, submission, success, backend) {
  formResults.push({ page: pageLoc, formName, validation, submission, success, backend });
  console.log(`[FORM] ${pageLoc} - ${formName}: validation=${validation}, backend=${backend}`);
}

function addRoute(name, url, reachable, purpose, status) {
  routeResults.push({ name, url, reachable, purpose, status });
  console.log(`[ROUTE] ${name} ${url} - ${status}`);
}

function normUrl(u) {
  try { return new URL(u, BASE_URL).pathname + new URL(u, BASE_URL).search; } catch { return u; }
}

function matchesExpected(actual, expected) {
  const a = normUrl(actual);
  const e = normUrl(expected);
  return a === e || a.includes(e);
}

async function clickSelectorAndVerify(page, selector, ctaText, expectedDest, loc, ssName) {
  const locHandle = page.locator(selector);
  const count = await locHandle.count();
  if (count === 0) {
    console.log(`[INFO] ${ctaText} not found, selector: ${selector}`);
    return false;
  }
  const href = await locHandle.first().getAttribute('href');
  await locHandle.first().scrollIntoViewIfNeeded();
  await locHandle.first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  
  const destUrl = page.url();
  const works = matchesExpected(destUrl, expectedDest);
  addCTA(loc, ctaText, destUrl, expectedDest, works);
  if (ssName) await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${ssName}.png`) });
  await page.goBack();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  return works;
}

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      allNetworkEvents.push({ type: 'request', url: request.url(), time: Date.now() });
    }
  });
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      allNetworkEvents.push({ type: 'response', url: response.url(), status: response.status(), time: Date.now() });
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERR] ${msg.text()}`);
    }
  });

  // ═══════════════════════════════════════════════════════
  // PHASE 1: Route Inventory
  // ═══════════════════════════════════════════════════════
  console.log('\n========== PHASE 1: ROUTE INVENTORY ==========\n');
  
  const routes = [
    { url: '/', name: 'Homepage', purpose: 'Main landing page' },
    { url: '/training.html', name: 'Training', purpose: 'Program overview' },
    { url: '/strength.html', name: 'Strength', purpose: 'Strength detail' },
    { url: '/personal-training.html', name: 'Personal Training', purpose: 'PT detail' },
    { url: '/group-training.html', name: 'Group Training', purpose: 'Group training detail' },
    { url: '/recovery.html', name: 'Recovery', purpose: 'Recovery detail' },
    { url: '/membership.html', name: 'Membership', purpose: 'Plan overview' },
    { url: '/core.html', name: 'Core Plan', purpose: '$149/mo plan' },
    { url: '/performance.html', name: 'Performance Plan', purpose: '$349/mo plan' },
    { url: '/archive.html', name: 'Archive Plan', purpose: '$749/mo plan' },
    { url: '/about.html', name: 'About', purpose: 'Our approach' },
    { url: '/trainers.html', name: 'Trainers', purpose: 'Coaching team' },
    { url: '/contact.html', name: 'Contact', purpose: 'Contact form' },
    { url: '/join.html', name: 'Join', purpose: 'Application form' },
    { url: '/privacy.html', name: 'Privacy', purpose: 'Legal' },
    { url: '/terms.html', name: 'Terms', purpose: 'Legal' },
  ];
  
  for (const r of routes) {
    const response = await page.goto(`${BASE_URL}${r.url}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    
    const status = response.status();
    const title = await page.title();
    addRoute(r.name, r.url, status === 200, r.purpose, `${status} | "${title}"`);
    
    // Check broken images
    const brokenImgs = await page.evaluate(() => {
      const imgs = Array.from(document.images);
      return imgs.filter(img => img.complete && img.naturalWidth === 0 && img.src)
        .map(img => img.src.replace(window.location.origin, ''));
    });
    if (brokenImgs.length > 0) {
      console.log(`  Broken images: ${brokenImgs.join(', ')}`);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `route-${r.url.replace(/\//g,'_').replace(/\.html$/,'')}.png`), fullPage: true });
  }
  
  // ═══════════════════════════════════════════════════════
  // PHASE 2: Homepage CTA Deep Audit
  // ═══════════════════════════════════════════════════════
  console.log('\n========== PHASE 2: HOMEPAGE CTA AUDIT ==========\n');
  
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  // Hero CTAs
  const heroLinks = await page.$$eval('.hero-actions a', els => els.map(el => ({href: el.href, text: el.textContent.trim()})));
  console.log('Hero CTAs:', JSON.stringify(heroLinks, null, 2));
  
  for (const hl of heroLinks) {
    await page.click(`.hero-actions a:has-text("${hl.text}")`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
    
    const dest = page.url();
    const shortHref = hl.href.replace(BASE_URL, '');
    addCTA('Homepage-Hero', hl.text, dest, shortHref, dest.includes(shortHref.split('?')[0]));
    addJourney('Discover', hl.text, dest, dest.includes(shortHref.split('?')[0]));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `hero-${hl.text.replace(/\s+/g,'-')}.png`) });
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
  }
  
  // Program Cards
  console.log('\n--- Program Cards ---');
  const programCardLinks = await page.$$eval('.training-strip a', els => 
    els.map(el => ({ href: el.getAttribute('href'), text: el.textContent.trim().substring(0, 30) }))
  );
  const uniqueProgs = {};
  for (const hl of programCardLinks) {
    if (hl.href && hl.text.includes('EXPLORE')) {
      uniqueProgs[hl.href] = hl;
    }
  }
  
  for (const [href, data] of Object.entries(uniqueProgs)) {
    await page.click(`a[href="${href}"]`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    
    const dest = page.url();
    const progName = href.replace('.html', '');
    const works = dest.includes(href);
    addCTA('Homepage-ProgramCard', `EXPLORE (${progName})`, dest, href, works);
    addJourney('Discover Program', `Explore ${progName}`, dest, works);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `prog-${progName}.png`) });
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
  }
  
  // Plan Cards
  console.log('\n--- Plan Cards ---');
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  
  const planLinks = await page.$$eval('.plan .plan-cta', els => 
    els.map((el, i) => ({ 
      href: el.getAttribute('href'), 
      text: el.textContent.trim(),
      plan: el.closest('.plan')?.getAttribute('data-plan')
    }))
  );
  
  for (const pl of planLinks) {
    await page.click(`.plan[data-plan="${pl.plan}"] .plan-cta`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    
    const dest = page.url();
    const works = dest.includes(pl.href);
    addCTA('Homepage-Plans', `SELECT (${pl.plan})`, dest, pl.href, works);
    addJourney('Pricing', `SELECT ${pl.plan}`, dest, works);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `plan-${pl.plan}.png`) });
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
  }
  
  // Footer CTAs
  console.log('\n--- Footer CTAs ---');
  await page.evaluate(() => {
    const footer = document.querySelector('footer');
    footer?.scrollIntoView();
  });
  await page.waitForTimeout(500);
  
  await clickSelectorAndVerify(page, 'a:has-text("APPLY FOR MEMBERSHIP")', 'APPLY FOR MEMBERSHIP', '/join.html', 'Homepage-Footer', 'footer-apply');
  
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim().includes('SCHEDULE TOUR'));
    el?.scrollIntoView();
  });
  await page.waitForTimeout(300);
  const tourWorks = await clickSelectorAndVerify(page, 'a:has-text("SCHEDULE TOUR")', 'SCHEDULE TOUR', '/contact.html', 'Homepage-Footer', 'footer-tour');
  if (tourWorks) {
    addJourney('Contact', 'SCHEDULE TOUR', '/contact.html', true, 'Goes to contact form, not a dedicated tour booking system');
  }
  
  // Nav JOIN NOW
  await clickSelectorAndVerify(page, 'nav a[href="join.html"]', 'JOIN NOW (nav)', '/join.html', 'Nav-Desktop', 'nav-join');
  
  // ═══════════════════════════════════════════════════════
  // PHASE 3: Plan Detail + Program Detail Journeys
  // ═══════════════════════════════════════════════════════
  console.log('\n========== PHASE 3: PLAN & PROGRAM DETAIL JOURNEYS ==========\n');
  
  const planDetails = [
    { name: 'Core', url: '/core.html', param: 'plan=core' },
    { name: 'Performance', url: '/performance.html', param: 'plan=performance' },
    { name: 'Archive', url: '/archive.html', param: 'plan=archive' },
  ];
  
  for (const plan of planDetails) {
    await page.goto(`${BASE_URL}${plan.url}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `plan-${plan.name.toLowerCase()}-detail.png`) });
    
    const title = await page.title();
    console.log(`\n--- ${plan.name} ($)---`);
    console.log(`Title: "${title}"`);
    
    // Find APPLY link
    const applyLinks = await page.$$eval('a', els => 
      els.filter(el => el.textContent.trim().toLowerCase().includes('apply') && el.href.includes('join.html'))
        .map(el => ({ href: el.href, text: el.textContent.trim() }))
    );
    
    console.log(`Apply links:`, JSON.stringify(applyLinks));
    
    if (applyLinks.length > 0) {
      await page.click(`a:has-text("${applyLinks[0].text}")`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      const dest = page.url();
      const works = dest.includes(plan.param);
      addCTA(`Plan-${plan.name}`, applyLinks[0].text, dest, `/join.html?${plan.param}`, works);
      addJourney(`Plan ${plan.name}`, `Apply for ${plan.name}`, dest, works);
      
      const planVal = plan.param.split('=')[1];
      try {
        const checked = await page.$eval(`input[name="plan"][value="${planVal}"]`, el => el.checked);
        console.log(`  Pre-selected (${planVal}): ${checked ? 'YES' : 'NO'}`);
        if (!checked) addFinding('HIGH', 'Form', `${plan.name} plan not pre-selected`, `?${plan.param}`);
      } catch(e) { console.log(`  Pre-select check error: ${e.message}`); }
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `plan-${plan.name.toLowerCase()}-join.png`) });
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      const ssName = await clickSelectorAndVerify(page, 'a[href="membership.html"]', 'VIEW ALL PLANS', '/membership.html', `Plan-${plan.name}`, `plan-${plan.name.toLowerCase()}-viewall`);
    } else {
      addFinding('CRITICAL', 'CTA', `${plan.name} APPLY link not found`, '');
    }
  }
  
  // Program details
  const programPages = [
    { name: 'Strength', url: '/strength.html', param: 'program=strength' },
    { name: 'Personal Training', url: '/personal-training.html', param: 'program=pt' },
    { name: 'Group Training', url: '/group-training.html', param: 'program=group' },
    { name: 'Recovery', url: '/recovery.html', param: 'program=recovery' },
  ];
  
  for (const prog of programPages) {
    await page.goto(`${BASE_URL}${prog.url}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `prog-${prog.name.replace(/\s/g,'-').toLowerCase()}-detail.png`) });
    
    const title = await page.title();
    console.log(`\n--- ${prog.name} (${prog.url}) ---`);
    console.log(`Title: "${title}"`);
    
    const joinLinks = await page.$$eval(`a[href*="join.html"]`, els => 
      els.map(el => ({ href: el.href, text: el.textContent.trim() }))
    );
    console.log(`Join links:`, JSON.stringify(joinLinks));
    
    if (joinLinks.length >= 2) {
      // Hero APPLY
      await page.click(`a[href="join.html?${prog.param}"]`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      const dest = page.url();
      const works = dest.includes(prog.param);
      addCTA(`${prog.name}-Hero`, 'APPLY NOW', dest, `/join.html?${prog.param}`, works);
      addJourney(`${prog.name} Program`, 'Hero APPLY', dest, works);
      
      const progVal = prog.param.split('=')[1];
      try {
        const sel = await page.$eval('#app-program', el => el.value);
        console.log(`  Program pre-selected: ${sel === progVal ? 'YES' : 'NO'}`);
        if (sel !== progVal) addFinding('HIGH', 'Form', `${prog.name} program not pre-selected`, `?program=${progVal}`);
      } catch(e) {}
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `prog-${prog.name.replace(/\s/g,'-').toLowerCase()}-join.png`) });
      await page.goBack();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      
      // CTA section APPLY (use the second link)
      const links = await page.$$eval(`a[href="join.html?${prog.param}"]`, (els, i) => {
        if (els[i]) {
          els[i].scrollIntoViewIfNeeded();
          return true;
        }
        return false;
      }, 1);
      if (links) {
        await page.click(`a[href="join.html?${prog.param}"]`, { nth: 1 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        addCTA(`${prog.name}-CTA`, 'APPLY NOW', page.url(), `/join.html?${prog.param}`, page.url().includes(prog.param));
        await page.goBack();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(300);
      }
    } else {
      addFinding('CRITICAL', 'CTA', `${prog.name} has ${joinLinks.length} join links`, 'Expected 2');
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // PHASE 4: Form Audits (Application + Contact)
  // ═══════════════════════════════════════════════════════
  console.log('\n========== PHASE 4: FORM AUDITS ==========\n');
  
  // Application form - test URL params
  await page.goto(`${BASE_URL}/join.html?plan=performance`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  const perfChecked = await page.$('input[name="plan"][value="performance"]:checked');
  console.log(`Plan pre-select (?plan=performance): ${perfChecked ? 'WORKS' : 'FAILS'}`);
  if (!perfChecked) addFinding('HIGH', 'Form', 'Plan pre-selection via URL not working', '?plan=performance');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'join-plan-preselect.png') });
  
  await page.goto(`${BASE_URL}/join.html?program=strength`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  try {
    const progVal = await page.$eval('#app-program', el => el.value);
    console.log(`Program pre-select (?program=strength): ${progVal === 'strength' ? 'WORKS' : 'FAILS'}`);
    if (progVal !== 'strength') addFinding('HIGH', 'Form', 'Program pre-selection via URL not working', '?program=strength');
  } catch(e) { console.log('Program pre-select check error:', e.message); }
  
  // Form validation + submission
  await page.goto(`${BASE_URL}/join.html`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  
  // Empty submit attempt
  allNetworkEvents.length = 0;
  await page.click('#to-step-2');
  await page.waitForTimeout(500);
  
  const nameErr = await page.$eval('#app-error-name', el => el.classList.contains('active')).catch(() => false);
  const emailErr = await page.$eval('#app-error-email', el => el.classList.contains('active')).catch(() => false);
  const ageErr = await page.$eval('#app-error-age', el => el.classList.contains('active')).catch(() => false);
  console.log('Empty form validation:', { nameErr, emailErr, ageErr });
  
  // Fill valid data and submit
  await page.fill('#app-name', 'Jane');
  await page.fill('#app-last-name', 'Smith');
  await page.fill('#app-email', 'jane@example.com');
  await page.fill('#app-phone', '5559876543');
  await page.fill('#app-age', '28');
  await page.click('#to-step-2');
  await page.waitForTimeout(500);
  
  try {
    await page.click('input[name="plan"][value="core"]', { force: true });
  } catch(e) {
    await page.$eval('input[name="plan"][value="core"]', el => el.click());
  }
  await page.waitForTimeout(300);
  await page.click('#to-step-3');
  await page.waitForTimeout(500);
  
  await page.fill('#app-goals', 'Looking to build strength and gain 15 pounds of lean muscle over the next year.');
  
  allNetworkEvents.length = 0;
  
  const [formPost] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/applications') && resp.status() === 201),
    page.click('button[type="submit"]')
  ]);
  await page.waitForTimeout(1000);

  const postCalls = allNetworkEvents.filter(e => e.type === 'response' && e.url.includes('/api/applications') && e.status === 201);
  
  const currentUrl = page.url();
  const redirected = currentUrl.includes('confirmation.html');
  const refParam = new URLSearchParams(new URL(currentUrl).search).get('ref');
  
  console.log(`Form submit: redirected=${redirected}, ref=${refParam}, POST responses=${postCalls.length}`);

  if (postCalls.length === 0) {
    addFinding('CRITICAL', 'Missing Backend', 'Application form does not submit data to backend',
      'join.html form does not POST to /api/applications. Data is lost.');
  }
  if (!redirected) {
    addFinding('HIGH', 'Business Flow', 'No confirmation after application',
      'No redirect to confirmation page after submit');
  }
  if (!refParam) {
    addFinding('MEDIUM', 'Business Flow', 'No reference number on confirmation',
      'Confirmation page missing reference number');
  }
  
  addForm('join.html', 'Membership Application', 'HTML5 + custom (min length, email)',
    postCalls.length > 0 ? `${postCalls.length} API POST response(s)` : 'No API calls - client-side only',
    redirected, postCalls.length > 0);

  
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'join-form-submitted.png'), fullPage: true });
  
  // Contact form
  await page.goto(`${BASE_URL}/contact.html`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'contact-form.png'), fullPage: true });
  
  const fields = ['name', 'last-name', 'email', 'phone', 'inquiry-type', 'message'];
  for (const f of fields) {
    const el = await page.$(`#${f}`);
    console.log(`  Contact field "${f}": ${el ? 'present' : 'MISSING'}`);
  }
  
  // Empty submit
  allNetworkEvents.length = 0;
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
  
  const contactErrors = {
    name: await page.$eval('#error-name', el => el.classList.contains('active')).catch(() => false),
    lastName: await page.$eval('#error-last-name', el => el.classList.contains('active')).catch(() => false),
    email: await page.$eval('#error-email', el => el.classList.contains('active')).catch(() => false),
    inquiry: await page.$eval('#error-inquiry', el => el.classList.contains('active')).catch(() => false),
    message: await page.$eval('#error-message', el => el.classList.contains('active')).catch(() => false),
  };
  console.log('Empty contact validation:', contactErrors);
  
  // Invalid email
  await page.fill('#name', 'Test');
   await page.fill('#last-name', 'User');
  await page.fill('#email', 'bademail');
   await page.selectOption('#inquiry-type', 'membership');
  await page.fill('#message', 'Test message here.');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
  
  const emailErrAfter = await page.$eval('#error-email', el => el.classList.contains('active')).catch(() => false);
  console.log(`Invalid email caught: ${emailErrAfter}`);
  if (!emailErrAfter) addFinding('HIGH', 'Form Validation', 'Contact form does not validate email format', '');
  
  // Valid submit
  await page.fill('#email', 'test@example.com');
  
  allNetworkEvents.length = 0;
  
  const [contactFormPost] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/contacts') && resp.status() === 201),
    page.click('button[type="submit"]')
  ]);
  await page.waitForTimeout(1000);

  const contactPostCalls = allNetworkEvents.filter(e => e.type === 'response' && e.url.includes('/api/contacts') && e.status === 201);
  const contactCurrentUrl = page.url();
  const contactRedirected = contactCurrentUrl.includes('confirmation.html');
  
  console.log(`Contact form submit: redirected=${contactRedirected}, POST responses=${contactPostCalls.length}`);
  
  if (contactPostCalls.length === 0) {
    addFinding('CRITICAL', 'Missing Backend', 'Contact form does not submit data to backend',
      'contact.html shows success message client-side only - NO POST to /api/contacts. Data is lost.');
  }
  if (!contactRedirected) {
    addFinding('HIGH', 'Business Flow', 'No confirmation after contact form',
      'No redirect to confirmation page after contact form submit');
  }
  
  addForm('contact.html', 'Contact Form', 'HTML5 + custom (email format, min length)',
    contactPostCalls.length > 0 ? `${contactPostCalls.length} API POST response(s)` : 'No API calls - client-side only',
    contactRedirected, contactPostCalls.length > 0);
  
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'contact-form-submitted.png'), fullPage: true });
  
  // ═══════════════════════════════════════════════════════
  // PHASE 5: Day Pass / Entry Journey
  // ═══════════════════════════════════════════════════════
  console.log('\n========== PHASE 5: DAY PASS / ENTRY JOURNEY ==========\n');
  
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const homepageText = (await page.textContent('body')).toLowerCase();
  const passKeywords = ['day pass', 'day-pass', 'drop-in', 'dropin', 'single visit', 'pay-per-visit', 'single-session', 'day access'];
  let foundAny = false;
  for (const kw of passKeywords) {
    if (homepageText.includes(kw)) { console.log(`Found keyword: "${kw}"`); foundAny = true; }
  }
  
  const dayPassPage = await page.goto(`${BASE_URL}/day-pass.html`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  
  const dayPassPageExists = dayPassPage.status() === 200 && dayPassPage.headers()['content-type']?.includes('text/html');
  const dayPassForm = await page.$('#day-pass-form');
  const dayPassNav = await page.$eval('a[href="day-pass.html"]', el => el).catch(() => null);
  
  console.log(`Day Pass: page=${dayPassPageExists}, form=${!!dayPassForm}, nav=${!!dayPassNav}`);
  
  if (dayPassPageExists && dayPassForm) {
    await page.fill('#dp-name', 'Alex');
    await page.fill('#dp-last-name', 'Tourist');
    await page.fill('#dp-email', 'alex@example.com');
    await page.fill('#dp-phone', '5551234567');
    await page.fill('#dp-date', '2026-10-15');
    await page.selectOption('#dp-time', 'afternoon');
    await page.selectOption('#dp-guests', '1');
    
    allNetworkEvents.length = 0;
    const [dayPassPost] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/day-pass-requests') && resp.status() === 201),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(1000);
    
    const dpPostCalls = allNetworkEvents.filter(e => e.type === 'response' && e.url.includes('/api/day-pass-requests') && e.status === 201);
    const dpSuccess = await page.$eval('#form-success.active', el => el).catch(() => null);
    const dpRef = await page.$eval('#day-pass-reference', el => el.textContent).catch(() => '');
    
    console.log(`Day Pass submit: POST calls=${dpPostCalls.length}, success=${!!dpSuccess}, reference=${dpRef}`);
    
    if (dpPostCalls.length === 0) {
      addFinding('CRITICAL', 'Missing Backend', 'Day Pass form does not submit to backend', 'No POST to /api/day-pass-requests');
    } else {
      addJourney('Day Pass', 'Submit form', 'Confirmation page with reference', true, `POST to /api/day-pass-requests, ref=${dpRef}`);
    }
  } else {
    addFinding('CRITICAL', 'Missing Business Flow', 'No Day Pass / Drop-in / Single Visit journey',
      'No CTA or page exists for day passes or single-session access. Only full membership applications are available.');
    addJourney('Day Pass', 'N/A', 'N/A', false, 'No day pass journey exists');
  }
  
  // ═══════════════════════════════════════════════════════
  // PHASE 6: Duplicate Destination Report
  // ═══════════════════════════════════════════════════════
  console.log('\n========== PHASE 6: DUPLICATE DESTINATION REPORT ==========\n');
  
  const destMap = new Map();
  const pagesToCheck = ['/', '/training.html', '/membership.html', '/strength.html',
    '/personal-training.html', '/group-training.html', '/recovery.html',
    '/core.html', '/performance.html', '/archive.html', '/about.html',
    '/trainers.html', '/contact.html', '/day-pass.html', '/confirmation.html'];
  
  for (const p of pagesToCheck) {
    await page.goto(`${BASE_URL}${p}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    
    const links = await page.$$eval('a[href]', els => 
      els.filter(el => {
        const href = el.getAttribute('href');
        return href && !href.startsWith('#') && !href.startsWith('http');
      }).map(el => ({ href: el.getAttribute('href'), text: el.textContent.trim().substring(0, 40) }))
    );
    
    for (const l of links) {
      const dest = normUrl(l.href);
      if (!destMap.has(dest)) destMap.set(dest, []);
      destMap.get(dest).push({ page: p, cta: l.text });
    }
  }
  
  console.log('\n--- Destinations with >2 CTAs ---');
  for (const [dest, sources] of destMap.entries()) {
    if (sources.length > 2) {
      console.log(`\n  ${dest} ← ${sources.length} CTAs:`);
      sources.forEach(s => console.log(`    ${s.page} > "${s.cta}"`));
    }
  }
  
  console.log('\n--- All join.html destinations ---');
  for (const [dest, sources] of destMap.entries()) {
    if (dest.includes('join.html')) {
      console.log(`  ${dest} ← ${sources.length} CTAs`);
      sources.forEach(s => console.log(`    ${s.page} > "${s.cta}"`));
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // PHASE 7: Mobile / Responsive
  // ═══════════════════════════════════════════════════════
  console.log('\n========== PHASE 7: MOBILE / RESPONSIVE AUDIT ==========\n');
  
  const viewports = [
    { name: '375x812', width: 375, height: 812 },
    { name: '768x1024', width: 768, height: 1024 },
  ];
  
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `mobile-${vp.name}.png`), fullPage: true });
    
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    if (scrollWidth > vp.width + 5) {
      addFinding('HIGH', 'Responsive', `Horizontal overflow on ${vp.name}`, `scrollWidth=${scrollWidth}`);
    }
    
    const navToggle = await page.$('.nav-toggle');
    if (!navToggle) {
      addFinding('CRITICAL', 'Mobile', `No hamburger menu on ${vp.name}`, '');
    } else {
      await navToggle.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `mobile-menu-${vp.name}.png`) });
      
        const mobileOpen = await page.$('.nav-mobile.is-open');
        if (!mobileOpen) {
          addFinding('CRITICAL', 'Mobile', `Menu does not open on ${vp.name}`, '');
        } else {
          const count = await page.$$eval('.nav-mobile-links a', els => els.length);
          console.log(`${vp.name}: ${count} mobile nav links`);

         // Click first link
          const firstLinkText = await page.$eval('.nav-mobile-links a:first-child', el => el.textContent.trim());
          await page.evaluate(() => {
            const links = document.querySelectorAll('.nav-mobile-links a');
            if (links[0]) {
              links[0].scrollIntoView({block: 'center', inline: 'center'});
              links[0].click();
            }
          });
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(300);
          console.log(`  Mobile nav "${firstLinkText}" → ${page.url()}`);
       }

       // Go back to test close button on same page
       await page.goto(`${BASE_URL}/`);
       await page.waitForLoadState('domcontentloaded');
       await page.waitForTimeout(300);
       const navToggle2 = await page.$('.nav-toggle');
       if (navToggle2) {
         await navToggle2.click();
         await page.waitForTimeout(500);
         const closeBtn = await page.$('.nav-mobile-close');
         if (closeBtn) {
           await closeBtn.click();
           await page.waitForTimeout(500);
           const stillOpen = await page.$('.nav-mobile.is-open');
           if (stillOpen) addFinding('HIGH', 'Mobile', `Menu close button doesn\\'t close`, '');
         }
       }
    }
  }
  
  // Test forms on mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/contact.html`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-contact.png'), fullPage: true });
  
  const contactGridCols = await page.$eval('.contact-grid', el => getComputedStyle(el).gridTemplateColumns);
  console.log(`Contact grid (mobile): ${contactGridCols}`);
  
  await page.goto(`${BASE_URL}/join.html`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-join.png'), fullPage: true });
  
  const formRowCols = await page.$eval('.form-row', el => getComputedStyle(el).gridTemplateColumns);
  console.log(`Join form row (mobile): ${formRowCols}`);
  
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // ═══════════════════════════════════════════════════════
  // PHASE 8: Accessibility + Encoding + Content
  // ═══════════════════════════════════════════════════════
  console.log('\n========== PHASE 8: ACCESSIBILITY / CONTENT ==========\n');
  
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  
  // Images without alt
  const noAltImgs = await page.$$eval('img', els => 
    els.filter(el => !el.getAttribute('alt') || el.getAttribute('alt').trim() === '')
      .map(el => el.getAttribute('src'))
  );
  if (noAltImgs.length > 0) {
    addFinding('LOW', 'Accessibility', `${noAltImgs.length} images without alt text`, noAltImgs.join(', '));
  }
  
  // Links without text
  const emptyLinks = await page.$$eval('a', els =>
    els.filter(el => !el.textContent.trim() && !el.getAttribute('href')).length
  );
  if (emptyLinks > 0) {
    addFinding('LOW', 'Accessibility', `${emptyLinks} links with no text and no href`, '');
  }
  
  // Encoding issues
  await page.goto(`${BASE_URL}/contact.html`);
  await page.waitForLoadState('networkidle');
  const contactTitle = await page.title();
  if (contactTitle.includes('â€')) {
    addFinding('MEDIUM', 'Content', 'Encoding issue in contact.html title', `Title="${contactTitle}"`);
  }
  
  await page.goto(`${BASE_URL}/about.html`);
  await page.waitForLoadState('networkidle');
  const aboutTitle = await page.title();
  if (aboutTitle.includes('â€')) {
    addFinding('MEDIUM', 'Content', 'Encoding issue in about.html title', `Title="${aboutTitle}"`);
  }
  
  // no-js check
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  const htmlClass = await page.$eval('html', el => el.className);
  if (htmlClass.includes('no-js')) {
    addFinding('HIGH', 'JavaScript', 'HTML has "no-js" class after load', 'JS may not have initialized');
  }
  
  // ═══════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log('\n\n==============================================');
  console.log('       AUDIT COMPLETE - FINAL REPORT          ');
  console.log('==============================================\n');
  
  const sevCounts = {};
  findings.forEach(f => sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1);
  
  console.log('FINDINGS BY SEVERITY:');
  console.log(`  CRITICAL: ${sevCounts.CRITICAL || 0}`);
  console.log(`  HIGH: ${sevCounts.HIGH || 0}`);
  console.log(`  MEDIUM: ${sevCounts.MEDIUM || 0}`);
  console.log(`  LOW: ${sevCounts.LOW || 0}`);
  
  console.log(`\nRoutes: ${routeResults.length} total, ${routeResults.filter(r => r.reachable).length} reachable`);
  console.log(`CTAs: ${ctaResults.length} total, ${ctaResults.filter(t => t.works).length} working`);
  console.log(`Journeys: ${journeyResults.length} total, ${journeyResults.filter(j => j.works).length} working`);
  console.log(`Forms: ${formResults.length} tested, ${formResults.filter(f => f.backend).length} with backend`);
  
  console.log('\n=== CRITICAL FINDINGS ===');
  findings.filter(f => f.severity === 'CRITICAL').forEach((f, i) => {
    console.log(`\n${i+1}. ${f.category}: ${f.title}`);
    console.log(`   ${f.details}`);
  });
  
  console.log('\n=== HIGH FINDINGS ===');
  findings.filter(f => f.severity === 'HIGH').forEach((f, i) => {
    console.log(`\n${i+1}. ${f.category}: ${f.title}`);
    console.log(`   ${f.details}`);
  });
  
  console.log('\n=== ALL CTA RESULTS ===');
  ctaResults.forEach(c => {
    console.log(`${c.works ? 'PASS' : 'FAIL'} ${c.loc} > "${c.cta}" → ${c.dest}`);
  });
  
  const report = {
    executiveSummary: {
      totalFindings: findings.length,
      severityCounts: sevCounts,
      reachableRoutes: routeResults.filter(r => r.reachable).length,
      totalRoutes: routeResults.length,
      workingCTAs: ctaResults.filter(t => t.works).length,
      totalCTAs: ctaResults.length,
      workingJourneys: journeyResults.filter(j => j.works).length,
      totalJourneys: journeyResults.length,
      workingForms: formResults.filter(f => f.backend).length,
      totalForms: formResults.length
    },
    findings,
    routeInventory: routeResults,
    ctaTests: ctaResults,
    businessJourneys: journeyResults,
    formTests: formResults,
    duplicateDestinations: Array.from(destMap.entries()).map(([k,v]) => ({ destination: k, count: v.length, sources: v })),
    screenshots: fs.readdirSync(SCREENSHOT_DIR).map(f => `audit-screenshots/${f}`)
  };
  
  fs.writeFileSync(path.join(__dirname, '..', 'AUDIT-REPORT.json'), JSON.stringify(report, null, 2));
  console.log(`\nReport saved: AUDIT-REPORT.json`);
  console.log(`Screenshots: ${SCREENSHOT_DIR} (${fs.readdirSync(SCREENSHOT_DIR).length} files)`);
  
  await browser.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
