import path from 'path';

export default {
  'frontend/src/**/*.{ts,tsx}': (files) => {
    const cwd = path.resolve('frontend');
    const relativePaths = files.map((f) => path.relative(cwd, f).split(path.sep).join('/'));
    return [
      `cd frontend && yarn prettier --write ${relativePaths.join(' ')}`,
      `cd frontend && yarn eslint --no-error-on-unmatched-pattern --fix ${relativePaths.join(' ')}`,
    ];
  },
  'backend/src/**/*.ts': (files) => {
    const cwd = path.resolve('backend');
    const relativePaths = files.map((f) => path.relative(cwd, f).split(path.sep).join('/'));
    return [
      `cd backend && yarn prettier --write ${relativePaths.join(' ')}`,
      `cd backend && yarn eslint --no-error-on-unmatched-pattern --fix ${relativePaths.join(' ')}`,
    ];
  },
};
