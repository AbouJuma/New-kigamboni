const mix = require('laravel-mix');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

mix.js('resources/src/main.js', 'public')
  .sass('resources/src/assets/styles/sass/themes/lite-purple.scss', 'public/css', {
    implementation: require('sass')
  })
  .js('resources/src/login.js', 'public')
  .vue();

mix.webpackConfig({
  cache: false,
  output: {
    filename: 'js/[name].min.js',
    chunkFilename: 'js/bundle/[name].[hash].js',
  },
  stats: 'errors-only',
  plugins: [
    new MomentLocalesPlugin(),
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['./js/*'],
    }),
  ],
});
