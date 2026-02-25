const Buffer = require('buffer').Buffer;
if (typeof global.SlowBuffer === 'undefined') {
    global.SlowBuffer = Buffer;
    console.log('🛠️ CJS Polyfilled SlowBuffer');
}
