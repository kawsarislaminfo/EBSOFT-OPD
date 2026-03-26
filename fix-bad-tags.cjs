const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the bad > added by fix-final.cjs
  content = content.replace(/<(div|button|tr|span|p|main|form|input|label|h1|h2|h3|h4|h5|h6|a|img|svg|path|circle|rect|line|polyline|polygon|text|g|defs|clipPath|linearGradient|radialGradient|stop|pattern|mask|filter|feGaussianBlur|feOffset|feMerge|feMergeNode|feComponentTransfer|feFuncA|feFuncR|feFuncG|feFuncB|feBlend|feColorMatrix|feComposite|feConvolveMatrix|feDiffuseLighting|feDisplacementMap|feDropShadow|feFlood|feImage|feMorphology|feSpecularLighting|feTile|feTurbulence)\s*>\n(\s*[a-zA-Z0-9-]+={?)/g, '<$1\n$2');
  
  // Also fix cases where there are multiple attributes on the next line
  content = content.replace(/<(div|button|tr|span|p|main|form|input|label|h1|h2|h3|h4|h5|h6|a|img|svg|path|circle|rect|line|polyline|polygon|text|g|defs|clipPath|linearGradient|radialGradient|stop|pattern|mask|filter|feGaussianBlur|feOffset|feMerge|feMergeNode|feComponentTransfer|feFuncA|feFuncR|feFuncG|feFuncB|feBlend|feColorMatrix|feComposite|feConvolveMatrix|feDiffuseLighting|feDisplacementMap|feDropShadow|feFlood|feImage|feMorphology|feSpecularLighting|feTile|feTurbulence)\s*>\n(\s*[a-zA-Z0-9-]+)/g, '<$1\n$2');

  // Fix key={`stat-proc-${proc-${idx}`} -> key={`stat-proc-${proc}-${idx}`}
  content = content.replace(/key=\{`([^`]+)-\$\{([a-zA-Z0-9_]+)-\$\{idx\}`\}/g, 'key={`$1-${$2}-${idx}`}');
  content = content.replace(/key=\{`([^`]+)-\$\{([a-zA-Z0-9_]+)\}-\$\{idx\}`\}/g, 'key={`$1-${$2}-${idx}`}');
  
  // Fix key={`dept-load-${dept-${idx}`} -> key={`dept-load-${dept}-${idx}`}
  content = content.replace(/key=\{`([^`]+)-\$\{([a-zA-Z0-9_]+)-\$\{idx\}`\}/g, 'key={`$1-${$2}-${idx}`}');

  // Fix key={`log-dash-${log.id`} -> key={`log-dash-${log.id}`}
  content = content.replace(/key=\{`([^`]+)-\$\{([a-zA-Z0-9_.]+)\`\}/g, 'key={`$1-${$2}`}');
  
  // Fix key={`search-${p.id`} -> key={`search-${p.id}`}
  content = content.replace(/key=\{`([^`]+)-\$\{([a-zA-Z0-9_.]+)\`\}/g, 'key={`$1-${$2}`}');

  // Fix key={`${proc-${idx}`} -> key={`${proc}-${idx}`}
  content = content.replace(/key=\{`\$\{([a-zA-Z0-9_]+)-\$\{idx\}`\}/g, 'key={`${$1}-${idx}`}');
  
  // Fix <div} className=
  content = content.replace(/<([a-zA-Z0-9]+)\}\s+className=/g, '<$1 className=');

  // Fix <Loader2} className=
  content = content.replace(/<Loader2\}\s+className=/g, '<Loader2 className=');

  // Fix key={patient.id className=
  content = content.replace(/key=\{([a-zA-Z0-9_.]+)\s+className=/g, 'key={$1} className=');

  // Fix <div : {}}}
  content = content.replace(/<div\s*:\s*\{\}\}\}>/g, '<div>');

  // Fix <div}}}
  content = content.replace(/<div\}\}\}>/g, '<div>');

  // Fix <button}}
  content = content.replace(/<button\}\}>/g, '<button>');

  // Fix <main> ... </main> without closing tag?
  // Wait, I can't easily fix missing closing tags with regex.

  fs.writeFileSync(filePath, content, 'utf8');
}

const filesToProcess = [
  'src/AdminPanel.tsx',
  'src/components/admin/StatCard.tsx',
  'src/components/admin/tabs/DashboardOverview.tsx',
  'src/components/PatientManagement.tsx',
  'src/components/UserManagement.tsx'
];

filesToProcess.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath);
    console.log(`Fixed ${file}`);
  }
});
