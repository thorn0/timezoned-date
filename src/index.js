'use strict';

const MILLISECONDS_PER_MINUTE = 60 * 1000,
    OFFSET_SUFFIX = /(((GMT)?[\+\-]\d\d:?\d\d)|Z)(\s*\(.+\))?$/,
    daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    OriginalDate = global.Date;

function makeConstructor(boundOffset = -new OriginalDate().getTimezoneOffset()) {

    // If the resulting constructor is "bound",
    //    - it's signature is compatible with built-in Date,
    //    - objects it creates always have the same offset (boundOffset).
    // If it's not,
    //    - it takes the offset as the last argument,
    //    - so it can create objects with different offsets.
    var bound = isOffset(boundOffset);

    class TimezonedDate extends OriginalDate {
        constructor(...args) {
            var offset = bound ? boundOffset : args.pop();
            super(...args);
            if (!isOffset(offset)) {
                throw new TypeError('TimezonedDate requires an offset');
            }
            this.setTime(buildDate(args, offset));
            this.offset = function() {
                return offset;
            };
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
            if (typeof this.date !== 'function') {
                // This method is probably applied to an original Date instance
                return OriginalDate.prototype.toISOString.apply(this);
            }
            return this.date().toISOString();
        }
        valueOf() {
            return this.getTime();
        }

        toString() {
            if (isNaN(this.getDate())) {
                return 'Invalid date';
            }
            return [
                daysOfWeek[this.getDay()],
                ' ',
                months[this.getMonth()],
                ' ',
                addZero(this.getDate()),
                ' ',
                this.getFullYear(),
                ' ',
                addZero(this.getHours()),
                ':',
                addZero(this.getMinutes()),
                ':',
                addZero(this.getSeconds()),
                ' ',
                formatOffset(this.offset())
            ].join('');
        }

        toUTCString() {
            if (isNaN(this.getDate())) {
                return 'Invalid date';
            }
            var gmtDate = new ExportedTimezonedDate(+this, 0);
            return [
                daysOfWeek[gmtDate.getDay()],
                ', ',
                months[gmtDate.getMonth()],
                ' ',
                addZero(gmtDate.getDate()),
                ' ',
                gmtDate.getFullYear(),
                ' ',
                addZero(gmtDate.getHours()),
                ':',
                addZero(gmtDate.getMinutes()),
                ':',
                addZero(gmtDate.getSeconds()),
                ' GMT'
            ].join('');
        }

        getYear() {
            return getLocalDate(this).getUTCFullYear() - 1900;
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

    const proto = TimezonedDate.prototype;

    function addGetters(property) {
        const getterName = 'get' + property,
            utcGetterName = 'getUTC' + property;
        Object.defineProperty(proto, getterName, {
            value: createFunction(function() {
                return getLocalDate(this)[utcGetterName]();
            }, 0, getterName),
            configurable: true,
            writable: true
        });
        Object.defineProperty(proto, utcGetterName, {
            value: createFunction(function() {
                return this.date()[utcGetterName]();
            }, 0, utcGetterName),
            configurable: true,
            writable: true
        });
    }

    function addSetters(property, length = 1) {
        const setterName = 'set' + property,
            utcSetterName = 'setUTC' + property;
        Object.defineProperty(proto, setterName, {
            value: createFunction(function() {
                var localDate = getLocalDate(this);
                localDate[utcSetterName].apply(localDate, arguments);
                return this.setTime(applyOffset(localDate, -this.offset()));
            }, length, setterName),
            configurable: true,
            writable: true
        });
        Object.defineProperty(proto, utcSetterName, {
            value: createFunction(function() {
                var date = this.date();
                date[utcSetterName].apply(date, arguments);
                return this.setTime(date);
            }, length, utcSetterName),
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

    Object.defineProperties(proto, {
        [Symbol.toStringTag]: {
            value: 'Date'
        },
        [Symbol.toPrimitive]: {
            value: OriginalDate.prototype[Symbol.toPrimitive],
            configurable: true
        }
    });

    const ownPropsOfProto = ['toTimeString', 'toLocaleString', 'toLocaleDateString', 'toDateString', 'toLocaleTimeString'];
    for (let prop of ownPropsOfProto) {
        Object.defineProperty(proto, prop, {
            value: OriginalDate.prototype[prop],
            configurable: true,
            writable: true
        });
    }

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
    Object.defineProperty(_TimezonedDate, 'prototype', {
        value: proto,
        writable: false,
        configurable: false
    });
    proto.constructor = _TimezonedDate;
    Object.setPrototypeOf(_TimezonedDate, TimezonedDate);
    const ownPropsOfCtor = ['UTC', 'parse'];
    for (let prop of ownPropsOfCtor) {
        Object.defineProperty(_TimezonedDate, prop, {
            value: OriginalDate[prop],
            configurable: true,
            writable: true
        });
    }

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

// A Date whose UTC time is the local time of this object's real time.
// That is, it is incorrect by `offset` minutes. Used for `getDate` et al.
function getLocalDate(date) {
    return applyOffset(date.date(), date.offset());
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

function formatOffset(offsetInMinutes) {
    var sign = offsetInMinutes >= 0 ? '+' : '-';
    offsetInMinutes = Math.abs(offsetInMinutes);
    var hours = Math.floor(offsetInMinutes / 60),
        minutes = offsetInMinutes - 60 * hours;
    return 'GMT' + sign + addZero(hours) + addZero(minutes);
}

function createFunction(fn, length, name) {
    var argNames = [];
    for (var i = 0; i < length; i++) {
        argNames.push('_a' + i);
    }
    return eval(`(function ${name}(${argNames.join(',')}) { return fn.apply(this, arguments); })`);
}

function addZero(value) {
    return (value < 10 ? '0' : '') + value;
}

var ExportedTimezonedDate = makeConstructor(false);
ExportedTimezonedDate.makeConstructor = makeConstructor;
export default ExportedTimezonedDate;