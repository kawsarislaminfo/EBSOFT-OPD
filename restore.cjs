const { execSync } = require('child_process');

try {
  execSync('git checkout src/AdminPanel.tsx src/components/admin/StatCard.tsx src/components/admin/tabs/DashboardOverview.tsx src/components/PatientManagement.tsx src/components/UserManagement.tsx');
  console.log('Restored files');
} catch (e) {
  console.error(e.message);
}
