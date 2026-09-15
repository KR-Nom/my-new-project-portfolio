import { users as seedUsers } from './users'
import { profiles as seedProfiles } from './profiles'
import { teams as seedTeams } from './teams'
import { teamMembers as seedMembers } from './teamMembers'

const clone = (value) => JSON.parse(JSON.stringify(value))
const read = (key, seed) => JSON.parse(localStorage.getItem(key) || 'null') || clone(seed)

export const mockStore = {
  users: read('manual_users', seedUsers),
  profiles: read('manual_profiles', seedProfiles),
  teams: read('manual_teams', seedTeams),
  members: read('manual_members', seedMembers),
  save() {
    localStorage.setItem('manual_users', JSON.stringify(this.users))
    localStorage.setItem('manual_profiles', JSON.stringify(this.profiles))
    localStorage.setItem('manual_teams', JSON.stringify(this.teams))
    localStorage.setItem('manual_members', JSON.stringify(this.members))
  },
}
