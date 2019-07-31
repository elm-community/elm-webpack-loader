'use strict';

require('./index.html');
var Elm = require('./Main').Elm;

var app = Elm.Main.init({
  node: document.getElementById('main')
});
