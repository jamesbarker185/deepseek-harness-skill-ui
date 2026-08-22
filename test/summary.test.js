'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { shapeSummary, shapeSummaries } = require('../src/summary')

test('shapeSummary keeps only the leaf fields the UI renders', () => {
  const input = {
    name: 'grill-me',
    description: 'A relentless interview to sharpen a plan.',
    whenToUse: 'When the user wants their plan stress-tested.',
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'user-dsh',
    provider: 'filesystem',
    path: 'C:/x/grill-me',
  }
  assert.deepEqual(shapeSummary(input), {
    name: 'grill-me',
    description: 'A relentless interview to sharpen a plan.',
    whenToUse: 'When the user wants their plan stress-tested.',
  })
})

test('shapeSummary omits whenToUse when it is absent', () => {
  assert.deepEqual(shapeSummary({ name: 'a', description: 'b' }), { name: 'a', description: 'b' })
})

test('shapeSummary omits whenToUse when it is empty', () => {
  assert.deepEqual(shapeSummary({ name: 'a', description: 'b', whenToUse: '' }), { name: 'a', description: 'b' })
})

test('shapeSummaries maps a whole list', () => {
  const list = [
    { name: 'grill-me', description: 'Interview.' },
    { name: 'tdd', description: 'Red-green loop.', whenToUse: 'Before code.' },
  ]
  assert.deepEqual(shapeSummaries(list), [
    { name: 'grill-me', description: 'Interview.' },
    { name: 'tdd', description: 'Red-green loop.', whenToUse: 'Before code.' },
  ])
})
