'use strict'

// Seam S2: skill catalog retrieval.
// The host route is `skill.list`. It takes { sessionId } and answers an
// RPC envelope — { result: { ok, value: { skills } } } — not a bare array.
// Both helpers are pure; lib/client.js mirrors them into the browser bundle.

/**
 * Read the skills array out of a skill.list response.
 * Fails loud: a business error becomes a thrown Error carrying the host's
 * code and message, so the palette shows the cause instead of an empty list.
 */
function unwrapSkillList(response) {
  const result = response === undefined || response === null ? undefined : response.result
  if (result === undefined || result === null) {
    throw new Error('skill.list returned no result envelope')
  }
  if (!result.ok) {
    const error = result.error || {}
    throw new Error(`skill.list failed: ${error.code || 'unknown'}: ${error.message || 'no message'}`)
  }
  const skills = result.value === undefined || result.value === null ? undefined : result.value.skills
  if (!Array.isArray(skills)) {
    throw new Error('skill.list succeeded without a skills array')
  }
  return skills
}

/**
 * The session whose catalog the palette shows: the one the shell has open.
 * Undefined means the no-session state, which is a view state, not an error.
 */
function currentSessionId(sessions) {
  if (sessions === undefined || sessions === null) return undefined
  const list = sessions.list
  if (list === undefined || list === null || typeof list.getSnapshot !== 'function') return undefined
  const snapshot = list.getSnapshot()
  if (snapshot === undefined || snapshot === null) return undefined
  return snapshot.current
}

module.exports = { unwrapSkillList, currentSessionId }
