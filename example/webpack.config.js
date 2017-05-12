module.exports = {
  entry: './src/index.js',

  output: {
    path: __dirname + '/dist',
    filename: 'index.js'
  },

  resolve: {
    extensions: ['.js', '.elm']
  },

  module: {
    rules: [
      {
        test: /\.html$/,
        exclude: /node_modules/,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]'
          }
        }
      },
      {
        test: /\.elm$/,
        exclude: [/elm-stuff/, /node_modules/],
        use: {
          loader: '../index.js'
        }
      }
    ],

    noParse: /\.elm$/
  },

  devServer: {
    inline: true,
    stats: 'errors-only'
  }
};
