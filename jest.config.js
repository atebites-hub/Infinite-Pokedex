export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],
  collectCoverageFrom: [
    'source/client/js/**/*.js',
    '!source/client/js/**/*.test.js',
    '!source/client/js/**/*.spec.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
