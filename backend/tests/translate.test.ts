import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerTranslate } from '../src/infrastructure/translate-service';

test('PlayerTranslate translates to Ukrainian with parameter formatting', () => {
  const result = PlayerTranslate.translate('uk', 'server.online', 45, 100);
  assert.equal(result, 'Сервер онлайн! Гравців: 45/100');
});

test('PlayerTranslate translates to Russian with parameter formatting', () => {
  const result = PlayerTranslate.translate('ru', 'server.online', 12, 50);
  assert.equal(result, 'Сервер онлайн! Игроков: 12/50');
});

test('PlayerTranslate translates to English with parameter formatting', () => {
  const result = PlayerTranslate.translate('en', 'server.online', 10, 20);
  assert.equal(result, 'Server is online! Players: 10/20');
});

test('PlayerTranslate normalizes language codes correctly', () => {
  assert.equal(PlayerTranslate.normalizeLang('uk'), 'uk');
  assert.equal(PlayerTranslate.normalizeLang('ua'), 'uk');
  assert.equal(PlayerTranslate.normalizeLang('en'), 'en');
  assert.equal(PlayerTranslate.normalizeLang('ru'), 'ru');
  assert.equal(PlayerTranslate.normalizeLang(undefined), 'ru');
});
