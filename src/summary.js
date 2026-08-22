'use strict'

// Seam S1: skill catalog shaping.
// Takes SkillSummary-shaped objects (name, description, whenToUse?, ...)
// and returns the minimal plain-JSON shape the client renders.
// Pure and unit-tested; the host bridge and any RPC mapping use it.

function shapeSummary(skill) {
  const out = { name: skill.name, description: skill.description }
  if (skill.whenToUse !== undefined && skill.whenToUse !== null && skill.whenToUse !== '') {
    out.whenToUse = skill.whenToUse
  }
  return out
}

function shapeSummaries(list) {
  return list.map(shapeSummary)
}

module.exports = { shapeSummary, shapeSummaries }
