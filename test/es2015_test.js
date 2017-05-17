describe('ES2015', function() {
    var nativeTests;
    try {
        nativeTests = require('./es2015_native');
    } catch (e) {}

    if (nativeTests) {
        describe('Native', nativeTests);
    }

    describe('Transpiled with Babel', require('./es2015_babel'));
});
