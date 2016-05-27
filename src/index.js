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

    var constructor = function Date(a0, a1, a2, a3, a4, a5, a6) {
        if (!(this instanceof constructor)) {
            // When Date() is called without new, it ignores its arguments and
            // returns same as new Date().toString()
            if (bound) {
                return new constructor().toString();
            }
            return new constructor(a0).toString();
        }

        var args, offset, len;
        if (bound) {
            args = arguments;
            offset = boundOffset;
        } else {
            args = Array.prototype.slice.call(arguments);
            offset = args.pop();
            if (!isOffset(offset)) {
                throw new TypeError('TimezonedDate requires an offset');
            }
        }
        len = args.length;

        var instance =
            len === 0 ? new NativeDate() :
            len === 1 ? new NativeDate(a0) :
            len === 2 ? new NativeDate(a0, a1) :
            len === 3 ? new NativeDate(a0, a1, a2) :
            len === 4 ? new NativeDate(a0, a1, a2, a3) :
            len === 5 ? new NativeDate(a0, a1, a2, a3, a4) :
            len === 6 ? new NativeDate(a0, a1, a2, a3, a4, a5) :
            new NativeDate(a0, a1, a2, a3, a4, a5, a6);

        setPrototypeOf(instance, proto);
        if (!bound) {
            instance.offset = function() {
                return offset;
            };
        }

        var done = len === 0 ||
            len === 1 && (a0 == null || a0 instanceof NativeDate || typeof a0 === 'number' || typeof a0 === 'boolean') ||
            isNaN(instance.getDate());

        if (!done && len > 1) {
            instance.setTime(NativeDate.UTC.apply(NativeDate, args) - MILLISECONDS_PER_MINUTE * offset);
            done = true;
        }

        if (!done && typeof a0 !== 'string') {
            // According to the ES specification, a0 should be converted to a string or a number
            // using quite a complicated algorithm.
            //  ES5: http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.3.2
            //  ES6: http://www.ecma-international.org/ecma-262/6.0/#sec-date-value
            // Let's try to avoid reimplementing this algorithm in JS. We'll call the native constructor
            // with the argument explicitly converted to a string and compare the results.
            done = new NativeDate('' + a0).getTime() !== instance.getTime();
            // If a0 is converted to a number, we're done. Otherwise further actions might be needed.
        }

        if (!done) {
            var string = '' + a0,
                isLocal = !UTC_YYYY_MM_DD.test(string) && !OFFSET_SUFFIX.test(string);
            if (isLocal) {
                var date = new NativeDate(string + ' ' + formatOffset(offset));
                if (!isNaN(date.getTime())) {
                    instance.setTime(date);
                } else {
                    applyOffset(instance, -nativeProto.getTimezoneOffset.apply(instance) - offset);
                }
            }
        }

        return instance;
    };

    setPrototypeOf(constructor, Date);

    var constructorPropertyDescriptors = makeMethodDescriptors({
        UTC: NativeDate.UTC,
        parse: bound ? function parse(string) {
            return new constructor(String(string)).getTime();
        } : NativeDate.parse
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

        offset() {
            return boundOffset;
        },
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

        getYear() {
            return getLocalDate(this).getUTCFullYear() - 1900;
        },

        setYear(year) {
            return this.setFullYear(1900 + year);
        },

        getTime: nativeProto.getTime,
        setTime: nativeProto.setTime,
        valueOf: nativeProto.valueOf,

        toUTCString: nativeProto.toUTCString,
        toGMTString: nativeProto.toGMTString || nativeProto.toUTCString,
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
    return new NativeDate(date.getTime() + MILLISECONDS_PER_MINUTE * date.offset());
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