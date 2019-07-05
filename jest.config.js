module.exports = {
    clearMocks: true,
    collectCoverage: true,
    coverageReporters: ['html', 'text'],
    coverageThreshold: {
        global: {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95,
        },
    },
    testEnvironment: 'node',
    silent: true,
    verbose: true,
};
