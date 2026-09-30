// Preload for tests/builds: never connect to a shared database or paid provider.
// Unit tests may replace fetch with an explicit fixture; real sockets stay blocked.
const deny = () => {throw new Error('OFFLINE_GUARD: network disabled for verification');};
globalThis.fetch = async () => deny();
const net = require('node:net');
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  // Turbopack uses loopback sockets for compiler IPC. Never enabled in tests.
  if (process.env.VERIFY_BUILD_IPC === '1') {
    const values = Array.isArray(args[0]) ? args[0] : args;
    const options = typeof values[0] === 'object' ? values[0] : {port: values[0], host: typeof values[1] === 'string' ? values[1] : 'localhost'};
    const localPipe = typeof options.path === 'string' && /^\\\\\.\\pipe\\/.test(options.path);
    if (localPipe || (['127.0.0.1', '::1', 'localhost'].includes(options.host || 'localhost') && !options.path)) return originalConnect.apply(this, args);
  }
  return deny();
};
require('node:tls').connect = deny;
require('node:http').request = deny;
require('node:http').get = deny;
require('node:https').request = deny;
require('node:https').get = deny;
require('node:dgram').Socket.prototype.send = deny;
