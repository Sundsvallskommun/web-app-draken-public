// babel
module.exports = {
  roots: ['<rootDir>/'],
  // "testTimeout": 15000,
  // Add more setup options before each test is run
  setupFiles: ['<rootDir>/.jest/setEnvVars'],
  setupFilesAfterEnv: ['<rootDir>/.jest/setup.js'],
  collectCoverage: true,
  // on node 14.x coverage provider v8 offers good speed and more or less good report
  coverageProvider: 'v8',
  collectCoverageFrom: [
    '<rootDir>/src/services/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/components/**/*.{js,jsx,ts,tsx}',
    '!**/__unused__/**',
  ],
  moduleDirectories: ['node_modules'],
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    // https://jestjs.io/docs/webpack#mocking-css-modules
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle module aliases (this will be automatically configured for you soon)
    '@services/(.*)$': ['<rootDir>/src/services/$1'],
    '@components/(.*)$': ['<rootDir>/src/components/$1'],
    '@interfaces/(.*)$': ['<rootDir>/src/interfaces/$1'],
    '@contexts/(.*)$': ['<rootDir>/src/contexts/$1'],
    '@layouts/(.*)$': ['<rootDir>/src/layouts/$1'],
    '@styles/(.*)$': ['<rootDir>/src/styles/$1'],
    '@utils/(.*)$': ['<rootDir>/src/utils/$1'],
    '@pages/(.*)$': ['<rootDir>/src/pages/$1'],
    '@middlewares/(.*)$': ['<rootDir>/src/utils/middlewares/$1'],
    '@public/(.*)$': ['<rootDir>/public/$1'],
    '@jestRoot/(.*)$': ['<rootDir>/.jest/$1'],
    '@data-contracts/(.*)$': ['<rootDir>/src/data-contracts/$1'],
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    // Use babel-jest to transpile tests with the next/babel preset
    // https://jestjs.io/docs/configuration#transform-objectstring-pathtotransformer--pathtotransformer-object
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: ['next/babel', ['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-react'],
        plugins: ['@babel/plugin-transform-private-methods'],
      },
    ],
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/.jest/fileTransformer.js',
  },
  transformIgnorePatterns: [
    // '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  testRegex: '(/__tests__/.*|(\\.|/)(test))\\.[jt]sx?$', // to exclude 'spec' (cypress uses these in this project)
};
