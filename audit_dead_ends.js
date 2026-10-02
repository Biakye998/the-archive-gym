const fs = require('fs');
const path = require('path');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

console.log('=== DEAD-END LINK SCAN ===\n');

let deadEnds = [];

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, i) => {
    // Check for href="#" or href="javascript:void(0)"
    if (line.match(/href=["']#["']/) || line.match(/href=["']javascript:void\(0\)/)) {
      deadEnds.push({
        file,
        line: i + 1,
        content: line.trim().substring(0, 150)
      });
    }
  });
});

if (deadEnds.length === 0) {
  console.log('No dead-end href="#" or javascript:void(0) links found.');
} else {
  console.log('Dead-end links found:');
  deadEnds.forEach(d => {
    console.log('  ' + d.file + ' line ' + d.line + ': ' + d.content);
  });
}

// Also check for empty forms (no action, no submit)
console.log('\n=== FORM CHECK ===\n');

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find all forms
  const formMatches = [...content.matchAll(/<form([^>]*)>([\s\S]*?)<\/form>/gi)];
  
  formMatches.forEach((m, i) => {
    const formAttrs = m[1];
    const formData = m[2];
    
    // Check if form has a submit button or submit handler
    var hasSubmit = formData.includes('type="submit"');
    var hasAction = formAttrs.includes('action=');
    var hasOnSubmit = formAttrs.includes('onsubmit=') || formData.includes('addEventListener') && formData.includes('submit');
    
    if (!hasSubmit && !hasOnSubmit) {
      console.log(file + ': Form #' + i + ' has NO submit button or handler!');
    }
    
    if (!hasAction) {
      console.log(file + ': Form #' + i + ' has no action attribute (may rely on JS)');
    }
  });
});

// Check for pages with very little content
console.log('\n=== CONTENT DEPTH CHECK ===\n');

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  
  if (!bodyMatch) {
    console.log(file + ': Missing </body> tag!');
    return;
  }
  
  const bodyContent = bodyMatch[1];
  
  // Count meaningful content - check if page is mostly template (nav + footer)
  var contentLength = bodyContent.replace(/^\s+/g, '').replace(/\s+$/g, '').length;
  
  // Check if page only has hero + footer (minimal content)
  var sections = bodyContent.match(/<section/gi) || [];
  var hasForm = bodyContent.includes('<form');
  var hasContent = bodyContent.includes('<p class="body-text"');
  var hasHeading = bodyContent.match(/<h[1-3]/i);
  
  if (sections.length <= 1 && !hasForm && file !== 'index.html') {
    // Might be a minimal page - check content length
    if (contentLength < 2000) {
      console.log(file + ': Only ' + sections.length + ' sections, content length: ' + contentLength + ' chars');
    }
  }
});

// Summary
console.log('\n=== SUMMARY ===');
console.log('Dead-end links: ' + deadEnds.length);
console.log('Total HTML files: ' + htmlFiles.length);
console.log('All files have </body>: ' + htmlFiles.every(f => fs.readFileSync(f, 'utf8').includes('</body>')));
