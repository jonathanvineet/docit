import { Buffer } from "buffer";
if (typeof global.SlowBuffer === "undefined") {
    global.SlowBuffer = Buffer;
    console.log("🛠️ Polyfilled SlowBuffer for Node.js compatibility");
}
