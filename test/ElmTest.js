'use strict';

var grunt = require('grunt');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

function testFixture(test, filenames, expectedMessage) {
  test.expect(1);

  var result = grunt.file.read('tmp/testOutput.js');

  test.equal(result.length > 100, true);

  test.done();
}

exports.elm = {
  setUp: function(done) {
    // setup here if necessary
    done();
  },
  oneFile: function(test) {
    testFixture(test, ["TestHelloWorld.js"]);
  },
  twoFiles: function(test) {
    testFixture(test, ["TestA.js", "TestB.js"]);
  },
};
