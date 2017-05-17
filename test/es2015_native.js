/*jshint esversion: 6*/
var assert = require('assert'), timezonedDate = require('../');

module.exports = function() {
    describe('Subclassing', function() {
        it('should assign the correct prototype', function() {
            var DateUTC = timezonedDate.makeConstructor(0);
            class ExtendedDateUTC extends DateUTC {
                foo() {
                    return 'foo';
                }
            }
            var instance = new ExtendedDateUTC();
            assert.equal(typeof ExtendedDateUTC.parse, 'function');
            assert.equal(typeof instance.foo, 'function');
            assert.equal(instance.getTimezoneOffset(), 0);
            class ExtendedExtendedDateUTC extends ExtendedDateUTC {}
            instance = new ExtendedExtendedDateUTC();
            assert.equal(typeof ExtendedDateUTC.parse, 'function');
            assert.equal(typeof instance.foo, 'function');
            assert.equal(instance.getTimezoneOffset(), 0);
        });
    });
};
