const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
module.exports = {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? 'source-map' : 'inline-source-map',
    entry: './src/state-machine.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'state-machine.js',
        library: 'StateMachine',
        libraryTarget: 'umd',
    },
};
