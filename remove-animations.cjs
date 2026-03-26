const fs = require('fs');
const path = require('path');

function removeAnimations(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove motion imports
  content = content.replace(/import\s+\{\s*motion\s*(?:,\s*AnimatePresence\s*)?\}\s+from\s+['"]motion\/react['"];\n?/g, '');
  content = content.replace(/import\s+\{\s*AnimatePresence\s*(?:,\s*motion\s*)?\}\s+from\s+['"]motion\/react['"];\n?/g, '');
  
  // Remove AnimatePresence tags
  content = content.replace(/<AnimatePresence[^>]*>/g, '');
  content = content.replace(/<\/AnimatePresence>/g, '');
  
  // Replace motion.div, motion.tr, motion.button, etc.
  content = content.replace(/<motion\.([a-zA-Z0-9]+)/g, '<$1');
  content = content.replace(/<\/motion\.([a-zA-Z0-9]+)>/g, '</$1');
  
  // Remove framer-motion specific props
  content = content.replace(/\s+initial=\{[^}]+\}/g, '');
  content = content.replace(/\s+animate=\{[^}]+\}/g, '');
  content = content.replace(/\s+exit=\{[^}]+\}/g, '');
  content = content.replace(/\s+transition=\{[^}]+\}/g, '');
  content = content.replace(/\s+whileHover=\{[^}]+\}/g, '');
  content = content.replace(/\s+whileTap=\{[^}]+\}/g, '');
  content = content.replace(/\s+layoutId=["'][^"']+["']/g, '');
  content = content.replace(/\s+layout\b/g, '');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Processed ${filePath}`);
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
    removeAnimations(fullPath);
  }
});
