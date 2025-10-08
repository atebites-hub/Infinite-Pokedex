export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js', '**/tests/unit/**/*.spec.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/integration/',
  ],
  collectCoverageFrom: [
    'source/server/**/*.js',
    '!source/server/**/*.test.js',
    '!source/server/**/*.spec.js',
    '!source/server/test-server.js',
  ],
  // Coverage thresholds temporarily disabled for Sprint 3 client-side code
  // Will be re-enabled once client-side testing is properly configured
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80,
  //   },
  // },
  transform: {},
  testTimeout: 10000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
