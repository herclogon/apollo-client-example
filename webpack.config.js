// Copyright (C) DATADVANCE, 2010-2018

const COPYRIGHT_BANNER = 'Copyright (C) DATADVANCE, 2010-2018';
const APP_NAME = 'pSeven 2k';

const fs = require('fs');
const path = require('path');
const rxPaths = require('rxjs/_esm5/path-mapping');

const nodeModules = path.join(process.cwd(), 'node_modules');
const realNodeModules = fs.realpathSync(nodeModules);
const genDirNodeModules = path.join(process.cwd(), 'src', '$$_gendir', 'node_modules');

/**
 * Sort order of bundles load in `index.html`.
 */
const entryPoints = ["inline", "polyfills", "sw-register", "vendor", "globals", "config", "scripts", "main"];
const projectRoot = process.cwd();
const appRoot = path.resolve(__dirname);
let targetPath = path.join(appRoot, 'build');
console.log('targetPath', targetPath);

/**
 * Webpack plugins.
 */
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {
    BannerPlugin,
    ProvidePlugin
} = require('webpack');

/**
 * Webpack configuration.
 *
 * @param options
 * @returns {}
 */
module.exports = function (options) {
    return {
        "resolve": {
            /**
             * An array of extensions that should be used to resolve modules.
             *
             * @see http://webpack.github.io/docs/configuration.html#resolve-extensions
             */
            "extensions": [".ts", ".js"],

            /**
             * An array of directory names to be resolved to the current
             * directory.
             */
            "modules": ["./node_modules",],

            /**
             * Resolve symlinked resources to their real path, not their
             * symlinked location.
             */
            "symlinks": true,

            /**
             * Add rxjs import aliases, uses to import rxjs parts as
             * `rxjs/util/tryCatch`.
             */
            "alias": rxPaths(),

            "mainFields": [
                "browser",
                "module",
                "main"
            ]
        },

        "entry": {
            "main": [
                "./src/main.ts"
            ]
        },

        "output": {
            "path": targetPath,
            "filename": "[name].bundle.js",
            "chunkFilename": "[id].chunk.js",
            "crossOriginLoading": false
        },

        "module": {
            "rules": [
                /**
                 * Support typescript using special Angular loader.
                 * (got from Angular CLI)
                 */
                {
                    test: /\.ts$/,
                    include: path.join(appRoot, 'src'),
                    loader: "ts-loader"
                },

                /**
                 * Support ES6.
                 */
                {
                    test: /\.js$/,
                    include: path.join(appRoot, 'src'),
                    loader: "babel-loader"
                },

                /**
                 * Raw loader support for *.html
                 * Returns file content as a string
                 *
                 * @see: https://github.com/webpack/raw-loader
                 */
                {
                    "test": /\.html$/,
                    "loader": "raw-loader"
                },

                /**
                 * Instructs webpack to emit the required object as file and to
                 * return its public URL for vector resources.
                 */
                {
                    "test": /\.(eot|svg|cur)$/,
                    "loader": "file-loader",
                    "options": {
                        "name": "[name].[hash:20].[ext]",
                        "limit": 10000
                    }
                },

                /**
                 * The url-loader works like the file-loader, but can return
                 * a DataURL if the file is smaller than a byte limit.
                 */
                {
                    "test": /\.(jpg|png|webp|gif|otf|ttf|woff|woff2|ani)$/,
                    "loader": "url-loader",
                    "options": {
                        "name": "[name].[hash:20].[ext]",
                        "limit": 10000
                    }
                },

                /**
                 * Support "future-proof CSS and forget old
                 * preprocessor specific syntax". ;)
                 *
                 * @see http://postcss.org/
                 */
                {
                    "test": /\.css$/,
                    "use": [
                        "exports-loader?module.exports.toString()",
                        {
                            "loader": "css-loader",
                            "options": {
                                "sourceMap": false,
                                "import": false
                            }
                        }
                    ]
                },

                /**
                 * Support of SCSS/SASS.
                 *
                 * @see https://sass-lang.com/
                 */
                {
                    "test": /\.scss$|\.sass$/,
                    "use": [
                        "exports-loader?module.exports.toString()",
                        {
                            "loader": "css-loader",
                            "options": {
                                "sourceMap": false,
                                "import": false
                            }
                        },
                        {
                            "loader": "sass-loader",
                            "options": {
                                "sourceMap": false,
                                "precision": 8,
                                "includePaths": []
                            }
                        }
                    ]
                },

                /**
                 * Support LESS.
                 *
                 * @see http://lesscss.org/
                 */
                {
                    "test": /\.less$/,
                    "use": [
                        "exports-loader?module.exports.toString()",
                        {
                            "loader": "css-loader",
                            "options": {
                                "sourceMap": false,
                                "import": false
                            }
                        },
                        {
                            "loader": "less-loader",
                            "options": {
                                "sourceMap": false
                            }
                        }
                    ]
                },

                /**
                 * Support STYLUS.
                 *
                 * @see http://stylus-lang.com/
                 */
                {
                    "test": /\.styl$/,
                    "use": [
                        "exports-loader?module.exports.toString()",
                        {
                            "loader": "css-loader",
                            "options": {
                                "sourceMap": false,
                                "import": false
                            }
                        },
                        {
                            "loader": "stylus-loader",
                            "options": {
                                "sourceMap": false,
                                "paths": []
                            }
                        }
                    ]
                }
            ]
        },

        "plugins": [
            /**
             * Show progress during build.
             */
            new ProgressPlugin(),

            /**
             * Detect modules with circular dependencies when bundling with
             * webpack. Circular dependencies are often a necessity in complex
             * software, the presence of a circular dependency doesn't always
             * imply a bug, but in the case where you believe a bug exists,
             * this module may help find it.
             */
            new CircularDependencyPlugin({
                "exclude": /(\\|\/)node_modules(\\|\/)/,
                "failOnError": false,
                "onDetected": false,
                "cwd": projectRoot
            }),

            /**
             * Generate `index.html` for distribution, chunks sort by the
             * `entryPoints` variable content.
             */
            new HtmlWebpackPlugin({
                "template": "./src/index.html",
                "filename": "./index.html",
                "hash": false,
                "inject": 'head',
                "compile": true,
                "favicon": false,
                "minify": false,
                "cache": true,
                "showErrors": true,
                "chunks": "all",
                "excludeChunks": [],
                "title": APP_NAME,
                "xhtml": true,
                "chunksSortMode": function sort(left, right) {
                    let leftIndex = entryPoints.indexOf(left.names[0]);
                    let rightindex = entryPoints.indexOf(right.names[0]);
                    if (leftIndex > rightindex) {
                        return 1;
                    }
                    else if (leftIndex < rightindex) {
                        return -1;
                    }
                    else {
                        return 0;
                    }
                }
            }),

            /**
             * Put copyright into bundle files.
             */
            new BannerPlugin(COPYRIGHT_BANNER)
        ],

        /**
         * These options configure whether to polyfill or mock certain Node.js
         * globals and modules. This allows code originally written for the
         * Node.js environment to run in other environments like the browser.
         *
         * (got from Angular CLI)
         */
        "node": {
            "fs": "empty",
            "global": true,
            "crypto": "empty",
            "tls": "empty",
            "net": "empty",
            "process": true,
            "module": false,
            "clearImmediate": false,
            "setImmediate": false
        },

        /**
         * Common webpack watch parameters, uses when webpack runs
         * with `--watch` parameter.
         */
        watchOptions: {
            aggregateTimeout: 300,
            poll: 1000,
            ignored: ["node_modules/", "build/", "third-party/"]
        }
    }
};
