'use strict';

require('./index.html');
var Elm = require('./Main.elm');

Elm.Main.embed(document.getElementById('main'));
