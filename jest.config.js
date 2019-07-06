module.exports = {
    clearMocks: true,
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.js'],
    coverageReporters: ['html', 'text'],
    coverageThreshold: {
        global: {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95,
        },
    },
    silent: true,
    testEnvironment: process.env.JEST_TEST_ENVIRONMENT || 'jsdom',
    verbose: true,
};
