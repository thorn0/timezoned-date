var assert = require("assert"),
    TimezonedDate = require('../');

var moment = require('./lib/moment-2.13.0'),
    lodash = {
        3: require('./lib/lodash-3.10.1'),
        4: require('./lib/lodash-4.12.0')
    };

describe('Libraries: compatibility', function() {
    "use strict";

    var nativeDate = Date;

    beforeEach(function() {
        global.Date = TimezonedDate.makeConstructor(240);
    });
    afterEach(function() {
        global.Date = nativeDate;
    });

    [3, 4].forEach(function(lodashVersion) {
        it('should be clonable with Moment.js and Lodash ' + lodashVersion, function() {
            var expected = 'Sat, 31 Dec 1949 21:00:00 GMT';
            var date = new Date(1950, 0, 1, 1);
            var clone = lodash[lodashVersion].cloneDeep(date);
            assert.equal(clone.toUTCString(), expected);
            assert.ok(clone instanceof Date);
            var mclone = moment(clone).toDate();
            assert.equal(mclone.toUTCString(), expected);
            assert.ok(mclone instanceof Date);
        });
    });

});