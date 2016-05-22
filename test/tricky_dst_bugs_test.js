var assert = require("assert"),
    TimezonedDate = require('../');

describe('DST bugs', function() {

    "use strict";

    var constructors;

    beforeEach(function() {
        constructors = [
            TimezonedDate.makeConstructor(0),
            TimezonedDate.makeConstructor(-12 * 60),
            TimezonedDate.makeConstructor(5 * 60 + 30),
            TimezonedDate.makeConstructor(7 * 60 + 45)
        ];
    });

    it('should not happen on creating instances for any day and hour', function() {
        for (var day = 0; day < 366; day++) {
            for (var h = 0; h < 24; h++) {
                for (var i = 0; i < constructors.length; i++) {
                    var instance = new constructors[i](2016, 0, day, h);
                    assert.equal(instance.getHours(), h, instance.toString());
                }
            }
        }
    });

    it('should not happen with setHours', function() {
        for (var day = 0; day < 366; day++) {
            for (var h = 0; h < 24; h++) {
                for (var i = 0; i < constructors.length; i++) {
                    var instance = new constructors[i](2015, 0, day);
                    assert.equal(instance.getHours(), 0);
                    instance.setHours(h);
                    assert.equal(instance.getHours(), h);
                    assert.equal(new constructors[i](instance.toString()).getHours(), h, instance.toString());
                }
            }
        }
    });
});