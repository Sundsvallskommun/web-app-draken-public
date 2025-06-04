const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const frontendPath = path.resolve(__dirname, '../frontend');
const outputPath = path.join(frontendPath, 'public', 'deploy-info.json');

const commit = execSync('git rev-parse HEAD').toString().trim();
const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const updatedAt = new Date().toISOString();
const GITHUB_REPO_URL = 'https://github.com/Sundsvallskommun/web-app-draken-public';

const content = {
  commit,
  branch,
  updatedAt,
  commitUrl: `${GITHUB_REPO_URL}/commit/${commit}`
};

fs.writeFileSync(outputPath, JSON.stringify(content, null, 2));