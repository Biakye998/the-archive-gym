const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

let findings = [];

htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  
  // Check for empty pages (just headings, no real content)
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1];
    // Check for placeholder text
    if (bodyContent.match(/Coming Soon|TODO|Placeholder|Under Construction|Not Implemented/gi)) {
      findings.push({ type: 'PLACEHOLDER', file, detail: 'Found placeholder text' });
    }
    // Check for empty main content (only nav + footer)
    const mainMatch = bodyContent.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const sectionMatch = bodyContent.match(/<section[^>]*>([\s\S]*?)<\/section>/i);
    if (!mainMatch && !sectionMatch) {
      findings.push({ type: 'NO_MAIN_CONTENT', file, detail: 'No main/section content found' });
    }
  }
  
  // Check for buttons that might navigate
  const buttonMatches = content.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi);
  for (const m of buttonMatches) {
    const btnContent = m[0];
    // Check for href or data-href on buttons (non-standard)
    if (btnContent.match(/href=|data-href=/i)) {
      findings.push({ type: 'BUTTON_WITH_HREF', file, detail: btnContent.substring(0, 200) });
    }
    // Check for onclick handlers
    if (btnContent.match(/onclick=/i)) {
      findings.push({ type: 'BUTTON_ONCLICK', file, detail: btnContent.substring(0, 200) });
    }
  }
  
  // Check for form action attributes
  const formMatches = content.matchAll(/<form[^>]*action=["']([^"']*)["'][^>]*>/gi);
  for (const m of formMatches) {
    const action = m[1];
    if (action === '#' || !action) {
      findings.push({ type: 'FORM_BROKEN_ACTION', file, detail: `Form action="${action}"` });
    }
  }
  
  // Check for empty hrefs or javascript:void(0)
  const emptyHrefMatches = content.matchAll(/href=["']([^"']*)["']/gi);
  for (const m of emptyHrefMatches) {
    const href = m[1];
    if (href === '' || href === '#' || href === 'javascript:void(0)' || href === 'javascript:void(0);') {
      // These are likely intentional (scroll to top, etc.) but flag them
      findings.push({ type: 'SUSPICIOUS_HREF', file, detail: `href="${href}"` });
    }
  }
  
  // Check for social media placeholder URLs
  if (content.match(/href=["']#["'][^>]*>(?:IG|YT|TW|Social|Instagram|YouTube|Twitter)/i)) {
    findings.push({ type: 'SOCIAL_PLACEHOLDER', file, detail: 'Social link uses placeholder #' });
  }
  
  // Check form validation - do submit buttons work?
  if (file === 'contact.html') {
    const hasForm = content.match(/<form[^>]*>/i);
    const hasSubmit = content.match(/type=["']submit["']/i);
    const hasValidation = content.match(/required|validate/i);
    if (hasForm && !hasSubmit) {
      findings.push({ type: 'CONTACT_NO_SUBMIT', file, detail: 'Form without submit button' });
    }
  }
  
  // Check page completeness - section counts
  const sections = content.match(/<section/gi);
  const sectionCount = sections ? sections.length : 0;
  if (sectionCount < 2) {
    findings.push({ type: 'PAGE_TOO_SHORT', file, detail: `Only ${sectionCount} sections` });
  }
});

// Output findings
console.log('=== DEEP AUDIT FINDINGS ===\n');
if (findings.length === 0) {
  console.log('No issues found in automated checks.');
} else {
  findings.forEach(f => {
    console.log(`[${f.type}] ${f.file}: ${f.detail}`);
  });
}

// Now specifically check for content depth on each page
console.log('\n=== PAGE CONTENT DEPTH ===\n');
htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1];
    // Count meaningful content elements
    const headings = bodyContent.match(/<h[1-6][^>]*>/gi) || [];
    const paragraphs = bodyContent.match(/<p[^>]*>/gi) || [];
    const lists = bodyContent.match(/<li/gi) || [];
    const divs = bodyContent.match(/<div[^>]*>/gi) || [];
    const sections = bodyContent.match(/<section/gi) || [];
    console.log(`${file}: ${headings.length} headings, ${paragraphs.length} paragraphs, ${lists.length} list items, ${divs.length} divs, ${sections.length} sections`);
  }
});
