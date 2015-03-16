Elm.TestHelloWorld = Elm.TestHelloWorld || {};
Elm.TestHelloWorld.make = function (_elm) {
   "use strict";
   _elm.TestHelloWorld = _elm.TestHelloWorld || {};
   if (_elm.TestHelloWorld.values)
   return _elm.TestHelloWorld.values;
   var _op = {},
   _N = Elm.Native,
   _U = _N.Utils.make(_elm),
   _L = _N.List.make(_elm),
   _A = _N.Array.make(_elm),
   _E = _N.Error.make(_elm),
   $moduleName = "TestHelloWorld",
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $Text = Elm.Text.make(_elm);
   var main = $Text.plainText("Hello, World! This is a test of grunt-elm.");
   _elm.TestHelloWorld.values = {_op: _op
                                ,main: main};
   return _elm.TestHelloWorld.values;
};