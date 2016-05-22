/*jshint esversion: 6, evil: true, -W103*/
'use strict';

var MILLISECONDS_PER_MINUTE = 60 * 1000,
    // Such strings are parsed as UTC. See http://dygraphs.com/date-formats.html
    UTC_YYYY_MM_DD = /^\d\d\d\d(-\d\d){0,2}($|T)/,
    OFFSET_SUFFIX = /(((GMT)?[\+\-]\d\d:?\d\d)|Z)(\s*\(.+\))?$/,
    daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    NativeDate = global.Date,
    nativeProto = NativeDate.prototype;

function makeConstructor(boundOffset) {

    if (boundOffset === undefined) {
        boundOffset = -new NativeDate().getTimezoneOffset();
    }

    // If the resulting constructor is "bound",
    //    - its signature is compatible with built-in Date,
    //    - objects it creates always have the same offset (boundOffset).
    // If it's not,
    //    - it takes the offset as the last argument,
    //    - so it can create objects with different offsets.
    var bound = isOffset(boundOffset);

    var proto = Object.create(nativeProto);

    var constructor = function Date(_a1, _a2, _a3, _a4, _a5, _a6, _a7) {
        if (!(this instanceof constructor)) {
            // When Date() is called without new, it ignores its arguments and
            // returns same as new Date().toString()
            if (bound) {
                return new constructor().toString();
            }
            return new constructor(_a1).toString();
        }
        var args = Array.prototype.slice.call(arguments);
        var offset = bound ? boundOffset : args.pop();
        if (!isOffset(offset)) {
            throw new TypeError('TimezonedDate requires an offset');
        }
        var boundNativeConstructor = Function.prototype.bind.apply(NativeDate, [null].concat(args));
        var instance = new boundNativeConstructor();
        setPrototypeOf(instance, proto);
        instance.offset = function() {
            return offset;
        };

        var inited = args[0] === undefined ||
            args[0] === null && args.length === 1 ||
            args.length === 1 && args[0] instanceof NativeDate ||
            args.length === 1 && (typeof args[0] === 'number' || typeof args[0] === 'boolean') ||
            args.length > 1 && isNaN(instance.getDate());

        if (!inited && args.length > 1) {
            instance.setFullYear(args[0]);
            instance.setMonth(args[1]);
            instance.setDate(args[2] || 1);
            instance.setHours(args[3] || null);
            instance.setMinutes(args[4] || null);
            instance.setSeconds(args[5] || null);
            instance.setMilliseconds(args[6] || null);
            inited = true;
        }

        if (!inited) {
            var string = args[0].toString(),
                date = new NativeDate(string),
                isYYYYmmdd = UTC_YYYY_MM_DD.test(string),
                isOffsetSpecified = OFFSET_SUFFIX.test(string),
                isLocal = !isYYYYmmdd && !isOffsetSpecified;
            if (isLocal) {
                applyOffset(date, -date.getTimezoneOffset() - offset);
            }
            instance.setTime(date);
        }

        return instance;
    };

    setPrototypeOf(constructor, Date);

    var constructorPropertyDescriptors = makeMethodDescriptors({
        UTC: NativeDate.UTC,
        parse: NativeDate.parse
    });

    constructorPropertyDescriptors.prototype = {
        value: proto,
        writable: false,
        configurable: false
    };

    // The next line is needed for Node 0.10.x only
    constructor.prototype = proto;

    Object.defineProperties(constructor, constructorPropertyDescriptors);

    var protoMethods = {
        constructor: constructor,

        withOffset(offset) {
            return new TimezonedDate(this.getTime(), offset);
        },

        getTimezoneOffset() {
            return -this.offset();
        },

        toDateString() {
            if (isNaN(this.getDate())) {
                return 'Invalid Date';
            }
            return [
                daysOfWeek[this.getDay()],
                months[this.getMonth()],
                addZero(this.getDate()),
                padYear(this.getFullYear())
            ].join(' ');
        },

        toTimeString() {
            if (isNaN(this.getDate())) {
                return 'Invalid Date';
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
                return 'Invalid Date';
            }
            return this.toDateString() + ' ' + this.toTimeString();
        },

        toUTCString() {
            if (isNaN(this.getDate())) {
                return 'Invalid Date';
            }
            return [
                daysOfWeek[this.getUTCDay()],
                ', ',
                addZero(this.getUTCDate()),
                ' ',
                months[this.getUTCMonth()],
                ' ',
                this.getUTCFullYear(),
                ' ',
                addZero(this.getUTCHours()),
                ':',
                addZero(this.getUTCMinutes()),
                ':',
                addZero(this.getUTCSeconds()),
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
        var getterName = 'get' + property,
            utcGetterName = 'getUTC' + property;
        protoMethods[getterName] = createFunction(function() {
            return getLocalDate(this)[utcGetterName]();
        }, nativeProto[getterName].length, getterName);
        protoMethods[utcGetterName] = nativeProto[utcGetterName];
    }

    function addSetters(property) {
        var setterName = 'set' + property,
            utcSetterName = 'setUTC' + property;
        protoMethods[setterName] = createFunction(function() {
            if (!(this instanceof constructor)) {
                throw new TypeError();
            }
            var localDate = getLocalDate(this);
            nativeProto[utcSetterName].apply(localDate, arguments);
            return this.setTime(applyOffset(localDate, -this.offset()));
        }, nativeProto[setterName].length, setterName);
        protoMethods[utcSetterName] = nativeProto[utcSetterName];
    }

    addGetters('Date');
    addSetters('Date');
    addGetters('Day');
    addGetters('FullYear');
    addSetters('FullYear');
    addGetters('Hours');
    addSetters('Hours');
    addGetters('Milliseconds');
    addSetters('Milliseconds');
    addGetters('Minutes');
    addSetters('Minutes');
    addGetters('Month');
    addSetters('Month');
    addGetters('Seconds');
    addSetters('Seconds');

    var prototypePropertyDescriptors = makeMethodDescriptors(protoMethods);

    if (typeof Symbol !== 'undefined' /* Node 0.10.x */ ) {
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
    }

    Object.defineProperties(proto, prototypePropertyDescriptors);

    return constructor;
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

function formatOffset(offset) {
    var sign = offset >= 0 ? '+' : '-',
        absOffsetInMinutes = Math.abs(offset),
        hours = Math.floor(absOffsetInMinutes / 60),
        minutes = absOffsetInMinutes - 60 * hours,
        tzName = '';
    if (Object.prototype.hasOwnProperty.call(offset, 'toString')) {
        tzName = ' (' + offset.toString() + ')';
    } else if (+offset === 0) {
        tzName = ' (UTC)';
    }
    return 'GMT' + sign + addZero(hours) + addZero(minutes) + tzName;
}

function setPrototypeOf(object, proto) {
    if (typeof Object.setPrototypeOf === 'function') {
        Object.setPrototypeOf(object, proto);
    } else {
        // Node 0.10.x
        object.__proto__ = proto;
    }
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
    return eval('(function ' + name + '(' + argNames.join(',') + ') { return fn.apply(this, arguments); })');
}

function addZero(value) {
    return (value < 10 ? '0' : '') + value;
}

function padYear(year) {
    var length = ('' + year).length;
    return (length < 4 ? '   '.slice(0, 4 - length) : '') + year;
}

var TimezonedDate = makeConstructor(false);
TimezonedDate.makeConstructor = makeConstructor;
module.exports = TimezonedDate;