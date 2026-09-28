/** HowToDo full-stack extension: SQLite persistence, DTO mapping and seed data. */
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomBytes, scryptSync } from 'node:crypto'
import { users } from '../src/mocks/users.js'
import { profiles } from '../src/mocks/profiles.js'
import { teams } from '../src/mocks/teams.js'
import { teamMembers } from '../src/mocks/teamMembers.js'
import { interests } from '../src/mocks/interests.js'
import { roles } from '../src/mocks/roles.js'

export function passwordHash(password) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function openDatabase(path, seed = true) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path, { timeout: 5000 })
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
  const get = (sql, ...params) => db.prepare(sql).get(...params)
  const all = (sql, ...params) => db.prepare(sql).all(...params)
  const run = (sql, ...params) => db.prepare(sql).run(...params)
  const transaction = (work) => {
    db.exec('BEGIN IMMEDIATE')
    try { const result = work(); db.exec('COMMIT'); return result }
    catch (error) { db.exec('ROLLBACK'); throw error }
  }
  const user = (id, privateFields = false) => {
    const row = get('SELECT user_id AS id, user_name AS name, user_email AS email FROM users WHERE user_id = ?', id)
    if (!row) return null
    return privateFields ? { ...row } : { id: row.id, name: row.name }
  }
  const profile = (id) => {
    const row = get('SELECT * FROM profiles WHERE user_id = ?', id)
    if (!row) return null
    return {
      userId: row.user_id, shareToken: row.profile_share_token,
      tagline: row.profile_tagline, avatar: row.profile_avatar, visibility: row.profile_visibility,
      interests: all('SELECT interest_name FROM profile_interests JOIN interests USING(interest_id) WHERE user_id = ? ORDER BY interest_id', id).map(i => i.interest_name),
      collaboration: JSON.parse(row.profile_collaboration), feedback: JSON.parse(row.profile_feedback),
      meeting: JSON.parse(row.profile_meeting), questions: JSON.parse(row.profile_questions),
      links: JSON.parse(row.profile_links),
    }
  }
  const saveProfile = (id, p) => {
    run(`UPDATE profiles SET profile_tagline=?, profile_avatar=?, profile_visibility=?,
      profile_collaboration=?, profile_feedback=?, profile_meeting=?, profile_questions=?, profile_links=? WHERE user_id=?`,
    p.tagline, p.avatar, p.visibility, JSON.stringify(p.collaboration), JSON.stringify(p.feedback),
    JSON.stringify(p.meeting), JSON.stringify(p.questions), JSON.stringify(p.links), id)
    run('DELETE FROM profile_interests WHERE user_id = ?', id)
    for (const name of p.interests) {
      run('INSERT OR IGNORE INTO interests(interest_name) VALUES(?)', name)
      run('INSERT INTO profile_interests(user_id,interest_id) SELECT ?,interest_id FROM interests WHERE interest_name=?', id, name)
    }
  }
  const team = (id) => {
    const row = get(`SELECT team_id AS id,team_name AS name,team_description AS description,
      team_invite_code AS inviteCode,owner_user_id AS ownerId,
      (SELECT COUNT(*) FROM team_members m WHERE m.team_id=t.team_id) AS memberCount
      FROM teams t WHERE team_id=?`, id)
    return row ? { ...row } : null
  }
  const membership = (row, viewerId, detailed = false) => {
    if (!row) return null
    const result = {
      id: row.member_id, teamId: row.team_id, userId: row.user_id, goal: row.member_goal,
      projectLinks: JSON.parse(row.member_project_links),
      roles: all('SELECT role_name FROM member_roles JOIN roles USING(role_id) WHERE member_id=? ORDER BY role_priority', row.member_id).map(r => r.role_name),
    }
    if (detailed) {
      result.user = user(row.user_id)
      const p = profile(row.user_id)
      result.profile = p?.visibility === 'PRIVATE' && viewerId !== row.user_id
        ? { visibility: 'PRIVATE', restricted: true } : p
    }
    return result
  }
  const saveRoles = (memberId, roleNames) => {
    run('DELETE FROM member_roles WHERE member_id=?', memberId)
    roleNames.forEach((name, index) => run('INSERT INTO member_roles(member_id,role_id,role_priority) SELECT ?,role_id,? FROM roles WHERE role_name=?', memberId, index + 1, name))
  }
  transaction(() => {
    for (const name of roles) run('INSERT OR IGNORE INTO roles(role_name) VALUES(?)', name)
    for (const name of interests) run('INSERT OR IGNORE INTO interests(interest_name) VALUES(?)', name)
    if (!seed || get('SELECT COUNT(*) AS count FROM users').count) return
    for (const u of users) {
      run('INSERT INTO users(user_id,user_name,user_email,user_password_hash) VALUES(?,?,?,?)', u.id, u.name, u.email, passwordHash(u.password))
      const p = profiles.find(item => item.userId === u.id)
      run('INSERT INTO profiles(user_id,profile_share_token) VALUES(?,?)', u.id, p.shareToken)
      saveProfile(u.id, p)
    }
    for (const t of teams) run('INSERT INTO teams(team_id,team_name,team_description,team_invite_code,owner_user_id) VALUES(?,?,?,?,?)', t.id, t.name, t.description, t.inviteCode, t.ownerId)
    for (const m of teamMembers) {
      run('INSERT INTO team_members(member_id,team_id,user_id,member_goal,member_project_links) VALUES(?,?,?,?,?)', m.id, m.teamId, m.userId, m.goal, JSON.stringify(m.projectLinks))
      saveRoles(m.id, m.roles)
    }
  })
  return { db, get, all, run, transaction, user, profile, saveProfile, team, membership, saveRoles }
}
