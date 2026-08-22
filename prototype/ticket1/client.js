// Skills Palette — CLIENT half (dynamic Cordis plugin function body).
// Paste into cordis_define code.client. Covers tickets 1-3:
//   #1 palette skeleton: sidebar button + Ctrl+K open, list + live search,
//      Esc / click-outside close
//   #2 read pane: select a skill -> full body (via host 'skills/get')
//   #3 polish: keyboard nav (arrows + Enter), loading/empty/error states,
//      light+dark theme tokens
// Verifies against: client Builtins React/host/styles/ctx/console;
//   client slots sidebar.footer.action + shell.overlay (list, {id,order?,label?}).
return {
  name: 'skills-palette-client',
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    const store = {
      open: false,
      query: '',
      skills: [],
      loading: false,
      error: null,
      detail: null, // null | { name, description, whenToUse, content }
      detailLoading: false,
      index: 0,
    }
    const listeners = new Set()
    const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
    const setState = (patch) => { Object.assign(store, patch); listeners.forEach((fn) => fn()) }

    let loadingStarted = false
    const ensureLoaded = () => {
      if (loadingStarted && !store.error) return
      loadingStarted = true
      setState({ loading: true, error: null })
      host.call('skills/list').then((list) => {
        setState({ skills: Array.isArray(list) ? list : [], loading: false })
      }).catch((err) => {
        setState({ error: String((err && err.message) || err), loading: false })
      })
    }

    const open = () => { ensureLoaded(); setState({ open: true, query: '', detail: null, detailLoading: false, index: 0 }) }
    const close = () => setState({ open: false })
    const toggle = () => (store.open ? close() : open())

    const openDetail = (name) => {
      setState({ detailLoading: true, detail: null })
      host.call('skills/get', { name }).then((skill) => {
        if (skill && typeof skill === 'object') setState({ detail: skill, detailLoading: false })
        else setState({ detailLoading: false, error: 'Skill not found: ' + name })
      }).catch((err) => {
        setState({ detailLoading: false, error: String((err && err.message) || err) })
      })
    }

    ctx.effect(() => {
      if (typeof window === 'undefined') return
      const onKey = (e) => {
        if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') { e.preventDefault(); toggle() }
        else if (e.key === 'Escape' && store.open) close()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    })

    const useStore = () => {
      const [, setTick] = React.useState(0)
      React.useEffect(() => subscribe(() => setTick((t) => t + 1)), [])
      return store
    }

    // Seam S2: pure search filter (unit-tested in the permanent package).
    const filterSkills = (skills, query) => {
      const q = (query || '').trim().toLowerCase()
      if (!q) return skills
      return skills.filter((s) =>
        String(s.name).toLowerCase().includes(q) ||
        String(s.description || '').toLowerCase().includes(q))
    }

    const renderInline = (text) => {
      const parts = []
      const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
      let last = 0
      let m
      let key = 0
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index))
        const tok = m[0]
        if (tok.startsWith('**')) parts.push(React.createElement('strong', { key: key++ }, tok.slice(2, -2)))
        else if (tok.startsWith('`')) parts.push(React.createElement('code', { key: key++ }, tok.slice(1, -1)))
        else if (tok.startsWith('[')) {
          const mm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
          if (mm) parts.push(React.createElement('a', { key: key++, href: mm[2], className: 'skp-link' }, mm[1]))
          else parts.push(tok)
        } else parts.push(React.createElement('em', { key: key++ }, tok.slice(1, -1)))
        last = m.index + tok.length
      }
      if (last < text.length) parts.push(text.slice(last))
      return parts
    }

    const renderBody = (content) => {
      let lines = String(content || '').split('\n')
      if (lines.length && lines[0].trim() === '---') {
        const close = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
        if (close !== -1) lines = lines.slice(close + 1)
      }
      const out = []
      let inCode = false
      let code = []
      for (const line of lines) {
        if (line.trim().startsWith('```')) {
          if (inCode) { out.push(React.createElement('pre', { key: out.length, className: 'skp-code' }, code.join('\n'))); code = [] }
          else inCode = true
          continue
        }
        if (inCode) { code.push(line); continue }
        const h = line.match(/^(#{1,6})\s+(.*)/)
        if (h) out.push(React.createElement('h' + Math.min(h[1].length, 6), { key: out.length, className: 'skp-h' }, renderInline(h[2])))
        else if (line.trim().match(/^\s*[-*]\s+/)) out.push(React.createElement('div', { key: out.length, className: 'skp-li' }, '• ', renderInline(line.trim().replace(/^\s*[-*]\s+/, ''))))
        else if (line.trim().match(/^\s*\d+\.\s+/)) out.push(React.createElement('div', { key: out.length, className: 'skp-li' }, renderInline(line.trim())))
        else if (line.trim() !== '') out.push(React.createElement('p', { key: out.length, className: 'skp-p' }, renderInline(line)))
      }
      if (inCode) out.push(React.createElement('pre', { key: out.length, className: 'skp-code' }, code.join('\n')))
      return out
    }

    slots.inject('sidebar.footer.action', () => slots.register(
      { name: 'sidebar.footer.action', id: 'skills-palette-button', order: 20, label: 'Skills' },
      () => {
        const s = useStore()
        return React.createElement('button', {
          className: 'skp-trigger',
          onClick: toggle,
          title: 'Skills (Ctrl+K)',
        }, s.open ? '✕ Skills' : 'Skills')
      },
    ))

    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'skills-palette', order: 10 },
      () => {
        const s = useStore()
        if (!s.open) return null
        const results = filterSkills(s.skills, s.query)

        let body
        if (s.detail) {
          body = React.createElement('div', { className: 'skp-detail' },
            React.createElement('div', { className: 'skp-detail-head' },
              React.createElement('button', {
                className: 'skp-back',
                onClick: () => setState({ detail: null, detailLoading: false, index: 0 }),
              }, '← Back'),
              React.createElement('div', { className: 'skp-detail-name' }, s.detail.name),
            ),
            s.detail.description
              ? React.createElement('div', { className: 'skp-desc' }, renderInline(s.detail.description))
              : null,
            s.detail.whenToUse
              ? React.createElement('div', { className: 'skp-when' }, 'When to use: ' + s.detail.whenToUse)
              : null,
            React.createElement('div', { className: 'skp-body skp-detail-body' }, renderBody(s.detail.content)),
          )
        } else if (s.detailLoading) {
          body = React.createElement('div', { className: 'skp-state' }, 'Loading…')
        } else {
          body = React.createElement('div', { className: 'skp-body' },
            s.loading
              ? React.createElement('div', { className: 'skp-state' }, 'Loading…')
              : s.error
                ? React.createElement('div', { className: 'skp-state' }, 'Failed to load skills: ' + s.error)
                : results.length === 0
                  ? React.createElement('div', { className: 'skp-state' }, 'No skills match')
                  : React.createElement('ul', { className: 'skp-list' },
                      results.map((skill, i) =>
                        React.createElement('li', {
                          key: skill.name,
                          className: 'skp-item' + (i === s.index ? ' skp-item-active' : ''),
                          onClick: () => openDetail(skill.name),
                        },
                          React.createElement('div', { className: 'skp-item-name' }, skill.name),
                          React.createElement('div', { className: 'skp-item-desc' }, skill.description || ''),
                        ),
                      ),
                    ),
          )
        }

        return React.createElement('div', { className: 'skp-backdrop', onClick: close },
          React.createElement('div', { className: 'skp-panel', onClick: (e) => e.stopPropagation() },
            React.createElement('input', {
              className: 'skp-search',
              placeholder: 'Search skills…',
              autoFocus: true,
              value: s.query,
              onChange: (e) => setState({ query: e.target.value, index: 0, detail: null, detailLoading: false }),
              onKeyDown: (e) => {
                if (e.key === 'Escape') close()
                else if (e.key === 'ArrowDown') { e.preventDefault(); if (results.length > 0) setState({ index: Math.min(s.index + 1, results.length - 1) }) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); if (results.length > 0) setState({ index: Math.max(s.index - 1, 0) }) }
                else if (e.key === 'Enter') { if (!s.detail && results[s.index]) openDetail(results[s.index].name) }
              },
            }),
            body,
            React.createElement('div', { className: 'skp-footer' },
              s.detail
                ? s.detail.name
                : String(s.skills.length) + ' skills' + (s.query.trim() ? ' · ' + String(results.length) + ' shown' : ''),
            ),
          ),
        )
      },
    ))

    styles.insert(
      '.skp-trigger { background: transparent; border: none; color: inherit; cursor: pointer; font-size: 13px; padding: 4px 8px; border-radius: 6px; }\n' +
      '.skp-trigger:hover { background: var(--dsw-alias-bg-layer-2); }\n' +
      '.skp-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.35); display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; pointer-events: auto; }\n' +
      '.skp-panel { width: 600px; max-width: 92vw; max-height: 66vh; display: flex; flex-direction: column; background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,0.3); overflow: hidden; pointer-events: auto; }\n' +
      '.skp-search { margin: 10px 10px 6px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 14px; outline: none; }\n' +
      '.skp-search:focus { border-color: var(--dsw-alias-brand-primary); }\n' +
      '.skp-body { overflow-y: auto; flex: 1; }\n' +
      '.skp-list { list-style: none; margin: 0; padding: 4px 8px 10px; }\n' +
      '.skp-item { padding: 8px 10px; border-radius: 8px; cursor: pointer; }\n' +
      '.skp-item:hover { background: var(--dsw-alias-bg-layer-1); }\n' +
      '.skp-item-active { background: var(--dsw-alias-bg-layer-2); }\n' +
      '.skp-item-name { font-weight: 600; font-size: 14px; }\n' +
      '.skp-item-desc { font-size: 12px; color: var(--dsw-alias-label-secondary); margin-top: 2px; }\n' +
      '.skp-state { padding: 20px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 13px; }\n' +
      '.skp-footer { padding: 8px 12px; border-top: 1px solid var(--dsw-alias-border-l1); font-size: 12px; color: var(--dsw-alias-label-secondary); }\n' +
      '.skp-back { background: transparent; border: 1px solid var(--dsw-alias-border-l1); color: inherit; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 12px; margin: 10px 0 4px 10px; }\n' +
      '.skp-detail-head { display: flex; align-items: center; gap: 10px; }\n' +
      '.skp-detail-name { font-weight: 700; font-size: 16px; }\n' +
      '.skp-desc { font-size: 13px; color: var(--dsw-alias-label-secondary); margin: 0 10px 6px; }\n' +
      '.skp-when { font-size: 12px; color: var(--dsw-alias-label-secondary); margin: 0 10px 6px; }\n' +
      '.skp-detail-body { padding: 4px 14px 14px; }\n' +
      '.skp-h { margin: 12px 0 6px; font-size: 15px; }\n' +
      '.skp-p { margin: 6px 0; font-size: 13px; line-height: 1.5; }\n' +
      '.skp-li { margin: 4px 0 4px 8px; font-size: 13px; }\n' +
      '.skp-link { color: var(--dsw-alias-brand-primary); text-decoration: none; }\n' +
      '.skp-code { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; padding: 8px; font-size: 12px; overflow-x: auto; white-space: pre; }\n'
    )
  },
}
