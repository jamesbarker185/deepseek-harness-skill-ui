'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { rememberSkill, resolveRecents, recentsKey, composeDraft } = require('../src/recents')

test('rememberSkill puts the newest name first', () => {
  assert.deepEqual(rememberSkill(['tdd', 'grill-me'], 'wrangler'), ['wrangler', 'tdd', 'grill-me'])
})

test('rememberSkill moves a repeat to the front instead of duplicating it', () => {
  assert.deepEqual(rememberSkill(['tdd', 'grill-me', 'wrangler'], 'grill-me'), ['grill-me', 'tdd', 'wrangler'])
})

test('rememberSkill caps the list', () => {
  const long = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  assert.deepEqual(rememberSkill(long, 'new', 3), ['new', 'a', 'b'])
})

test('rememberSkill tolerates a missing or malformed stored list', () => {
  assert.deepEqual(rememberSkill(undefined, 'tdd'), ['tdd'])
  assert.deepEqual(rememberSkill('not a list', 'tdd'), ['tdd'])
})

const catalog = [
  { name: 'tdd', description: 'red-green' },
  { name: 'grill-me', description: 'an interview' },
]

test('resolveRecents returns catalog entries in recency order', () => {
  assert.deepEqual(resolveRecents(['grill-me', 'tdd'], catalog).map((s) => s.name), ['grill-me', 'tdd'])
})

test('resolveRecents drops names the current catalog no longer has', () => {
  assert.deepEqual(resolveRecents(['deleted-skill', 'tdd'], catalog).map((s) => s.name), ['tdd'])
})

test('resolveRecents is empty when nothing has been used', () => {
  assert.deepEqual(resolveRecents([], catalog), [])
  assert.deepEqual(resolveRecents(undefined, catalog), [])
})

test('recentsKey scopes storage to the project directory', () => {
  assert.equal(recentsKey('C:\\Users\\jamie.barker\\Desktop\\GithubProjects\\alpha-PG'), 'skp:recents:C:\\Users\\jamie.barker\\Desktop\\GithubProjects\\alpha-PG')
})

test('recentsKey is undefined without a project directory, so nothing is stored', () => {
  assert.equal(recentsKey(undefined), undefined)
  assert.equal(recentsKey(''), undefined)
})

test('composeDraft writes the slash command into an empty composer', () => {
  assert.equal(composeDraft('', 'grill-me'), '/grill-me ')
  assert.equal(composeDraft('   ', 'grill-me'), '/grill-me ')
})

test('composeDraft keeps existing text, as arguments after the command', () => {
  // The host only runs a draft whose trimmed text starts with "/", so the
  // command goes in front and the typed text is kept rather than destroyed.
  assert.equal(composeDraft('check the retry logic', 'grill-me'), '/grill-me check the retry logic')
})
