'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { unwrapSkillList, currentSessionId } = require('../src/catalog')

test('unwrapSkillList returns the skills array from a successful envelope', () => {
  const response = { result: { ok: true, value: { skills: [{ name: 'tdd', description: 'red-green' }] } } }
  assert.deepEqual(unwrapSkillList(response).map((s) => s.name), ['tdd'])
})

test('unwrapSkillList returns an empty array when the host reports no skills', () => {
  assert.deepEqual(unwrapSkillList({ result: { ok: true, value: { skills: [] } } }), [])
})

test('unwrapSkillList throws with the host code and message on a failed call', () => {
  const response = { result: { ok: false, error: { code: 'session-not-found', message: 'session "s1" not found' } } }
  assert.throws(() => unwrapSkillList(response), /skill\.list failed: session-not-found: session "s1" not found/)
})

test('unwrapSkillList throws loudly on a missing envelope', () => {
  assert.throws(() => unwrapSkillList(undefined), /envelope/)
  assert.throws(() => unwrapSkillList({}), /envelope/)
})

test('unwrapSkillList throws loudly when a successful envelope carries no skills array', () => {
  assert.throws(() => unwrapSkillList({ result: { ok: true, value: {} } }), /skills array/)
})

test('currentSessionId reads the current selection from the sessions feed', () => {
  const sessions = { list: { getSnapshot: () => ({ current: 'ses-1', ids: ['ses-1'] }) } }
  assert.equal(currentSessionId(sessions), 'ses-1')
})

test('currentSessionId is undefined in the no-session state', () => {
  const sessions = { list: { getSnapshot: () => ({ current: undefined, ids: [] }) } }
  assert.equal(currentSessionId(sessions), undefined)
})

test('currentSessionId is undefined when the sessions service is absent', () => {
  assert.equal(currentSessionId(undefined), undefined)
  assert.equal(currentSessionId({}), undefined)
})
