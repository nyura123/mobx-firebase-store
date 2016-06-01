var webpack = require('webpack');

module.exports = {
    //hot reloading: webpack-dev-server -d --history-api-fallback
    entry: './src/index.js',
    output: {
        filename: './dist/bundle.js',
        sourceMapFilename: './dist/bundle.map'
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': JSON.stringify('development')
            }
        })
    ],
    devtool: '#source-map',
    module: {
        loaders: [
            {
                loader: 'babel',
                test: /\.js?$/,
                exclude: /node_modules/,
                query: {
                    presets: ['react','es2015','stage-2']
                }
            }
        ]
    }
};
