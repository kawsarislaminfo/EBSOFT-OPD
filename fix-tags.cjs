const fs = require('fs');
const path = require('path');

function fixTags(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/<div\s*\}\}\}/g, '<div');
  content = content.replace(/<div\s*\}\}/g, '<div');
  content = content.replace(/<div\s*\}/g, '<div');
  
  content = content.replace(/<button\s*\}\}\}/g, '<button');
  content = content.replace(/<button\s*\}\}/g, '<button');
  content = content.replace(/<button\s*\}/g, '<button');
  
  content = content.replace(/<tr\s*\}\}\}/g, '<tr');
  content = content.replace(/<tr\s*\}\}/g, '<tr');
  content = content.replace(/<tr\s*\}/g, '<tr');
  
  content = content.replace(/key=\{([^}]+)\}\}+/g, 'key={$1}');
  content = content.replace(/className="([^"]+)"\}+/g, 'className="$1"');
  
  content = content.replace(/<div : \{\}\}\}/g, '<div');
  content = content.replace(/<div \}\}/g, '<div');
  
  // Fix any remaining `}}}` or `}}` that are just floating inside tags
  // For example: `<div }}}>` -> `<div>`
  content = content.replace(/<div[^>]*>/g, (match) => {
    return match.replace(/\s*\}\}\}\s*/g, ' ').replace(/\s*\}\}\s*/g, ' ').replace(/\s*\}\s*/g, ' ');
  });
  content = content.replace(/<button[^>]*>/g, (match) => {
    return match.replace(/\s*\}\}\}\s*/g, ' ').replace(/\s*\}\}\s*/g, ' ').replace(/\s*\}\s*/g, ' ');
  });
  content = content.replace(/<tr[^>]*>/g, (match) => {
    return match.replace(/\s*\}\}\}\s*/g, ' ').replace(/\s*\}\}\s*/g, ' ').replace(/\s*\}\s*/g, ' ');
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
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
    fixTags(fullPath);
  }
});
