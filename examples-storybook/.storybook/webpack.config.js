'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var managerEntry = process.env.DEV_BUILD ? _path2.default.resolve(__dirname, '../../src/client/manager') : _path2.default.resolve(__dirname, '../manager');

console.log(_path.resolve(__dirname, '../node_modules'));
console.log(_path.resolve(__dirname, '../../examples/chat/src/node_modules'));

var config = {
    devtool: '#cheap-module-eval-source-map',
    entry: {
        manager: [managerEntry],
        preview: [_path2.default.resolve(__dirname, './error_enhancements'), 'webpack-hot-middleware/client']
    },
    output: {
        path: _path2.default.join(__dirname, 'dist'),
        filename: '[name].bundle.js',
        publicPath: '/static/'
    },
    plugins: [new _webpack2.default.optimize.OccurenceOrderPlugin(), new _webpack2.default.HotModuleReplacementPlugin()],
    module: {
        loaders: [{
            loader: 'babel',
            test: /\.jsx?$/,
            exclude: /node_modules/,
            query: {
                presets: ['react','es2015']
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
    }
};

module.exports = config;
