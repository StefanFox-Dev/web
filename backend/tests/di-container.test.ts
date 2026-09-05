import test from 'node:test';
import assert from 'node:assert/strict';
import { Container } from '../src/core/di-container';

test('Container registers and resolves singleton instance', () => {
  const container = new Container();
  const testInstance = { value: 42 };

  container.registerSingleton('CONFIG', testInstance);
  const resolved = container.resolve<{ value: number }>('CONFIG');

  assert.equal(resolved.value, 42);
  assert.equal(resolved, testInstance);
});

test('Container lazily instantiates singleton factory once', () => {
  const container = new Container();
  let factoryCalls = 0;

  container.registerSingleton('SERVICE', () => {
    factoryCalls++;
    return { id: Math.random() };
  });

  assert.equal(factoryCalls, 0);

  const first = container.resolve('SERVICE');
  const second = container.resolve('SERVICE');

  assert.equal(factoryCalls, 1);
  assert.equal(first, second);
});

test('Container produces new instances for transient bindings', () => {
  const container = new Container();

  container.registerTransient('TRANSIENT', () => ({ id: Math.random() }));

  const inst1 = container.resolve<{ id: number }>('TRANSIENT');
  const inst2 = container.resolve<{ id: number }>('TRANSIENT');

  assert.notEqual(inst1, inst2);
});

test('Container throws explicit error when token is not registered', () => {
  const container = new Container();
  assert.throws(() => {
    container.resolve('UNKNOWN_TOKEN');
  }, /No dependency binding found for token: UNKNOWN_TOKEN/);
});
