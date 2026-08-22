'use strict'

// Drives the shipped browser bundle end to end without a browser: a stub
// module loader hands the factory a stub React, apply() runs against a fake
// client context, and Ctrl+K opens the palette exactly as the shell would.

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const BUNDLE = path.join(__dirname, '..', 'lib', 'client.js')

/** Minimal React: enough for the palette's createElement/useState/useEffect use. */
function stubReact() {
  return {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children: children.flat(Infinity).filter((c) => c !== null && c !== undefined) }
    },
    useState(initial) {
      return [initial, () => {}]
    },
    useEffect(fn) {
      const cleanup = fn()
      if (typeof cleanup === 'function') cleanup()
    },
  }
}

/** All text rendered inside a stub element tree, joined. */
function textOf(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  const own = node.props && typeof node.props.value === 'string' ? '' : ''
  return own + (node.children || []).map(textOf).join(' ')
}

/** An in-memory localStorage double; `broken` models a browser that blocks it. */
function stubStorage(broken) {
  const cells = new Map()
  return {
    cells,
    face: {
      getItem: (k) => { if (broken) throw new Error('storage blocked'); return cells.has(k) ? cells.get(k) : null },
      setItem: (k, v) => { if (broken) throw new Error('storage blocked'); cells.set(k, String(v)) },
      removeItem: (k) => { cells.delete(k) },
    },
  }
}

function loadPalette(options) {
  const opts = options || {}
  const listeners = []
  const storage = stubStorage(opts.brokenStorage === true)
  if (opts.storageSeed !== undefined) {
    Object.keys(opts.storageSeed).forEach((k) => storage.cells.set(k, opts.storageSeed[k]))
  }
  const composer = { value: '', focused: 0, focus() { this.focused += 1 } }
  const sandbox = {
    document: {
      head: { appendChild: () => {} },
      createElement: () => ({ dataset: {}, textContent: '' }),
      querySelector: (selector) => (selector === 'textarea[data-phase]' ? composer : null),
    },
    console,
  }
  sandbox.window = sandbox
  sandbox.localStorage = storage.face
  sandbox.window.localStorage = storage.face
  sandbox.window.addEventListener = (type, fn) => listeners.push({ type, fn })
  sandbox.window.removeEventListener = () => {}
  let registration
  sandbox.__ModuleLoader__ = { load: (r) => { registration = r } }
  vm.runInNewContext(fs.readFileSync(BUNDLE, 'utf8'), sandbox, { filename: BUNDLE })
  const exports = registration.factory((specifier) => {
    if (specifier === 'react') return stubReact()
    throw new Error('unexpected require: ' + specifier)
  })
  return { exports, listeners, storage, composer }
}

/** A fake client context: records skill.list calls, captures slot components. */
function fakeContext({ current, respond, cwd = 'C:\\projects\\alpha-PG', draft = '' }) {
  const calls = []
  const slotComponents = new Map()
  const feedListeners = new Set()
  const state = { current }
  const summaryFor = (id) => ({ id, displayTitle: id, cwd, blank: false, running: false, updatedAt: 0 })
  const sessions = {
    list: {
      getSnapshot: () => ({
        current: state.current,
        ids: state.current === undefined ? [] : [state.current],
        byId: state.current === undefined ? {} : { [state.current]: summaryFor(state.current) },
      }),
      subscribe: (fn) => { feedListeners.add(fn); return () => feedListeners.delete(fn) },
    },
    scope: (id) => ({ agent: id }),
  }
  const selectSession = (id) => { state.current = id; feedListeners.forEach((fn) => fn()) }

  // Composer double: records every write and send through the input facade.
  const drafts = { text: draft }
  const writes = []
  let submits = 0
  const conversation = {
    input: {
      for: () => ({
        state: { getSnapshot: () => ({ draft: drafts.text }) },
        actions: {
          setDraft: (text) => { drafts.text = text; writes.push(text) },
          submit: () => { submits += 1 },
        },
      }),
    },
  }
  const connection = {
    api: {
      skills: {
        list(payload) {
          calls.push(payload)
          return Promise.resolve(respond(payload))
        },
      },
    },
  }
  const services = { sessions, connection, conversation, slots: undefined }
  const slots = {
    inject(name, fn) { fn() },
    register(meta, component) { slotComponents.set(meta.id, component); return { meta, component } },
  }
  services.slots = slots
  return {
    calls,
    slotComponents,
    selectSession,
    writes,
    submitCount: () => submits,
    draft: () => drafts.text,
    ctx: {
      get: (name) => services[name],
      effect: (fn) => { fn() },
    },
  }
}

const OK = (skills) => ({ result: { ok: true, value: { skills } } })

function pressCtrlK(listeners) {
  for (const listener of listeners) {
    if (listener.type === 'keydown') listener.fn({ ctrlKey: true, metaKey: false, key: 'k', preventDefault: () => {} })
  }
}

const flush = () => new Promise((resolve) => setImmediate(resolve))

test('opening the palette requests the current session catalog', async () => {
  const { exports, listeners } = loadPalette()
  const harness = fakeContext({ current: 'ses-1', respond: () => OK([{ name: 'tdd', description: 'red-green' }]) })
  exports.apply(harness.ctx)

  pressCtrlK(listeners)
  await flush()

  // Compared field-wise: the payload is built inside the vm realm, so its
  // prototype is not this realm's Object.prototype.
  assert.equal(harness.calls.length, 1)
  assert.equal(harness.calls[0].sessionId, 'ses-1')
  assert.deepEqual(Object.keys(harness.calls[0]), ['sessionId'])
})

test('the overlay lists the skills the host returned', async () => {
  const { exports, listeners } = loadPalette()
  const harness = fakeContext({
    current: 'ses-1',
    respond: () => OK([
      { name: 'tdd', description: 'red-green-refactor' },
      { name: 'grill-me', description: 'a relentless interview' },
    ]),
  })
  exports.apply(harness.ctx)
  pressCtrlK(listeners)
  await flush()

  const text = textOf(harness.slotComponents.get('skills-palette')())
  assert.match(text, /tdd/)
  assert.match(text, /red-green-refactor/)
  assert.match(text, /grill-me/)
  assert.match(text, /2 skills/)
})

test('a host business error is shown, not swallowed into an empty list', async () => {
  const { exports, listeners } = loadPalette()
  const harness = fakeContext({
    current: 'ses-1',
    respond: () => ({ result: { ok: false, error: { code: 'session-not-found', message: 'session "ses-1" not found' } } }),
  })
  exports.apply(harness.ctx)
  pressCtrlK(listeners)
  await flush()

  const text = textOf(harness.slotComponents.get('skills-palette')())
  assert.match(text, /Failed to load skills/)
  assert.match(text, /session-not-found/)
})

test('with no session open the palette says so and makes no request', async () => {
  const { exports, listeners } = loadPalette()
  const harness = fakeContext({ current: undefined, respond: () => OK([]) })
  exports.apply(harness.ctx)
  pressCtrlK(listeners)
  await flush()

  assert.deepEqual(harness.calls, [])
  const text = textOf(harness.slotComponents.get('skills-palette')())
  assert.match(text, /Open a session/)
})

test('switching session refetches, and the palette shows the new catalog', async () => {
  const { exports, listeners } = loadPalette()
  const bySession = {
    'ses-1': [{ name: 'tdd', description: 'red-green-refactor' }],
    'ses-2': [{ name: 'wrangler', description: 'cloudflare cli' }],
  }
  const harness = fakeContext({ current: 'ses-1', respond: (payload) => OK(bySession[payload.sessionId]) })
  exports.apply(harness.ctx)
  pressCtrlK(listeners)
  await flush()

  harness.selectSession('ses-2')
  await flush()

  assert.deepEqual(harness.calls.map((c) => c.sessionId), ['ses-1', 'ses-2'])
  const text = textOf(harness.slotComponents.get('skills-palette')())
  assert.match(text, /wrangler/)
  assert.doesNotMatch(text, /tdd/)
})

test('the cached catalog is reused while the session stays put', async () => {
  const { exports, listeners } = loadPalette()
  const harness = fakeContext({ current: 'ses-1', respond: () => OK([{ name: 'tdd', description: 'red-green' }]) })
  exports.apply(harness.ctx)
  pressCtrlK(listeners)
  await flush()
  pressCtrlK(listeners) // close
  pressCtrlK(listeners) // reopen
  await flush()

  assert.equal(harness.calls.length, 1)
})

// --- picking a skill into the composer ---

/** Every clickable row in a rendered overlay, in render order. */
function rowsOf(node, found = []) {
  if (node === null || typeof node !== 'object') return found
  if (node.type === 'li' && node.props && typeof node.props.onClick === 'function') found.push(node)
  ;(node.children || []).forEach((child) => rowsOf(child, found))
  return found
}

/** The info control inside a row, if the row carries one. */
function infoButtonOf(row) {
  const buttons = []
  const walk = (node) => {
    if (node === null || typeof node !== 'object') return
    if (node.type === 'button' && node.props && node.props.className === 'skp-info') buttons.push(node)
    ;(node.children || []).forEach(walk)
  }
  walk(row)
  return buttons[0]
}

const CATALOG = [
  { name: 'tdd', description: 'red-green-refactor' },
  { name: 'grill-me', description: 'a relentless interview' },
  { name: 'wrangler', description: 'cloudflare cli' },
]

async function openedPalette(overrides) {
  const loaded = loadPalette(overrides)
  const harness = fakeContext(Object.assign({ current: 'ses-1', respond: () => OK(CATALOG) }, overrides))
  loaded.exports.apply(harness.ctx)
  pressCtrlK(loaded.listeners)
  await flush()
  return Object.assign({}, loaded, harness, { overlay: harness.slotComponents.get('skills-palette') })
}

test('clicking a skill writes the slash command into the composer and does not send it', async () => {
  const p = await openedPalette()
  rowsOf(p.overlay())[0].props.onClick()
  await flush()

  assert.deepEqual(p.writes, ['/tdd '])
  assert.equal(p.submitCount(), 0)
})

test('picking a skill keeps text already typed, as arguments', async () => {
  const p = await openedPalette({ draft: 'check the retry logic' })
  rowsOf(p.overlay())[0].props.onClick()
  await flush()

  assert.equal(p.draft(), '/tdd check the retry logic')
})

test('picking a skill closes the palette and focuses the composer', async () => {
  const p = await openedPalette()
  rowsOf(p.overlay())[0].props.onClick()
  await flush()

  assert.equal(p.overlay(), null, 'the overlay renders nothing once closed')
  assert.equal(p.composer.focused, 1)
})

test('a picked skill is remembered for the project and listed as recent next time', async () => {
  const p = await openedPalette()
  rowsOf(p.overlay())[1].props.onClick() // grill-me
  await flush()

  assert.equal(p.storage.cells.get('skp:recents:C:\\projects\\alpha-PG'), JSON.stringify(['grill-me']))

  pressCtrlK(p.listeners) // reopen
  await flush()
  const text = textOf(p.overlay())
  assert.match(text, /Recent/)
  // The recents section leads, so grill-me is now the first row.
  assert.equal(rowsOf(p.overlay())[0].props['data-skill'], 'grill-me')
})

test('recents are hidden while searching, and the list is the filtered one', async () => {
  const p = await openedPalette()
  rowsOf(p.overlay())[1].props.onClick()
  await flush()
  pressCtrlK(p.listeners)
  await flush()

  // Type into the search box exactly as the shell would.
  const input = (function find(node) {
    if (node === null || typeof node !== 'object') return undefined
    if (node.type === 'input') return node
    for (const child of node.children || []) {
      const hit = find(child)
      if (hit !== undefined) return hit
    }
    return undefined
  })(p.overlay())
  input.props.onChange({ target: { value: 'wrangler' } })

  const text = textOf(p.overlay())
  assert.doesNotMatch(text, /Recent/)
  assert.match(text, /wrangler/)
  assert.doesNotMatch(text, /grill-me/)
})

test('a recent skill the catalog no longer carries is not listed', async () => {
  const p = await openedPalette()
  p.storage.cells.set('skp:recents:C:\\projects\\alpha-PG', JSON.stringify(['deleted-skill']))
  pressCtrlK(p.listeners) // close
  pressCtrlK(p.listeners) // reopen, re-reads storage
  await flush()

  const text = textOf(p.overlay())
  assert.doesNotMatch(text, /deleted-skill/)
  assert.doesNotMatch(text, /Recent/)
})

test('blocked browser storage does not break picking a skill', async () => {
  const p = await openedPalette({ brokenStorage: true })
  rowsOf(p.overlay())[0].props.onClick()
  await flush()

  assert.deepEqual(p.writes, ['/tdd '])
})

test('the info control opens the read pane instead of inserting', async () => {
  const p = await openedPalette()
  const info = infoButtonOf(rowsOf(p.overlay())[0])
  assert.notEqual(info, undefined, 'each row carries an info control')
  info.props.onClick({ stopPropagation: () => {} })
  await flush()

  assert.deepEqual(p.writes, [], 'reading a skill writes nothing to the composer')
  const text = textOf(p.overlay())
  assert.match(text, /← Back/)
  assert.match(text, /tdd/)
})

// --- the always-visible sidebar panel ---

/** The sidebar footer component, rendered for a wide or rail column. */
function panelOf(p, wide = true) {
  return p.slotComponents.get('skills-panel')({ wide })
}

/** The search box inside a rendered tree, if there is one. */
function searchBoxOf(node) {
  if (node === null || typeof node !== 'object') return undefined
  if (node.type === 'input') return node
  for (const child of node.children || []) {
    const hit = searchBoxOf(child)
    if (hit !== undefined) return hit
  }
  return undefined
}

/** The panel's expand/collapse control. */
function toggleOf(node) {
  const found = []
  const walk = (n) => {
    if (n === null || typeof n !== 'object') return
    if (n.type === 'button' && n.props && n.props.className === 'skp-panel-toggle') found.push(n)
    ;(n.children || []).forEach(walk)
  }
  walk(node)
  return found[0]
}

async function mounted(overrides) {
  const loaded = loadPalette(overrides)
  const harness = fakeContext(Object.assign({ current: 'ses-1', respond: () => OK(CATALOG) }, overrides))
  loaded.exports.apply(harness.ctx)
  await flush()
  return Object.assign({}, loaded, harness, { overlay: harness.slotComponents.get('skills-palette') })
}

test('the sidebar lists the skills on a first visit, without being asked', async () => {
  const p = await mounted()
  const panel = panelOf(p)

  assert.match(textOf(panel), /Skills/)
  assert.notEqual(searchBoxOf(panel), undefined, 'the section starts expanded')
  assert.deepEqual(p.calls.map((c) => c.sessionId), ['ses-1'])
  assert.deepEqual(rowsOf(panel).map((r) => r.props['data-skill']), ['tdd', 'grill-me', 'wrangler'])
})

test('collapsing the section applies to the session; the next visit starts expanded', async () => {
  const first = await mounted()
  toggleOf(panelOf(first)).props.onClick()
  await flush()
  assert.equal(searchBoxOf(panelOf(first)), undefined)

  // A fresh mount, as a page refresh would, starts expanded again.
  const second = await mounted()
  assert.notEqual(searchBoxOf(panelOf(second)), undefined, 'the section comes back expanded')
  assert.deepEqual(second.calls.map((c) => c.sessionId), ['ses-1'])
})

test('collapsing hides the list; re-expanding shows it again from cache', async () => {
  const p = await mounted()
  assert.notEqual(searchBoxOf(panelOf(p)), undefined)

  toggleOf(panelOf(p)).props.onClick()
  await flush()
  assert.equal(searchBoxOf(panelOf(p)), undefined)

  toggleOf(panelOf(p)).props.onClick()
  await flush()
  assert.notEqual(searchBoxOf(panelOf(p)), undefined)
  assert.equal(p.calls.length, 1, 'no refetch: the catalog is cached')
})

test('picking from the sidebar writes to the composer and leaves the section open', async () => {
  const p = await mounted()
  rowsOf(panelOf(p))[0].props.onClick()
  await flush()

  assert.deepEqual(p.writes, ['/tdd '])
  assert.equal(p.submitCount(), 0)
  assert.notEqual(searchBoxOf(panelOf(p)), undefined, 'the panel does not close on a pick')
})

test('searching inside the sidebar section filters it', async () => {
  const p = await mounted()
  searchBoxOf(panelOf(p)).props.onChange({ target: { value: 'wrangler' } })

  assert.deepEqual(rowsOf(panelOf(p)).map((r) => r.props['data-skill']), ['wrangler'])
})

test('recents lead the sidebar list once a skill has been picked', async () => {
  const p = await mounted()
  rowsOf(panelOf(p))[2].props.onClick() // wrangler
  await flush()

  const panel = panelOf(p)
  assert.match(textOf(panel), /Recent/)
  assert.equal(rowsOf(panel)[0].props['data-skill'], 'wrangler')
})

test('the info control in the sidebar opens the read pane in the overlay', async () => {
  const p = await mounted()
  infoButtonOf(rowsOf(panelOf(p))[0]).props.onClick({ stopPropagation: () => {} })
  await flush()

  assert.deepEqual(p.writes, [])
  const text = textOf(p.overlay())
  assert.match(text, /← Back/)
  assert.match(text, /tdd/)
})

test('opening the palette during the first load does not fire a second request', async () => {
  const loaded = loadPalette()
  const harness = fakeContext({ current: 'ses-1', respond: () => OK(CATALOG) })
  loaded.exports.apply(harness.ctx) // the sidebar section starts its load here
  pressCtrlK(loaded.listeners) // opened before that load settles
  await flush()

  assert.equal(harness.calls.length, 1)
})

test('the section header has a control that opens the full palette', async () => {
  const p = await mounted()
  const expand = (function find(node) {
    if (node === null || typeof node !== 'object') return undefined
    if (node.props && node.props.className === 'skp-open-full') return node
    for (const child of node.children || []) {
      const hit = find(child)
      if (hit !== undefined) return hit
    }
    return undefined
  })(panelOf(p))

  assert.notEqual(expand, undefined, 'the header carries an open-palette control')
  expand.props.onClick({ stopPropagation: () => {} })
  await flush()

  assert.notEqual(p.overlay(), null, 'the overlay is open')
  assert.notEqual(searchBoxOf(panelOf(p)), undefined, 'the sidebar section is untouched')
})

test('a narrow sidebar rail shows only the compact control', async () => {
  const p = await mounted()
  const rail = panelOf(p, false)

  assert.equal(searchBoxOf(rail), undefined)
  assert.equal(rowsOf(rail).length, 0)
})

test('the read pane opens from the summary and says when no body is available', async () => {
  const { exports, listeners } = loadPalette()
  const harness = fakeContext({
    current: 'ses-1',
    respond: () => OK([{ name: 'tdd', description: 'red-green-refactor', whenToUse: 'building features' }]),
  })
  exports.apply(harness.ctx)
  pressCtrlK(listeners)
  await flush()

  const overlay = harness.slotComponents.get('skills-palette')
  const rows = rowsOf(overlay())
  assert.equal(rows.length, 1)
  infoButtonOf(rows[0]).props.onClick({ stopPropagation: () => {} })
  await flush()

  const text = textOf(overlay())
  assert.match(text, /tdd/)
  assert.match(text, /When to use: building features/)
  assert.match(text, /body is not available/i)
})

test('a session with an empty catalog is distinguished from a filtered-out list', async () => {
  const { exports, listeners } = loadPalette()
  const harness = fakeContext({ current: 'ses-1', respond: () => OK([]) })
  exports.apply(harness.ctx)
  pressCtrlK(listeners)
  await flush()

  const text = textOf(harness.slotComponents.get('skills-palette')())
  assert.match(text, /No skills available/)
})
