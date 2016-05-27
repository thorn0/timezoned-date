var assert = require("assert"),
    TimezonedDate = require('../');

describe('Compatibility with libraries', function() {
    "use strict";

    var nativeDate = Date,
        moment, lodash;

    function tests() {
        [3, 4].forEach(function(lodashVersion) {
            it('instances should be with Moment.js and Lodash ' + lodashVersion, function() {
                var expected = 'Sat, 31 Dec 1949 21:00:00 GMT';
                var date = new Date(1950, 0, 1, 1);
                var cloneL = lodash[lodashVersion].cloneDeep(date);
                assert.equal(cloneL.toUTCString(), expected);
                assert.ok(cloneL instanceof Date);
                var cloneM = moment(cloneL).toDate();
                assert.equal(cloneM.toUTCString(), expected);
                assert.ok(cloneM instanceof Date);
            });
        });
    }

    var MOMENT = './lib/moment-2.13.0',
        LODASH3 = './lib/lodash-3.10.1',
        LODASH4 = './lib/lodash-4.12.0';

    function loadLibraries() {
        moment = require(MOMENT);
        lodash = {
            3: require(LODASH3),
            4: require(LODASH4)
        };
    }

    function clearRequireCache() {
        delete require.cache[require.resolve(MOMENT)];
        delete require.cache[require.resolve(LODASH3)];
        delete require.cache[require.resolve(LODASH4)];
    }

    afterEach(function() {
        global.Date = nativeDate;
        clearRequireCache();
    });

    describe('loaded before overriding Date:', function() {
        beforeEach(function() {
            loadLibraries();
            global.Date = TimezonedDate.makeConstructor(240);
        });
        tests();
    });

    describe('loaded after overriding Date:', function() {
        beforeEach(function() {
            global.Date = TimezonedDate.makeConstructor(240);
            loadLibraries();
        });
        tests();
    });

});