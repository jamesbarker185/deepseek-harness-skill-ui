// Skills Palette — HOST half (dynamic Cordis plugin function body).
// Paste into cordis_define code.host. Verifies against:
//   host Builtins: ctx, harness (handle), console
//   host service: skills (ctx.get('skills')) — list() -> SkillSummary[],
//                 get(name) -> SkillDefinition | undefined ({ content }).
return {
  name: 'skills-palette-host',
  apply(ctx) {
    const skills = ctx.get('skills')
    if (skills === undefined) return
    ctx.effect(() => {
      const disposers = []
      disposers.push(harness.handle('skills/list', async () => {
        const list = await skills.list()
        return list.map((s) => ({ name: s.name, description: s.description, whenToUse: s.whenToUse }))
      }))
      disposers.push(harness.handle('skills/get', async (args) => {
        const name = args && typeof args.name === 'string' ? args.name : ''
        if (!name) return null
        const skill = await skills.get(name)
        if (!skill) return null
        return { name: skill.name, description: skill.description, whenToUse: skill.whenToUse, content: skill.content }
      }))
      return () => { disposers.forEach((d) => d()) }
    })
  },
}
