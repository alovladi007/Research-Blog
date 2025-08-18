const fs = require('fs');
const path = require('path');

console.log('=== Testing File System ===');
console.log('Current directory:', process.cwd());

const componentsPath = path.join(process.cwd(), 'src', 'components', 'ui');
console.log('\nChecking path:', componentsPath);
console.log('Path exists:', fs.existsSync(componentsPath));

if (fs.existsSync(componentsPath)) {
  const files = fs.readdirSync(componentsPath);
  console.log('\nFiles in src/components/ui:');
  files.forEach(file => {
    const filePath = path.join(componentsPath, file);
    const stats = fs.statSync(filePath);
    console.log(`  - ${file} (${stats.size} bytes)`);
  });
} else {
  console.log('ERROR: src/components/ui directory does not exist!');
}

// Check specific file
const alertPath = path.join(componentsPath, 'alert.tsx');
console.log('\n=== Checking alert.tsx ===');
console.log('Path:', alertPath);
console.log('Exists:', fs.existsSync(alertPath));

if (fs.existsSync(alertPath)) {
  const content = fs.readFileSync(alertPath, 'utf8');
  console.log('First 100 chars:', content.substring(0, 100) + '...');
}