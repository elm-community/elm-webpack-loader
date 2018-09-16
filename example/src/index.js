'use strict';

require('./index.html');
var Elm = require('./Main.elm').Elm;

Elm.Main.init({
  node: document.getElementById('main')
});

