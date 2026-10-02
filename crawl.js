const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

// Extract all hrefs from an HTML file, excluding external URLs and email
function extractLinks(htmlContent, filename) {
  const links = [];
  // Match href="..." in various quote styles
  const regex = /href=["']([^"']*)["']/g;
  let match;
  while ((match = regex.exec(htmlContent)) !== null) {
    const href = match[1].trim();
    if (!href) continue;
    // Skip empty, javascript, mailto, tel, external URLs
    if (href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http://') || href.startsWith('https://')) continue;
    links.push({ href, sourceFile: filename });
  }
  return links;
}

// Check if a destination file exists
function destinationExists(href) {
  // Remove query strings and hash fragments
  const cleanHref = href.split('?')[0].split('#')[0];
  if (!cleanHref) return { exists: true, target: 'same-page' };
  const fullPath = path.join(ROOT, cleanHref);
  return { exists: fs.existsSync(fullPath), target: cleanHref };
}

// Build the link map
const allLinks = [];
const brokenLinks = [];

console.log('=== EXTRACTING ALL LINKS FROM ALL PAGES ===\n');

htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const links = extractLinks(content, file);
  
  console.log(`\n--- ${file} ---`);
  console.log(`  Found ${links.length} links`);
  
  links.forEach(link => {
    const dest = destinationExists(link.href);
    const status = dest.exists ? '✓' : '✗ MISSING';
    console.log(`  ${status} ${link.href}`);
    
    allLinks.push({
      source: file,
      href: link.href,
      exists: dest.exists,
      target: dest.target
    });
    
    if (!dest.exists) {
      brokenLinks.push({
        source: file,
        href: link.href
      });
    }
  });
});

// Summary
console.log('\n\n=== SUMMARY ===');
console.log(`Total links found: ${allLinks.length}`);
console.log(`Links with valid destinations: ${allLinks.filter(l => l.exists).length}`);
console.log(`Broken links: ${brokenLinks.length}`);

if (brokenLinks.length > 0) {
  console.log('\n=== BROKEN LINKS ===');
  brokenLinks.forEach(b => {
    console.log(`  ${b.source} → ${b.href}`);
  });
}

// Build recursive journey map
console.log('\n\n=== UNIQUE DESTINATION PAGES ===');
const uniques = [...new Set(allLinks.map(l => l.target))].sort();
uniques.forEach(u => {
  const exists = u === 'same-page' || fs.existsSync(path.join(ROOT, u));
  console.log(`  ${exists ? '✓' : '✗'} ${u}`);
});
