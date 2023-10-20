const { resolve } = require('path');

/**
 * @type {import('webpack').Configuration}
 */
const bundle = {
  entry: resolve(process.cwd(), 'src/scripts/js/index.js'),
  mode: 'development',
  output: {
    path: resolve(process.cwd(), 'theme/assets'),
    filename: 'webpack-bundle.js'
  },
  infrastructureLogging: {
    level: 'verbose',
    colors: true // NOTE: need to inform the docs about this
  }
};

module.exports = bundle;
