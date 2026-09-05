import test from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../src/core/router';
import { URL } from 'node:url';

test('Router matches exact static routes', () => {
  const router = new Router();
  let called = false;
  router.get('/api/v1/health', () => {
    called = true;
  });

  const match = router.match('GET', '/api/v1/health');
  assert.ok(match);
  match.handler({} as any);
  assert.equal(called, true);
});

test('Router extracts path parameters correctly', () => {
  const router = new Router();
  router.get('/api/v1/rules/:category', () => {});

  const match = router.match('GET', '/api/v1/rules/chat-and-voice');
  assert.ok(match);
  assert.deepEqual(match.params, { category: 'chat-and-voice' });
});

test('Router extracts multiple path parameters', () => {
  const router = new Router();
  router.get('/api/v1/guilds/:guildId/members/:memberId', () => {});

  const match = router.match('GET', '/api/v1/guilds/alpha/members/player1');
  assert.ok(match);
  assert.deepEqual(match.params, { guildId: 'alpha', memberId: 'player1' });
});

test('Router parses URL query parameters into typed map', () => {
  const url = new URL('http://localhost:3000/api/v1/status?lang=uk&refresh=true&tags=bedrock&tags=pe');
  const query = Router.parseQuery(url);

  assert.equal(query['lang'], 'uk');
  assert.equal(query['refresh'], 'true');
  assert.deepEqual(query['tags'], ['bedrock', 'pe']);
});

test('Router rejects mismatched HTTP method', () => {
  const router = new Router();
  router.post('/api/v1/ranks/calculate', () => {});

  const match = router.match('GET', '/api/v1/ranks/calculate');
  assert.equal(match, null);
});
