-- HowToDo: eight domain tables and persistent login sessions.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL CHECK(length(user_name) BETWEEN 1 AND 30),
  user_email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  user_password_hash TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  profile_tagline TEXT NOT NULL DEFAULT '',
  profile_avatar TEXT NOT NULL DEFAULT '',
  profile_visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK(profile_visibility IN ('PUBLIC','TEAM_ONLY','PRIVATE')),
  profile_share_token TEXT NOT NULL UNIQUE,
  profile_collaboration TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(profile_collaboration)),
  profile_feedback TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(profile_feedback)),
  profile_meeting TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(profile_meeting)),
  profile_questions TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(profile_questions)),
  profile_links TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(profile_links))
) STRICT;
CREATE TABLE IF NOT EXISTS interests (
  interest_id INTEGER PRIMARY KEY AUTOINCREMENT,
  interest_name TEXT NOT NULL UNIQUE
) STRICT;
CREATE TABLE IF NOT EXISTS profile_interests (
  user_id INTEGER NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  interest_id INTEGER NOT NULL REFERENCES interests(interest_id),
  PRIMARY KEY(user_id, interest_id)
) STRICT;
CREATE TABLE IF NOT EXISTS teams (
  team_id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_name TEXT NOT NULL CHECK(length(team_name) BETWEEN 1 AND 40),
  team_description TEXT NOT NULL CHECK(length(team_description) BETWEEN 1 AND 160),
  team_invite_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  owner_user_id INTEGER NOT NULL REFERENCES users(user_id)
) STRICT;
CREATE TABLE IF NOT EXISTS team_members (
  member_id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  member_goal TEXT NOT NULL DEFAULT '',
  member_project_links TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(member_project_links)),
  UNIQUE(team_id, user_id)
) STRICT;
CREATE TABLE IF NOT EXISTS roles (
  role_id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_name TEXT NOT NULL UNIQUE
) STRICT;
CREATE TABLE IF NOT EXISTS member_roles (
  member_id INTEGER NOT NULL REFERENCES team_members(member_id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(role_id),
  role_priority INTEGER NOT NULL CHECK(role_priority BETWEEN 1 AND 3),
  PRIMARY KEY(member_id, role_id),
  UNIQUE(member_id, role_priority)
) STRICT;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS members_by_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS sessions_by_expiry ON sessions(expires_at);
