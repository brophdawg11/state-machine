const path = require('path');

const minify = process.env.STATE_MACHINE_MINIFY === 'true';

module.exports = {
    mode: 'production',
    devtool: minify ? 'source-map' : 'none',
    entry: './src/state-machine.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: minify ? 'state-machine.min.js' : 'state-machine.js',
        library: 'StateMachine',
        libraryTarget: 'umd',
    },
    optimization: {
        ...(!minify ? { minimize: false } : {}),
    },
};
