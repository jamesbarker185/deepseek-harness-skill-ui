'use strict'

// Node half of the permanent client-UI package.
// It exists so this package appears in the host loader and its client bundle
// is composed into the web GUI (dsh.client.platform: "web").
// When the package-private RPC channel (harness) is present, it also serves
// the skill catalog and full bodies to the client half via host.call.

module.exports = {
  name: 'dsh-client-ui-skills-palette',
  apply(ctx) {
    if (typeof harness === 'undefined') return
    const skills = ctx.get('skills')
    if (skills === undefined) return
    const { shapeSummary, shapeSummaries } = require('../src/summary')
    ctx.effect(() => {
      const disposers = []
      disposers.push(harness.handle('skills/list', async () => {
        const list = await skills.list()
        return shapeSummaries(list)
      }))
      disposers.push(harness.handle('skills/get', async (args) => {
        const name = args && typeof args.name === 'string' ? args.name : ''
        if (!name) return null
        const skill = await skills.get(name)
        if (!skill) return null
        return Object.assign(shapeSummary(skill), { content: skill.content })
      }))
      return () => { disposers.forEach((d) => d()) }
    })
  },
}
