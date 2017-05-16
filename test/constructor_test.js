var assert = require('assert'), timezonedDate = require('../');

describe('Constructor', function() {
    'use strict';
    it('should be created with makeConstructor', function() {
        var Date0 = timezonedDate.makeConstructor(0);
        assert.ok(typeof Date0 === 'function');
    });

    it('.parse(string) method', function() {
        var DateUTC = timezonedDate.makeConstructor(0);
        var values = [
            ['2013-12-11', '2013-12-11'],
            ['2013-12-11T22:00', '2013-12-11T22:00'],
            ['May 12 2016', '2016-05-12'],
            ['12 May 2016', '2016-05-12'],
            ['April 25 1986 23:23', '1986-04-25T23:23:00Z'],
            ['April 26 1986 01:23 GMT+0200', '1986-04-25T23:23:00Z'],
            [
                {
                    toString: function() {
                        return '2013-12-11';
                    },
                    valueOf: function() {
                        return '2017-12-11';
                    }
                },
                '2013-12-11'
            ],
            [new Date('2015-04-03T12:12:12.122Z'), '2015-04-03T12:12:12.000Z'],
            [new DateUTC('2015-04-03T12:12:12.122Z'), '2015-04-03T12:12:12.000Z']
        ];
        values.forEach(function(pair, number) {
            var errorMsg = 'value #' + (number + 1) + ' of ' + values.length + ': ' + String(pair[0]);
            assert.equal(DateUTC.parse(pair[0]), Date.parse(pair[1]), errorMsg);
        });
    });

    describe('and is called with', function() {
        var TzDate;
        beforeEach(function() {
            TzDate = timezonedDate.makeConstructor(540);
        });

        var instance;

        describe('no parameters', function() {
            it('returns current time in the given offset', function() {
                instance = new TzDate();
                var diff = new Date() - instance;
                assert.ok(0 <= diff && diff < 5000);
            });
        });

        describe('a Date', function() {
            it('returns the same moment in time in the given offset', function() {
                var date = new Date('2008-11-22T12:00:00Z');
                instance = new TzDate(date);
                assert.equal(instance.getTime(), date.getTime());
                assert.equal(instance.getHours(), 21);
                assert.equal(instance.getMinutes(), 0);
            });
        });

        describe('a timezoned Date', function() {
            it('returns the same moment in time in the given offset', function() {
                var ParisDate = timezonedDate.makeConstructor(60);
                var date = new ParisDate('2008-11-22T12:00:00Z');
                instance = new TzDate(date);
                assert.equal(instance.getTime(), date.getTime());
                assert.equal(instance.getHours(), 21);
                assert.equal(instance.getMinutes(), 0);
            });
        });

        describe('a timestamp', function() {
            it('returns the same moment in time in the given offset', function() {
                var timestamp = new Date('2008-11-22T12:00:00Z').getTime();
                instance = new TzDate(timestamp);
                assert.equal(instance.getTime(), timestamp);
                assert.equal(instance.getHours(), 21);
            });
        });

        describe('a GMT date string', function() {
            it('returns the same moment in time in the given offset', function() {
                var isoString = '2008-11-22T12:00:00.000Z';
                instance = new TzDate(isoString);
                assert.equal(instance.toISOString(), isoString);
                assert.equal(instance.getHours(), 21);
            });
            it('uses valueOf if the parameter is an object which has both valueOf and toString', function() {
                var isoString = '2008-11-22T12:00:00.000Z';
                instance = new TzDate({
                    valueOf: function() {
                        return isoString;
                    },
                    toString: function() {
                        return 'foo bar';
                    }
                });
                assert.equal(instance.toISOString(), isoString);
                assert.equal(instance.getHours(), 21);
            });
        });

        describe('a local date string', function() {
            it('treats the time as local to the given offset', function() {
                instance = new TzDate('Nov 22 2008 21:00:00');
                assert.equal(instance.toISOString(), '2008-11-22T12:00:00.000Z');
                assert.equal(instance.getHours(), 21);
            });
        });

        describe('a "YYYY-MM-DD" date string', function() {
            it('treats the time as midnight UTC', function() {
                instance = new TzDate('2008-11-22');
                assert.equal(instance.toISOString(), '2008-11-22T00:00:00.000Z');
                assert.equal(instance.getHours(), 9);
            });
        });

        describe('a "YYYY-MM-DDT..." date/time string', function() {
            it('returns an invalid date if the format is YYYY-MM-DDThh', function() {
                instance = new TzDate('2008-11-22T12');
                assert.equal(instance.toString(), 'Invalid Date');
            });
            it('treats the time as UTC if the format is YYYY-MM-DDThh:mm', function() {
                instance = new TzDate('2008-11-22T12:13');
                assert.equal(instance.toISOString(), '2008-11-22T12:13:00.000Z');
                assert.equal(instance.getHours(), 21);
            });
            it('treats the time as UTC if the format is YYYY-MM-DDThh:mm:ss', function() {
                instance = new TzDate('2008-11-22T12:13:14');
                assert.equal(instance.toISOString(), '2008-11-22T12:13:14.000Z');
                assert.equal(instance.getHours(), 21);
            });
            it('treats the time as UTC if the format is YYYY-MM-DDThh:mm:ss.xxx', function() {
                instance = new TzDate('2008-11-22T12:13:14.999');
                assert.equal(instance.toISOString(), '2008-11-22T12:13:14.999Z');
                assert.equal(instance.getHours(), 21);
            });
            it('treats the time as UTC if the format is YYYY-MM-DDThh:mm:ssZ', function() {
                instance = new TzDate('2008-11-22T12:13:14Z');
                assert.equal(instance.toISOString(), '2008-11-22T12:13:14.000Z');
                assert.equal(instance.getHours(), 21);
            });
        });

        describe('year, month, day, hours, minutes', function() {
            it('treats the time as local to the given offset', function() {
                instance = new TzDate(2008, 10, 22, 21, 0);
                assert.equal(instance.toISOString(), '2008-11-22T12:00:00.000Z');
                assert.equal(instance.getHours(), 21);
            });
        });

        describe('undefined', function() {
            it('returns an invalid date', function() {
                instance = new TzDate(undefined);
                assert.equal(instance.toString(), 'Invalid Date');
            });
        });

        describe('null', function() {
            it('return treat null as 0 (the Unix epoch)', function() {
                instance = new TzDate(null);
                assert.equal(instance.toISOString(), '1970-01-01T00:00:00.000Z');
            });
        });

        afterEach('instanceof check', function() {
            assert.ok(instance instanceof TzDate, 'expected it to be instanceof the bound constructor');
            assert.ok(instance instanceof Date, 'expected it to be instanceof Date');
            instance = null;
        });
    });
});
