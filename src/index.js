'use strict';

var MILLISECONDS_PER_MINUTE = 60 * 1000,
    OFFSET_SUFFIX = /(((GMT)?[\+\-]\d\d:?\d\d)|Z)(\s*\(.+\))?$/,
    OriginalDate = global.Date;

function makeConstructor(defaultOffset = -new OriginalDate().getTimezoneOffset()) {

    // If the resulting constructor is "bound",
    //    - it's signature is compatible with built-in Date,
    //    - objects it creates always have the same offset (defaultOffset).
    // If it's not,
    //    - it takes the offset as the last argument,
    //    - so it can create objects with different offsets.
    var bound = isOffset(defaultOffset);

    class TimezonedDate extends OriginalDate {
        constructor(...args) {
            var offset = bound ? defaultOffset : args.pop();
            super(...args);
            if (!isOffset(offset)) {
                throw new TypeError('TimezonedDate requires an offset');
            }
            this.setTime(buildDate(args, offset));
            this.offset = function() {
                return offset;
            };
        }

        // A Date whose UTC time is the local time of this object's real time.
        // That is, it is incorrect by `offset` minutes. Used for `getDate` et al.
        _localDate() {
            return applyOffset(this.date(), this.offset());
        }

        withOffset(offset) {
            return new ExportedTimezonedDate(this.getTime(), offset);
        }

        getTime() {
            return this.date().getTime();
        }
        getTimezoneOffset() {
            return -this.offset();
        }
        toISOString() {
            return this.date().toISOString();
        }
        valueOf() {
            return this.getTime();
        }

        toString() {
            var localDate = this._localDate(),
                plusBrowserOffset = applyOffset(localDate, localDate.getTimezoneOffset()),
                asString = plusBrowserOffset.toString();
            return asString.replace(OFFSET_SUFFIX, formattedOffset(this.offset()));
        }

        getYear() {
            return this._localDate().getUTCFullYear() - 1900;
        }

        setYear(year) {
            return this.setFullYear(1900 + year);
        }

        setTime(date) {
            this.date = function() {
                return new OriginalDate(date);
            };
            return this;
        }

        // https://nodejs.org/api/util.html#util_custom_inspect_function_on_objects
        inspect() {
            return this.toString();
        }
    }

    function addGetters(property) {
        Object.defineProperty(TimezonedDate.prototype, 'get' + property, {
            value: function() {
                return this._localDate()['getUTC' + property]();
            },
            configurable: true,
            writable: true
        });
        Object.defineProperty(TimezonedDate.prototype, 'getUTC' + property, {
            value: function() {
                return this.date()['getUTC' + property]();
            },
            configurable: true,
            writable: true
        });
    }

    function addSetters(property, length = 1) {
        Object.defineProperty(TimezonedDate.prototype, 'set' + property, {
            value: fixLength(function() {
                var localDate = this._localDate();
                localDate['setUTC' + property].apply(localDate, arguments);
                return this.setTime(applyOffset(localDate, -this.offset()));
            }, length),
            configurable: true,
            writable: true
        });
        Object.defineProperty(TimezonedDate.prototype, 'setUTC' + property, {
            value: fixLength(function() {
                var date = this.date();
                date['setUTC' + property].apply(date, arguments);
                return this.setTime(date);
            }, length),
            configurable: true,
            writable: true
        });
    }

    addGetters('Date');
    addSetters('Date');
    addGetters('Day'); // can't set day of week
    addGetters('FullYear');
    addSetters('FullYear', 3);
    addGetters('Hours');
    addSetters('Hours', 4);
    addGetters('Milliseconds');
    addSetters('Milliseconds');
    addGetters('Minutes');
    addSetters('Minutes', 3);
    addGetters('Month');
    addSetters('Month', 2);
    addGetters('Seconds');
    addSetters('Seconds', 2);

    var _TimezonedDate = function(_a1, _a2, _a3, _a4, _a5, _a6, _a7) {
        if (!(this instanceof _TimezonedDate)) {
            // When Date() is called without new, it ignores its arguments and
            // returns same as new Date().toString()
            if (bound) {
                return new TimezonedDate().toString();
            }
            return new TimezonedDate(_a1).toString();
        }
        return new TimezonedDate(...arguments);
    };
    _TimezonedDate.prototype = TimezonedDate.prototype;
    _TimezonedDate.prototype.constructor = _TimezonedDate;
    Object.setPrototypeOf(_TimezonedDate, TimezonedDate);

    return _TimezonedDate;
}

function isOffset(x) {
    if (x == null) {
        return false;
    }
    if (typeof x.valueOf === 'function') {
        x = x.valueOf();
    }
    return typeof x === 'number';
}

function applyOffset(date, offset) {
    date.setTime(date.getTime() + MILLISECONDS_PER_MINUTE * offset);
    return date;
}

function buildDate(args, offset) {
    if (args.length === 0) {
        return new OriginalDate();
    }

    if (args.length === 1 && args[0] instanceof OriginalDate) {
        return args[0];
    }
    if (args.length === 1 && (typeof args[0] === 'number' || typeof args[0] === 'boolean')) {
        return new OriginalDate(args[0]);
    }

    if (args.length > 1) {
        args[3] = args[3] || null;
        args[4] = args[4] || null;
        args[5] = args[5] || null;
        args[6] = args[6] || null;

        date = new OriginalDate(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        return applyOffset(date, -date.getTimezoneOffset() - offset);
    }

    var string = args[0].toString(),
        date = new OriginalDate(string),
        isYYYYmmdd = /\d\d\d\d-\d\d-\d\d/.test(string),
        isOffsetSpecified = OFFSET_SUFFIX.test(string),
        isLocal = !isYYYYmmdd && !isOffsetSpecified;

    if (isLocal) {
        date = applyOffset(date, -date.getTimezoneOffset() - offset);
    }

    return date;
}

function formattedOffset(offsetInMinutes) {
    var sign = offsetInMinutes >= 0 ? '+' : '-';
    offsetInMinutes = Math.abs(offsetInMinutes);
    var hours = Math.floor(offsetInMinutes / 60),
        minutes = offsetInMinutes - 60 * hours;
    if (hours < 10) {
        hours = '0' + hours;
    }
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    return 'GMT' + sign + hours + minutes;
}

function fixLength(fn, length) {
    var argNames = [];
    for (var i = 0; i < length; i++) {
        argNames.push('_a' + i);
    }
    return eval('(function(' + argNames.join(',') + ') { return fn.apply(this, arguments); })');
}

var ExportedTimezonedDate = makeConstructor(false);
ExportedTimezonedDate.makeConstructor = makeConstructor;
export default ExportedTimezonedDate;