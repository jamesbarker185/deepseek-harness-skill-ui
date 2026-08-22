'use strict'

// Seam S2: palette search filter.
// Query string vs a list of { name, description, ... } summaries -> filtered list.
// Pure and unit-tested; the client palette uses it directly.

function filterSkills(skills, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return skills
  return skills.filter((s) =>
    String(s.name).toLowerCase().includes(q) ||
    String(s.description || '').toLowerCase().includes(q))
}

module.exports = { filterSkills }
