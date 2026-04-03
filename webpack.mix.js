const mix = require('laravel-mix');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

mix.js('resources/src/main.js', 'public')
  .js('resources/src/login.js', 'public')
  .vue();

mix.webpackConfig({
  output: {
    filename: 'js/[name].min.js',
    chunkFilename: 'js/bundle/[name].[hash].js',
  },
  stats: 'errors-only', // Add this if you want minimal output
  plugins: [
    new MomentLocalesPlugin(),
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['./js/*'],
    }),
  ],
});
