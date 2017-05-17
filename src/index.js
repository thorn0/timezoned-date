/*jshint esversion: 6, evil: true, -W103, -W014, undef: true, node: true*/
(function(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.timezonedDate = factory();
    }
})(this, function() {
    'use strict';
    var MILLISECONDS_PER_MINUTE = 60 * 1000,
        // YYYY-MM-DD strings are parsed as UTC. See http://dygraphs.com/date-formats.html
        TIMEZONED_STRING = /^\d\d\d\d(-\d\d){0,2}($|T)|(((GMT)?[\+\-]\d\d:?\d\d)|Z)(\s*\(.+\))?$|([ECMP][SD]|GM|U)T[\s\/-]*$/,
        daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        NativeDate = Date,
        nativeProto = NativeDate.prototype,
        isStrict = (function() {
            return !this;
        })();

    function makeConstructor(offset) {
        if (offset === undefined) {
            offset = -new NativeDate().getTimezoneOffset();
        }

        var offsetInMilliseconds = MILLISECONDS_PER_MINUTE * offset;

        var proto = Object.create(nativeProto);

        var Constructor = function Date(a0, a1, a2, a3, a4, a5, a6) {
            if (isStrict ? this === undefined : !(this instanceof Constructor)) {
                return new Constructor().toString();
            }

            var instance;

            switch (arguments.length) {
                case 0:
                    instance = new NativeDate();
                    break;

                case 1:
                    instance = new NativeDate(a0);
                    var done =
                        isInvalidDate(instance) ||
                        a0 == null ||
                        a0 instanceof NativeDate ||
                        typeof a0 === 'number' ||
                        typeof a0 === 'boolean';

                    if (!done && typeof a0 !== 'string') {
                        // According to the ES specification, a0 should be converted to a string or a number
                        // using a complicated algorithm.
                        //  ES5: http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.3.2
                        //  ES6: http://www.ecma-international.org/ecma-262/6.0/#sec-date-value
                        // Let's try to avoid reimplementing this algorithm in JS. We'll call the native constructor
                        // with the argument explicitly converted to a string and compare the results.
                        done = new NativeDate('' + a0).getTime() !== instance.getTime();
                        // If a0 is converted to a number, we're done. Otherwise further actions might be needed.
                    }

                    if (!done) {
                        var string = '' + a0;
                        if (!TIMEZONED_STRING.test(string)) {
                            // Let's try to add the offset to the string ourselves.
                            var date = new NativeDate(string + ' ' + formatOffset(offset));
                            if (!isInvalidDate(date)) {
                                instance.setTime(date);
                            } else {
                                // It's some strange date/time string that nonetheless was successfully parsed to a
                                // valid local native Date. Our last resort is to simply shift its offset, which
                                // however means that we can get a value off by 1 hour because of DST.
                                var time =
                                    instance.getTime() -
                                    nativeProto.getTimezoneOffset.apply(instance) * MILLISECONDS_PER_MINUTE -
                                    offsetInMilliseconds;
                                instance.setTime(time);
                            }
                        }
                    }
                    break;

                default:
                    instance = new NativeDate(
                        NativeDate.UTC.apply(NativeDate, arguments) - offsetInMilliseconds
                    );
                    break;
            }

            setPrototypeOf(instance, proto);

            // Trying to pass this tricky test: test262\test\built-ins\Date\subclassing.js
            if (this.constructor !== Constructor) {
                var newTargetPrototype = Object.getPrototypeOf(this);
                if (newTargetPrototype !== Object.prototype) {
                    setPrototypeOf(instance, newTargetPrototype);
                }
            }

            return instance;
        };

        setPrototypeOf(Constructor, Date);

        var constructorPropertyDescriptors = makeMethodDescriptors({
            UTC(a0, a1, a2, a3, a4, a5, a6) {
                var result = NativeDate.UTC.apply(NativeDate, arguments);
                // Node doesn't pass test262/test/built-ins/Date/UTC/return-value.js
                if (result !== result && arguments.length === 1 && typeof a0 === 'number') {
                    result = NativeDate.UTC(a0, 0);
                }
                return result;
            },
            parse(string) {
                return new Constructor(String(string)).getTime();
            }
        });

        constructorPropertyDescriptors.prototype = {
            value: proto,
            writable: false,
            configurable: false
        };

        // The next line is needed for Node 0.10.x only
        Constructor.prototype = proto;

        Object.defineProperties(Constructor, constructorPropertyDescriptors);

        var protoMethods = {
            constructor: Constructor,

            getTimezoneOffset() {
                if (isInvalidDate(this)) {
                    return NaN;
                }
                // Don't return -0
                if (offset === 0) {
                    return 0;
                }
                return -offset;
            },

            toDateString() {
                if (isInvalidDate(this)) {
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
                if (isInvalidDate(this)) {
                    return 'Invalid Date';
                }
                return [
                    addZero(this.getHours()),
                    ':',
                    addZero(this.getMinutes()),
                    ':',
                    addZero(this.getSeconds()),
                    ' ',
                    formatOffset(offset)
                ].join('');
            },

            toString() {
                if (isInvalidDate(this)) {
                    return 'Invalid Date';
                }
                return this.toDateString() + ' ' + this.toTimeString();
            },

            getYear() {
                return this.getFullYear() - 1900;
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

        // A Date whose "UTC time" === the local time of `date`.
        // That is, it is incorrect by `offset` minutes. Used for `getDate` et al.
        function getLocalDate(date) {
            return new NativeDate(date.getTime() + offsetInMilliseconds);
        }

        function addGetters(property) {
            var getterName = 'get' + property, utcGetterName = 'getUTC' + property;
            protoMethods[getterName] = createFunction(
                function() {
                    return getLocalDate(this)[utcGetterName]();
                },
                nativeProto[getterName].length,
                getterName
            );
            protoMethods[utcGetterName] = nativeProto[utcGetterName];
        }

        function addSetters(property) {
            var setterName = 'set' + property, utcSetterName = 'setUTC' + property;
            protoMethods[setterName] = createFunction(
                function() {
                    var localDate = getLocalDate(this);
                    nativeProto[utcSetterName].apply(localDate, arguments);
                    return this.setTime(localDate.getTime() - offsetInMilliseconds);
                },
                nativeProto[setterName].length,
                setterName
            );
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

        if (typeof Symbol !== 'undefined' /* Node 0.10.x */) {
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

        return Constructor;
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
        return eval(
            '(function ' + name + '(' + argNames.join(',') + ') { return fn.apply(this, arguments); })'
        );
    }

    function addZero(value) {
        return (value < 10 ? '0' : '') + value;
    }

    function padYear(year) {
        var length = ('' + year).length;
        return (length < 4 ? '   '.slice(0, 4 - length) : '') + year;
    }

    function isInvalidDate(date) {
        var v = date.getTime();
        return v !== v;
    }

    return { makeConstructor: makeConstructor };
});
