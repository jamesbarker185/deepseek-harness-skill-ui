'use strict'

// Regression test for the boot failure:
//   "invalid plugin, expect function or object with an 'apply' method, received undefined"
// The client module loader takes the factory's return value as the module
// exports. The factory must return module.exports.

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const BUNDLE = path.join(__dirname, '..', 'lib', 'client.js')
const ID = '@jamiebarker/dsh-client-ui-skills-palette'

function loadBundle() {
  const registrations = []
  const styles = []
  const head = { appendChild: (node) => styles.push(node) }
  const sandbox = {
    document: {
      head,
      querySelector: () => null,
      createElement: () => ({ dataset: {}, textContent: '' }),
    },
    console,
  }
  sandbox.window = sandbox
  sandbox.__ModuleLoader__ = { load: (registration) => registrations.push(registration) }
  vm.runInNewContext(fs.readFileSync(BUNDLE, 'utf8'), sandbox, { filename: BUNDLE })
  return { registrations, sandbox }
}

test('the bundle registers itself under the package id', () => {
  const { registrations } = loadBundle()
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].id, ID)
  assert.equal(typeof registrations[0].factory, 'function')
})

test('the factory returns a plugin object with an apply method', () => {
  const { registrations } = loadBundle()
  const stubReact = { createElement: () => null, useState: () => [0, () => {}], useEffect: () => {} }
  const exports = registrations[0].factory((specifier) => {
    if (specifier === 'react') return stubReact
    throw new Error('unexpected require: ' + specifier)
  })

  assert.notEqual(exports, undefined, 'factory must return module.exports')
  assert.equal(typeof exports, 'object')
  assert.equal(typeof exports.apply, 'function')
})
