var assert = require("assert"),
    TimezonedDate = require('../');

describe('new TimezonedDate', function() {

    "use strict";

    it('requires at least one argument', function() {
        assert.throws(
            function() {
                new TimezonedDate();
            },
            TypeError
        );
    });

    it('requires an offset that can be converted to a Number', function() {
        assert.throws(
            function() {
                new TimezonedDate('foo');
            },
            TypeError
        );
    });

    it('accepts a number offset', function() {
        assert.doesNotThrow(function() {
            new TimezonedDate(-400);
        });
    });

    it('accepts an offset that responds to valueOf', function() {
        var offset = {
            valueOf: function() {
                return 240;
            }
        };
        assert.doesNotThrow(function() {
            new TimezonedDate(offset);
        });
    });

    describe('with a Date and an offset', function() {
        it('returns the same moment in time in the given offset', function() {
            var date = new Date("2008-11-22T12:00:00Z"),
                inTokyo = new TimezonedDate(date, 540);
            assert.equal(inTokyo.getTime(), date.getTime());
            assert.equal(inTokyo.getHours(), 21);
        });
    });

    describe('with a timestamp and an offset', function() {
        it('returns the same moment in time in the given offset', function() {
            var timestamp = (new Date("2008-11-22T12:00:00Z")).getTime(),
                inTokyo = new TimezonedDate(timestamp, 540);
            assert.equal(inTokyo.getTime(), timestamp);
            assert.equal(inTokyo.getHours(), 21);
        });
    });

    describe('with a GMT date string and an offset', function() {
        it('returns the same moment in time in the given offset', function() {
            var isoString = "2008-11-22T12:00:00.000Z",
                inTokyo = new TimezonedDate(isoString, 540);
            assert.equal(inTokyo.toISOString(), isoString);
            assert.equal(inTokyo.getHours(), 21);
        });
    });

    describe('with a local date string and an offset', function() {
        it('treats the time as local to the given offset', function() {
            var inTokyo = new TimezonedDate('Nov 22 2008 21:00:00', 540);
            assert.equal(inTokyo.toISOString(), '2008-11-22T12:00:00.000Z');
            assert.equal(inTokyo.getHours(), 21);
        });
    });

    describe('with year, month, day, hours, minutes, and an offset', function() {
        it('treats the time as local to the given offset', function() {
            var inTokyo = new TimezonedDate(2008, 10, 22, 21, 0, 540);
            assert.equal(inTokyo.toISOString(), '2008-11-22T12:00:00.000Z');
            assert.equal(inTokyo.getHours(), 21);
        });
    });

});