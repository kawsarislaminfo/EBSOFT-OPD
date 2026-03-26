const fs = require('fs');
const content = fs.readFileSync('src/AdminPanel.tsx', 'utf8');
const lines = content.split('\n');
const start = 3789;
const end = 5169;

let tags = [];
for (let i = start; i < end; i++) {
  const line = lines[i];
  let match;
  const regex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
  while ((match = regex.exec(line)) !== null) {
    if (line.includes('/>') && match[0].endsWith('/>')) continue;
    if (match[0].startsWith('</')) {
      const last = tags.pop();
      if (!last || last.name !== match[1]) {
        console.log(`Mismatch at line ${i + 1}: expected </${last ? last.name : 'none'}> but got ${match[0]}`);
      }
    } else {
      tags.push({ name: match[1], line: i + 1 });
    }
  }
}
console.log('Remaining tags:', tags);
