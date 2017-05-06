var path = require('path');

module.exports = {
  entry: './src/index.js',

  output: {
      path: path.join(__dirname, "dist"),
      filename: 'index.js'
  },

  resolve: {
    modules: [
      path.join(__dirname, "src"),
      "node_modules"
    ],
    extensions: ['.js', '.elm']
  },

  module: {
    loaders: [{
        test: /\.html$/,
        exclude: /node_modules/,
        loader: 'file-loader?name=[name].[ext]'
      },
      {
        test: /\.elm$/,
        exclude: [/elm-stuff/, /node_modules/],
        // This is what you need in your own work
        // loader: "elm-webpack-loader",
        loader: '../index.js',
        options: {
          debug: true,
          warn: true
        }
      }
    ]
  },

  devServer: {
    inline: true,
    stats: 'errors-only'
  }
};
