import path from 'path';

export default {
  'frontend/src/**/*.{ts,tsx}': (files) => {
    const cwd = path.resolve('frontend');
    const relativePaths = files.map((f) => path.relative(cwd, f).split(path.sep).join('/'));
    return [
      `yarn --cwd frontend prettier --write ${relativePaths.join(' ')}`,
      `yarn --cwd frontend eslint --no-error-on-unmatched-pattern --fix ${relativePaths.join(' ')}`,
    ];
  },
  'backend/src/**/*.ts': (files) => {
    const cwd = path.resolve('backend');
    const relativePaths = files.map((f) => path.relative(cwd, f).split(path.sep).join('/'));
    return [
      `yarn --cwd backend prettier --write ${relativePaths.join(' ')}`,
      `yarn --cwd backend eslint --no-error-on-unmatched-pattern --fix ${relativePaths.join(' ')}`,
    ];
  },
};
