const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix <div} className=
  content = content.replace(/<([a-zA-Z0-9]+)\}\s+className=/g, '<$1 className=');
  
  // Fix key={p.id className=
  content = content.replace(/key=\{([^}]+)\s+className=/g, 'key={$1} className=');
  
  // Fix onClick={onClick className=
  content = content.replace(/onClick=\{([^}]+)\s+className=/g, 'onClick={$1} className=');
  
  // Fix disabled={isUpdating className=
  content = content.replace(/disabled=\{([^}]+)\s+className=/g, 'disabled={$1} className=');
  
  // Fix key={`... }`}
  content = content.replace(/key=\{`([^`]+)\s+\}`\}/g, 'key={`$1`}');
  
  // Fix key={`... }-${idx}`}
  content = content.replace(/key=\{`([^`]+)\s+\}-\$\{idx\}`\}/g, 'key={`$1-${idx}`}');
  
  // Fix key={`${day -${idx }`}
  content = content.replace(/key=\{`\$\{day\s*-\$\{idx\s*\}`\}/g, 'key={`${day}-${idx}`}');
  
  // Fix ) />
  content = content.replace(/\)\s*\/>/g, '/>');
  
  // Fix <div \n
  content = content.replace(/<div\s*\n/g, '<div >\n');
  
  // Fix <button \n
  content = content.replace(/<button\s*\n/g, '<button >\n');
  
  // Fix <tr \n
  content = content.replace(/<tr\s*\n/g, '<tr >\n');
  
  // Fix <span \n
  content = content.replace(/<span\s*\n/g, '<span >\n');
  
  // Fix <p \n
  content = content.replace(/<p\s*\n/g, '<p >\n');
  
  // Fix <div} className=
  content = content.replace(/<([a-zA-Z0-9]+)\}\s+className=/g, '<$1 className=');
  
  // Fix <Loader2} className=
  content = content.replace(/<Loader2\}\s+className=/g, '<Loader2 className=');
  
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
