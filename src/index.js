/*jshint esversion: 6*/
'use strict';

const MILLISECONDS_PER_MINUTE = 60 * 1000,
    OFFSET_SUFFIX = /(((GMT)?[\+\-]\d\d:?\d\d)|Z)(\s*\(.+\))?$/,
    daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    NativeDate = global.Date,
    nativeProto = NativeDate.prototype;

function makeConstructor(boundOffset = -new NativeDate().getTimezoneOffset()) {

    // If the resulting constructor is "bound",
    //    - it's signature is compatible with built-in Date,
    //    - objects it creates always have the same offset (boundOffset).
    // If it's not,
    //    - it takes the offset as the last argument,
    //    - so it can create objects with different offsets.
    var bound = isOffset(boundOffset);

    var proto = Object.create(nativeProto);

    function TimezonedDate(_a1, _a2, _a3, _a4, _a5, _a6, _a7) {
        if (!(this instanceof TimezonedDate)) {
            // When Date() is called without new, it ignores its arguments and
            // returns same as new Date().toString()
            if (bound) {
                return new TimezonedDate().toString();
            }
            return new TimezonedDate(_a1).toString();
        }
        var args = Array.prototype.slice.call(arguments);
        var offset = bound ? boundOffset : args.pop();
        if (!isOffset(offset)) {
            throw new TypeError('TimezonedDate requires an offset');
        }
        var instance = new(Function.prototype.bind.apply(NativeDate, [null].concat(args)))();
        Object.setPrototypeOf(instance, proto);
        instance.setTime(buildDate(args, offset));
        instance.offset = function() {
            return offset;
        };
        return instance;
    }

    Object.setPrototypeOf(TimezonedDate, Date);

    var constructorPropertyDescriptors = makeMethodDescriptors({
        UTC: NativeDate.UTC,
        parse: NativeDate.parse
    });

    constructorPropertyDescriptors.prototype = {
        value: proto,
        writable: false,
        configurable: false
    };

    Object.defineProperties(TimezonedDate, constructorPropertyDescriptors);

    var protoMethods = {
        constructor: TimezonedDate,

        withOffset(offset) {
            return new ExportedTimezonedDate(this.getTime(), offset);
        },

        getTimezoneOffset() {
            return -this.offset();
        },

        toDateString() {
            if (isNaN(this.getDate())) {
                return 'Invalid date';
            }
            return [
                daysOfWeek[this.getDay()],
                months[this.getMonth()],
                addZero(this.getDate()),
                this.getFullYear()
            ].join(' ');
        },

        toTimeString() {
            if (isNaN(this.getDate())) {
                return 'Invalid date';
            }
            return [
                addZero(this.getHours()),
                ':',
                addZero(this.getMinutes()),
                ':',
                addZero(this.getSeconds()),
                ' ',
                formatOffset(this.offset())
            ].join('');
        },

        toString() {
            if (isNaN(this.getDate())) {
                return 'Invalid date';
            }
            return this.toDateString() + ' ' + this.toTimeString();
        },

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
        },

        getYear() {
            return getLocalDate(this).getUTCFullYear() - 1900;
        },

        setYear(year) {
            return this.setFullYear(1900 + year);
        },

        // https://nodejs.org/api/util.html#util_custom_inspect_function_on_objects
        inspect() {
            return this.toString();
        },

        getTime: nativeProto.getTime,
        setTime: nativeProto.setTime,
        valueOf: nativeProto.valueOf,

        toLocaleString: nativeProto.toLocaleString,
        toLocaleDateString: nativeProto.toLocaleDateString,
        toLocaleTimeString: nativeProto.toLocaleTimeString
    };

    function addGetters(property) {
        const getterName = 'get' + property,
            utcGetterName = 'getUTC' + property;
        protoMethods[getterName] = createFunction(function() {
            return getLocalDate(this)[utcGetterName]();
        }, 0, getterName);
        protoMethods[utcGetterName] = createFunction(function() {
            return nativeProto[utcGetterName].apply(this, arguments);
        }, 0, utcGetterName);
    }

    function addSetters(property, length = 1) {
        const setterName = 'set' + property,
            utcSetterName = 'setUTC' + property;
        protoMethods[setterName] = createFunction(function() {
            if (!(this instanceof TimezonedDate)) {
                throw new TypeError();
            }
            var localDate = getLocalDate(this);
            nativeProto[utcSetterName].apply(localDate, arguments);
            return this.setTime(applyOffset(localDate, -this.offset()));
        }, length, setterName);
        protoMethods[utcSetterName] = createFunction(function() {
            if (!(this instanceof TimezonedDate)) {
                throw new TypeError();
            }
            nativeProto[utcSetterName].apply(this, arguments);
            return this;
        }, length, utcSetterName);
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

    var prototypePropertyDescriptors = makeMethodDescriptors(protoMethods);

    if (Symbol.toStringTag) {
        // Node v6+ or a polyfill
        prototypePropertyDescriptors[Symbol.toStringTag] = {
            value: 'Date'
        };
    }
    if (Symbol.toPrimitive) {
        prototypePropertyDescriptors[Symbol.toPrimitive] = {
            value: nativeProto[Symbol.toPrimitive],
            configurable: true
        };
    }

    Object.defineProperties(proto, prototypePropertyDescriptors);

    return TimezonedDate;
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

// A Date whose "UTC time" is the local time of this object's real time.
// That is, it is incorrect by `offset` minutes. Used for `getDate` et al.
function getLocalDate(date) {
    return applyOffset(new NativeDate(date), date.offset());
}

function buildDate(args, offset) {
    if (args.length === 0) {
        return new NativeDate();
    }

    if (args.length === 1 && args[0] instanceof NativeDate) {
        return args[0];
    }
    if (args.length === 1 && (typeof args[0] === 'number' || typeof args[0] === 'boolean')) {
        return new NativeDate(args[0]);
    }

    if (args.length > 1) {
        args[3] = args[3] || null;
        args[4] = args[4] || null;
        args[5] = args[5] || null;
        args[6] = args[6] || null;

        date = new NativeDate(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        return applyOffset(date, -date.getTimezoneOffset() - offset);
    }

    var string = args[0].toString(),
        date = new NativeDate(string),
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

function makeMethodDescriptors(methods) {
    var result = {};
    for (var key in methods) {
        if (methods.hasOwnProperty(key)) {
            result[key] = {
                value: methods[key],
                writable: true,
                configurable: true
            };
        }
    }
    return result;
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
module.exports = ExportedTimezonedDate;