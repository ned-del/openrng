module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testTimeout: 60000,
  moduleNameMapper: {
    '^(\\.\\.?/.*)\\.js$': '$1',
  },
};
