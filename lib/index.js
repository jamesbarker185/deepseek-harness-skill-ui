// Node half of the permanent client-UI package.
// Empty on purpose: it exists so the package appears in the host loader and
// the browser half ships via exports["./client"] (dsh.client declaration).
// Mirrors the reference @deepseek-ai/dsh-client-ui-skill node half.
module.exports = {
  name: 'dsh-client-ui-skills-palette',
  apply() {},
}
