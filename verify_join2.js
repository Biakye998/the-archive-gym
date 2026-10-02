const fs = require('fs');
const content = fs.readFileSync('join.html', 'utf8');

console.log('Has IIFE wrapper:', content.includes("(function()"));
console.log('Has try-catch for URLSearchParams:', content.includes('typeof URLSearchParams'));
console.log('Has fallback param parsing:', content.includes('Fallback for older browsers'));
console.log('Has selection-summary CSS rule:', content.includes('.selection-summary'));
console.log('No reveal-up on form-container:', !content.includes('form-container reveal-up'));
console.log('Plan options are labels:', content.includes('label class="plan-option"'));
console.log('Has try-catch wrapper around URLSearchParams:', content.includes('try {'));
console.log('Has null checks before addEventListener:', content.includes('if (toStep2)'));
console.log('Using var instead of const:', !content.match(/<script>[^<]*\n  const /));

// Check for syntax errors
const scripts = [...content.matchAll(/<script>(.*?)<\/script>/gs)];
const inlineScript = scripts[scripts.length - 1][1];
try {
  new Function(inlineScript);
  console.log('\nInline script syntax: OK');
} catch(e) {
  console.log('\nInline script syntax ERROR:', e.message);
}
