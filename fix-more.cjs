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
  
  // Fix key={`...`} onClick=
  content = content.replace(/key=\{`([^`]+)`\}\}\s*onClick=/g, 'key={`$1`} onClick=');
  
  // Fix key={`${proc -${idx }`} >
  content = content.replace(/key=\{`\$\{([^}]+)\s*-\$\{idx\s*\}`\}\s*>/g, 'key={`${$1}-${idx}`} >');
  
  // Fix key={`${dept -${idx }`} className=
  content = content.replace(/key=\{`\$\{([^}]+)\s*-\$\{idx\s*\}`\}\s*className=/g, 'key={`${$1}-${idx}`} className=');
  
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
