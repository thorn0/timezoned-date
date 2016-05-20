"use strict";

var assert = require("assert"),
    TimezonedDate = require('../');

describe('A bound constructor', function() {

    it('should be created with makeConstructor', function() {
        var Date0 = TimezonedDate.makeConstructor(0);
        assert.ok(typeof Date0 === 'function');
    });

    it('may be called without arguments', function() {
        var Date0 = TimezonedDate.makeConstructor(0);
        assert.doesNotThrow(function() {
            new Date0();
        });
    });

    it('should create instances that are instanceof Date', function() {
        var Date0 = TimezonedDate.makeConstructor(0);
        var date0 = new Date0();
        assert.ok(date0 instanceof Date0);
        assert.ok(date0 instanceof Date);
    });

    it('should create correct instances for any day and hour without DST bugs', function() {
        var Date0 = TimezonedDate.makeConstructor(0);
        for (var day = 0; day < 366; day++) {
            for (var h = 0; h < 24; h++) {
                var instance = new Date0(2015, 0, day, h);
                assert.equal(instance.getHours(), h, instance.toString());
            }
        }
    });

});

describe('An instance of a bound constructor', function() {
    it('should work correctly on the DST switch dates of the system TZ', function() {
        var Date0 = TimezonedDate.makeConstructor(0);
        for (var day = 0; day < 366; day++) {
            for (var h = 0; h < 24; h++) {
                var date = new Date0(2015, 0, day);
                assert.equal(date.getHours(), 0);
                date.setHours(h);
                assert.equal(date.getHours(), h);
                assert.equal(new Date0(date.toString()).getHours(), h, date.toString());
            }
        }
    });
});