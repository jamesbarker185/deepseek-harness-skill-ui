'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { filterSkills } = require('../src/filter')

const skills = [
  { name: 'grill-me', description: 'A relentless interview to sharpen a plan.' },
  { name: 'tdd', description: 'Red-green-refactor test-driven development.' },
  { name: 'hyperframes', description: 'Video composition entry point.' },
]

test('empty or blank query returns every skill', () => {
  assert.equal(filterSkills(skills, '').length, 3)
  assert.equal(filterSkills(skills, '   ').length, 3)
})

test('matches on name, case-insensitive', () => {
  const out = filterSkills(skills, 'TDD')
  assert.deepEqual(out.map((s) => s.name), ['tdd'])
})

test('matches on a partial name', () => {
  const out = filterSkills(skills, 'grill')
  assert.deepEqual(out.map((s) => s.name), ['grill-me'])
})

test('matches on description text', () => {
  const out = filterSkills(skills, 'interview')
  assert.deepEqual(out.map((s) => s.name), ['grill-me'])
})

test('matches another description keyword', () => {
  const out = filterSkills(skills, 'video')
  assert.deepEqual(out.map((s) => s.name), ['hyperframes'])
})

test('no match returns an empty list', () => {
  assert.deepEqual(filterSkills(skills, 'zzz'), [])
})

test('missing description does not throw', () => {
  const sparse = [{ name: 'bare', description: undefined }]
  assert.deepEqual(filterSkills(sparse, 'bare').map((s) => s.name), ['bare'])
  assert.deepEqual(filterSkills(sparse, 'zzz'), [])
})
