export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],
  collectCoverageFrom: [
    'source/client/js/**/*.js',
    'source/server/**/*.js',
    '!source/client/js/**/*.test.js',
    '!source/client/js/**/*.spec.js',
    '!source/server/**/*.test.js',
    '!source/server/**/*.spec.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {},
  testTimeout: 10000,
};
