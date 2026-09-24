// React Native crypto polyfill / shim
module.exports = {
  randomBytes: function (size) {
    var bytes = new Uint8Array(size);
    for (var i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  },
  createHmac: function () {
    return {
      update: function () { return this; },
      digest: function () { return ''; }
    };
  },
  timingSafeEqual: function (a, b) {
    if (a.length !== b.length) return false;
    var result = 0;
    for (var i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }
};
