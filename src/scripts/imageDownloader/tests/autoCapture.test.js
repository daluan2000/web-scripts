import test from 'node:test';
import assert from 'node:assert/strict';

import { AutoCaptureController } from '../autoCapture.js';

function installBrowserFakes() {
  let nextTimerId = 1;
  const timeoutCallbacks = new Map();
  const intervalCallbacks = new Map();
  const windowListeners = new Map();
  const documentListeners = new Map();

  globalThis.Element = class Element {};
  globalThis.MutationObserver = class MutationObserver {
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  };
  globalThis.window = {
    addEventListener(type, callback) {
      windowListeners.set(type, callback);
    },
    removeEventListener(type) {
      windowListeners.delete(type);
    },
    setTimeout(callback) {
      const id = nextTimerId++;
      timeoutCallbacks.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timeoutCallbacks.delete(id);
    },
    setInterval(callback) {
      const id = nextTimerId++;
      intervalCallbacks.set(id, callback);
      return id;
    },
    clearInterval(id) {
      intervalCallbacks.delete(id);
    },
  };
  globalThis.document = {
    hidden: false,
    documentElement: {},
    addEventListener(type, callback) {
      documentListeners.set(type, callback);
    },
    removeEventListener(type) {
      documentListeners.delete(type);
    },
  };

  return { timeoutCallbacks, intervalCallbacks, windowListeners, documentListeners };
}

test('auto capture start and stop are idempotent and clean up timers', () => {
  const fakes = installBrowserFakes();
  const controller = new AutoCaptureController({ onScan: () => {} });

  assert.equal(controller.start(), true);
  assert.equal(controller.start(), false);
  assert.equal(controller.active, true);
  assert.equal(fakes.timeoutCallbacks.size, 1);
  assert.equal(fakes.intervalCallbacks.size, 1);
  assert.equal(fakes.windowListeners.has('scroll'), true);

  // 已有待执行扫描时，重复请求不会创建更多 timeout。
  controller.requestScan();
  controller.requestScan();
  assert.equal(fakes.timeoutCallbacks.size, 1);

  assert.equal(controller.stop(), true);
  assert.equal(controller.stop(), false);
  assert.equal(controller.active, false);
  assert.equal(fakes.timeoutCallbacks.size, 0);
  assert.equal(fakes.intervalCallbacks.size, 0);
  assert.equal(fakes.windowListeners.has('scroll'), false);
  assert.equal(fakes.documentListeners.has('visibilitychange'), false);
});
