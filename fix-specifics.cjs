const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix onClick={... className=
  content = content.replace(/onClick=\{([^}]+)\s+className=/g, 'onClick={$1} className=');
  
  // Fix disabled={... className=
  content = content.replace(/disabled=\{([^}]+)\s+className=/g, 'disabled={$1} className=');
  
  // Fix key={... className=
  content = content.replace(/key=\{([^}]+)\s+className=/g, 'key={$1} className=');
  
  // Fix key={... onClick=
  content = content.replace(/key=\{([^}]+)\s+onClick=/g, 'key={$1} onClick=');
  
  // Fix key={`...-${... -${idx `
  content = content.replace(/key=\{`([^`]+)-\$\{([^}]+)\s*-\$\{idx\s*`/g, 'key={`$1-${$2}-${idx}`}');
  
  // Fix key={`...-${... \`
  content = content.replace(/key=\{`([^`]+)-\$\{([^}]+)\s*`/g, 'key={`$1-${$2}`}');
  
  // Fix key={`${day -${idx `
  content = content.replace(/key=\{`\$\{day\s*-\$\{idx\s*`/g, 'key={`${day}-${idx}`}');
  
  // Fix </div without >
  content = content.replace(/<\/div\s*$/gm, '</div>');
  content = content.replace(/<\/div\s*\n/g, '</div>\n');
  
  // Fix <div : {}}}
  content = content.replace(/<div : \{\}\}\}/g, '<div');
  
  // Fix style={{ '--primary': settings?.primaryColor || '#2563eb' as any >
  content = content.replace(/style=\{\{\s*'--primary':\s*settings\?\.primaryColor\s*\|\|\s*'#2563eb'\s*as\s*any\s*>/g, "style={{ '--primary': settings?.primaryColor || '#2563eb' } as any}>");
  
  // Fix <div }}}>
  content = content.replace(/<div\s*\}\}\}>/g, '<div>');
  content = content.replace(/<div\s*\}\}>/g, '<div>');
  content = content.replace(/<div\s*\}>/g, '<div>');
  
  // Fix <button }}}>
  content = content.replace(/<button\s*\}\}\}>/g, '<button>');
  content = content.replace(/<button\s*\}\}>/g, '<button>');
  content = content.replace(/<button\s*\}>/g, '<button>');
  
  // Fix <tr }}}>
  content = content.replace(/<tr\s*\}\}\}>/g, '<tr>');
  content = content.replace(/<tr\s*\}\}>/g, '<tr>');
  content = content.replace(/<tr\s*\}>/g, '<tr>');
  
  // Fix missing closing braces in some specific lines
  content = content.replace(/boxShadow: `0 15px 30px -5px \$\{settings\?\.primaryColor \|\| '#2563eb'\}55`/g, "boxShadow: `0 15px 30px -5px ${settings?.primaryColor || '#2563eb'}55`}");
  
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
