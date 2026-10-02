const fs = require('fs');
const path = require('path');

const pages = [
  'index.html',
  'training.html',
  'strength.html',
  'personal-training.html',
  'group-training.html',
  'recovery.html',
  'membership.html',
  'core.html',
  'performance.html',
  'archive.html',
  'about.html',
  'trainers.html',
  'contact.html',
  'contact.html',
];

const buttonTexts = {
  'index.html': ['Explore Programs', 'View Training', 'Select Plan', 'All Plans', 'Apply', 'View Plan', 'Learn More', 'Get Started', 'Contact', 'Join', 'See Coaches'],
  'training.html': ['Explore', 'Apply', 'Learn More'],
  'strength.html': ['Apply', 'Join', 'Back', 'Continue', 'Get Started'],
  'personal-training.html': ['Apply', 'Join', 'Back', 'Continue', 'Get Started'],
  'group-training.html': ['Apply', 'Join', 'Back', 'Continue', 'Get Started'],
  'recovery.html': ['Apply', 'Join', 'Back', 'Continue', 'Get Started'],
  'membership.html': ['Select', 'Apply', 'Learn More'],
  'core.html': ['Apply', 'Join', 'Back'],
  'performance.html': ['Apply', 'Join', 'Back'],
  'archive.html': ['Apply', 'Join', 'Back'],
  'about.html': ['Contact', 'Join', 'Apply', 'Learn More'],
  'trainers.html': ['Contact', 'Apply', 'Join'],
  'contact.html': ['Submit', 'Send'],
};

console.log('=== BUTTON AND LINK AUDIT ===\n');

pages.forEach(page => {
  if (!fs.existsSync(page)) {
    console.log(`${page}: FILE MISSING!`);
    return;
  }
  
  const content = fs.readFileSync(page, 'utf8');
  
  // Find all buttons with id or class containing relevant identifiers
  const buttons = [...content.matchAll(/<button[^>]*id="([^"]*)"[^>]*>([^<]*)<\/button>/gi)];
  const links = [...content.matchAll(/<a[^>]*href="([^"#]*)"[^>]*>([^<]*)<\/a>/gi)];
  
  console.log(`\n--- ${page} ---`);
  
  if (buttons.length > 0) {
    console.log('Buttons:');
    buttons.forEach(b => {
      const id = b[1];
      const text = b[2].trim();
      if (text && page !== 'join.html') {
        console.log(`  [${id}] "${text}"`);
      }
    });
  }
  
  if (links.length > 0) {
    console.log('Links (filtered):');
    links.forEach(l => {
      const href = l[1];
      const text = l[2].trim();
      // Show links that are not just navigation (HOME, TRAINING, etc.)
      if (text.toLowerCase().match(/apply|join|learn|explore|select|get started|view|see|discover|back|continue|submit|send|start/i) && 
          !href.startsWith('http') && !href.startsWith('#')) {
        console.log(`  -> ${href} | "${text}"`);
      }
    });
  }
});
