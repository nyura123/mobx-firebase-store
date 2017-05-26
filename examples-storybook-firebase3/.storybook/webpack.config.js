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
                    require.resolve('babel-preset-es2015'),
                    require.resolve('babel-preset-stage-2')
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
        }, {
            loader: 'babel',
            test: /\.jsx?$/,
            include: [
                /node_modules\/react-native-/,
                /node_modules\/@expo\/react-native-/,
                /node_modules\/react-clone-referenced-element/
            ],
            query: {
                presets: [
                    require.resolve('babel-preset-react-native')
                ]
            }
        }, {
            test: /\.(gif|jpe?g|png|svg)$/,
            loader: 'url-loader',
            query: {
                name: '[name].[hash:16].[ext]'
            }
        }]
    },
    resolve: {
        root: [
            _path.resolve(__dirname, '../node_modules')
        ],
        alias: {
            'react-native': 'react-native-web',
            '@expo/react-native-action-sheet': _path.resolve(__dirname, '../../examples/gifted-chat-component/ActionSheet')
        },
        // If you're working on a multi-platform React Native app, web-specific
        // module implementations should be written in files using the extension
        // `.web.js`.
        extensions: [ '', '.web.js', '.js' ]
    },
    resolveLoader: {
        root: [
            _path.resolve(__dirname, '../node_modules')
        ]
    }
};

module.exports = config;
