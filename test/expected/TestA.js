Elm.TestA = Elm.TestA || {};
Elm.TestA.make = function (_elm) {
   "use strict";
   _elm.TestA = _elm.TestA || {};
   if (_elm.TestA.values)
   return _elm.TestA.values;
   var _op = {},
   _N = Elm.Native,
   _U = _N.Utils.make(_elm),
   _L = _N.List.make(_elm),
   _A = _N.Array.make(_elm),
   _E = _N.Error.make(_elm),
   $moduleName = "TestA",
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $Text = Elm.Text.make(_elm);
   var main = $Text.plainText("This should say 5: ");
   _elm.TestA.values = {_op: _op
                       ,main: main};
   return _elm.TestA.values;
};Elm.TestDependency = Elm.TestDependency || {};
Elm.TestDependency.Foo = Elm.TestDependency.Foo || {};
Elm.TestDependency.Foo.make = function (_elm) {
   "use strict";
   _elm.TestDependency = _elm.TestDependency || {};
   _elm.TestDependency.Foo = _elm.TestDependency.Foo || {};
   if (_elm.TestDependency.Foo.values)
   return _elm.TestDependency.Foo.values;
   var _op = {},
   _N = Elm.Native,
   _U = _N.Utils.make(_elm),
   _L = _N.List.make(_elm),
   _A = _N.Array.make(_elm),
   _E = _N.Error.make(_elm),
   $moduleName = "TestDependency.Foo",
   $Basics = Elm.Basics.make(_elm);
   var multiplyStuff = F2(function (foo,
   bar) {
      return foo * bar;
   });
   var addStuff = F2(function (foo,
   bar) {
      return foo + bar;
   });
   _elm.TestDependency.Foo.values = {_op: _op
                                    ,addStuff: addStuff
                                    ,multiplyStuff: multiplyStuff};
   return _elm.TestDependency.Foo.values;
};