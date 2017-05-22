'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _path = require('path');

//This config needed to be able to import components from outside of examples-storybook-firebase3/src

var config = {
    module: {
        loaders: [{
            loader: 'babel',
            test: /\.jsx?$/,
            exclude: /node_modules/,
            query: {
                presets: [
                    require.resolve('babel-preset-react'),
                    require.resolve('babel-preset-es2015')
                ]
            }
        }, {
            test: /\.(gif|jpe?g|png|svg)$/,
            loader: 'url-loader',
            query: { name: '[name].[hash:16].[ext]' }
        }, {
            test: /\.css?$/,
            //include: includePaths,
            loaders: [
                require.resolve('style-loader'),
                require.resolve('css-loader'),
                require.resolve('postcss-loader'),
            ]
        }]
    },
    resolve: {
        root: [
            _path.resolve(__dirname, '../node_modules')
        ]
    },
    resolveLoader: {
        root: [
            _path.resolve(__dirname, '../node_modules')
        ]
    }
};

module.exports = config;
