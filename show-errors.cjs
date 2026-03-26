const fs = require('fs');
const { execSync } = require('child_process');

try {
  const output = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  const lines = e.stdout.split('\n');
  const errors = lines.filter(line => line.includes('error TS'));
  
  const files = {};
  errors.forEach(err => {
    const match = err.match(/^([^:]+)\((\d+),(\d+)\):/);
    if (match) {
      const file = match[1];
      const line = parseInt(match[2], 10);
      if (!files[file]) files[file] = [];
      files[file].push(line);
    }
  });

  for (const file in files) {
    console.log(`\n--- ${file} ---`);
    const content = fs.readFileSync(file, 'utf8').split('\n');
    const uniqueLines = [...new Set(files[file])].sort((a, b) => a - b);
    uniqueLines.forEach(line => {
      console.log(`${line}: ${content[line - 1]}`);
    });
  }
}
