'use strict'

// Seam S3: recently used skills, and the draft text a pick produces.
// Recency is recorded when a skill is inserted into the composer, kept in
// browser storage per project directory. Pure; lib/client.js mirrors it.

const RECENT_LIMIT = 8

/** Move `name` to the front of the recency list, deduped and capped. */
function rememberSkill(recent, name, limit = RECENT_LIMIT) {
  const list = Array.isArray(recent) ? recent : []
  return [name].concat(list.filter((entry) => entry !== name)).slice(0, limit)
}

/**
 * The recency list as catalog entries. Names the catalog no longer carries
 * are dropped: a renamed or removed skill must not sit in the list.
 */
function resolveRecents(recent, skills) {
  const list = Array.isArray(recent) ? recent : []
  const byName = new Map(skills.map((skill) => [skill.name, skill]))
  return list.map((name) => byName.get(name)).filter((skill) => skill !== undefined)
}

/** Storage key for one project. Undefined cwd means: do not store anything. */
function recentsKey(cwd) {
  if (typeof cwd !== 'string' || cwd === '') return undefined
  return `skp:recents:${cwd}`
}

/**
 * The draft a pick produces. The host runs a message as a command only when
 * the trimmed draft starts with "/", so the command leads and anything
 * already typed follows it as arguments instead of being overwritten.
 */
function composeDraft(draft, name) {
  const existing = typeof draft === 'string' ? draft.trim() : ''
  return existing === '' ? `/${name} ` : `/${name} ${existing}`
}

module.exports = { rememberSkill, resolveRecents, recentsKey, composeDraft, RECENT_LIMIT }
