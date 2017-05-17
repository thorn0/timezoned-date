# timezoned-date [![Build Status](https://travis-ci.org/thorn0/timezoned-date.svg?branch=master)](https://travis-ci.org/thorn0/timezoned-date) [![npm](https://img.shields.io/npm/v/timezoned-date.svg)](https://www.npmjs.com/package/timezoned-date)

> Constructors and objects behave exactly like built-in `Date`; the TZ offset is configurable

Tested against [Test262](https://github.com/tc39/test262) for the compatibility with `Date`.

No support for daylight saving time. Fixed offsets only.

## Install
```
$ npm install --save timezoned-date
```

## Usage

```javascript
const timezonedDate = require('timezoned-date');
console.log(new Date());
// Sat Sep 19 2017 02:39:56 GMT+0300 (Ixania Daylight Time)
const UtcDate = timezonedDate.makeConstructor(0);
console.log(new UtcDate());
// Fri Sep 18 2017 23:39:56 GMT+0000 (UTC)
global.Date = timezonedDate.makeConstructor(240); // minutes
console.log(new Date());
// Sat Sep 19 2017 03:39:56 GMT+0400
```

An example of using it with [jsdom](https://github.com/tmpvar/jsdom):

```javascript
const dom = new JSDOM(`<p>Hello</p>`, {
  beforeParse(window) {
    window.Date = timezonedDate.makeConstructor(240);
  }
});
```

## API

### makeConstructor(offsetInMinutes)

Returns a constructor function compatible with `Date` bound to the specified offset.

## License

[Apache 2.0](LICENSE) © 2013-2017 James A. Rosen, Georgii Dolzhykov
