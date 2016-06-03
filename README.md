# Timezoned Date

```javascript
var TimezonedDate = require('timezoned-date');
console.log(new Date());
// Sat Sep 19 2015 02:39:56 GMT+0300 (Finland Daylight Time)
global.Date = TimezonedDate.makeConstructor(240);
console.log(new Date());
// Sat Sep 19 2015 03:39:56 GMT+0400
```

Works great with [jsdom](https://github.com/tmpvar/jsdom):

```javascript
jsdom.env({
	created: function(err, window) {
		window.Date = TimezonedDate.makeConstructor(240);
	},
    // ...
});
```

May also be useful for tests and for server-side rendering with React.

[![Build Status](https://travis-ci.org/thorn0/timezoned-date.svg?branch=master)](https://travis-ci.org/thorn0/timezoned-date)
[![npm](https://img.shields.io/npm/v/timezoned-date.svg)](https://www.npmjs.com/package/timezoned-date)

Known issues:

* [daylight saving time support](https://github.com/jamesarosen/date-with-offset/pull/1).

*README TBD*

*Pre-fork README with minor changes follows.*

# Date With Offset

In JavaScript, all `Date`s have a local time zone. On my computer:

```javascript
var now = new Date();
// Sun Apr 14 2013 09:49:16 GMT-0700 (PDT)
```

This makes working with time zones difficult. You can represent that date in
UTC with `Date.prototype.toISOString`:

```javascript
now.toISOString();
// "2013-04-14T16:49:16.576Z"
```

Unfortunately, you can't pass around an actual `Date` in any other time zone.
Instead, create a `TimezonedDate`:

```javascript
var nowInUTC = new TimezonedDate(0);
// Sun Apr 14 2013 16:49:16 GMT+0000
```

## Creating `TimezonedDate`s

The `TimezonedDate` constructor works just like the `Date` constructor, but
the *last* argument is always the offset from UTC in minutes. Some examples:

```javascript
var nowInParis = new TimezonedDate(60);
// Sun Apr 14 2013 17:49:16 GMT+0100

var theSameTimeInMelbourne = new TimezonedDate(nowInParis, 600);
// Mon Apr 15 2013 02:49:16 GMT+1000
```

### Date Parsing

If the first argument is a String and contains an offset end with "Z",
it is treated as UTC time:

```
var newYearsGMTInBoston = new TimezonedDate("Jan 1 2013 00:00Z", -300);
// Mon Dec 31 2012 19:00:00 GMT-0500
```

If it's a String and doesn't contain an offset of end with "Z", it is treated
as local to the given offset:

```
var newYearsInBoston = new TimezonedDate("Jan 1 2013 00:00", -300);
// Tue Jan 01 2013 00:00:00 GMT-0500
```

Similarly, `TimezonedDate`s created with individual year, month, and day
(and, optionally, hours, minutes, seconds, and milliseconds) arguments are
treated as local to the given offset:

```
var newYearsInChicago = new TimezonedDate(2013, 0, 1, -360);
```

**Note** this behavior differs from that of the normal `Date` constructor,
which treats such strings as local to the *browser* (or server execution
environment).

### Rich Offset Objects

The last argument can be a `Number` (as above) or anything that responds to
`valueOf`. If you have richer time zone objects, you can pass them directly
into `new TimezonedDate`:

```javascript
var tokyo = {
  name: 'Tokyo',
  toString: function() { return 'Tokyo (GMT+0900)' },
  valueOf: function() { return 540; }
};

var nowInTokyo = new TimezonedDate(now, tokyo);
// Mon Apr 15 2013 01:49:16 GMT+0900
```
***Note***: the offset is that between *this* object and *UTC*, which means
that it is positive if the object's time zone is ahead of UTC and negative
if it is behind. This is the opposite of what
[`Date.prototype.getTimezoneOffset`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset)
returns.

## Compatibility with `Date`

You can use a `TimezonedDate` anywhere you use a `Date`:

```javascript
nowInUTC.getHours();                  // 16
nowInParis.getTime();                 // 1365958156000
theSameTimeInMelbourne.getTime();     // 1365958156000
newYearsInBoston.getTimezoneOffset(); // 300

newYearsInBoston.setDate(15);
newYearsInBoston;                     // Tue Jan 15 2013 00:00:00 GMT-0500
```

## Additional Methods

Get back the original offset:

```
nowInBoston.offset();
// -300

nowInTokyo.offset().toString();
// "Tokyo (GMT+0900)"
```

Get a new `TimezonedDate` representing the same point in time at a
different UTC offset:

```
var nowInChicago = nowInBoston.withOffset(-300)
```

## Related Projects

[node-time](https://github.com/TooTallNate/node-time) provides very similar
functionality with a different API. It supports time zone names (not just
offsets), but only runs in Node.

If you want time zone parsing support, try
[timezone-js](https://github.com/mde/timezone-js) or
[timezone](https://npmjs.org/package/timezone).

If you want a richer library for parsing, validating, manipulating, and
formatting dates, try [Moment.js](http://momentjs.com/).

If all you need to do is map Rails time zone names to IANA ones, you'll love
[rails-timezone-js](https://github.com/davidwood/rails-timezone-js).
