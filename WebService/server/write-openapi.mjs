/** Generate the live server's concise OpenAPI contract without replacing historical MSW docs. */
import { writeFileSync } from 'node:fs'
const paths = {}
const endpoint = (path, method, summary, { publicAccess = false, input, code = 200 } = {}) => {
  const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: { type: 'string' } }))
  paths[path] ||= {}
  paths[path][method] = {
    summary, security: publicAccess ? [] : [{ sessionCookie: [] }],
    ...(parameters.length ? { parameters } : {}),
    ...(input ? { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' }, example: input } } } } : {}),
    responses: { [code]: { description: code === 204 ? '완료, 응답 본문 없음' : 'JSON 객체 또는 배열' }, 400: { description: '입력 오류' }, 401: { description: '세션 필요' }, 403: { description: '권한 또는 Origin 오류' }, 404: { description: '데이터 없음 또는 비공개' }, 409: { description: '중복' } },
  }
}
endpoint('/health', 'get', '서버와 DB 상태', { publicAccess: true })
endpoint('/auth/login', 'post', '로그인 및 HttpOnly 세션 발급', { publicAccess: true, input: { email: 'hyeonjin@example.com', password: '1234' } })
endpoint('/auth/signup', 'post', '가입 및 빈 프로필 생성', { publicAccess: true, code: 201, input: { name: '새 동료', email: 'new@example.com', password: 'sample-password' } })
endpoint('/auth/me', 'get', '현재 세션 사용자')
endpoint('/auth/logout', 'post', '세션 폐기', { input: {}, code: 204 })
endpoint('/profiles/me', 'get', '내 공통 프로필')
endpoint('/profiles/me', 'patch', '내 프로필 저장', { input: { tagline: '함께 답을 찾는 개발자', interests: ['AI'], visibility: 'PUBLIC' } })
for (const option of ['interests', 'roles', 'style-options', 'conversation-questions']) endpoint('/' + option, 'get', '편집 선택지: ' + option)
endpoint('/public/profiles/{shareToken}', 'get', 'PUBLIC 프로필만 비로그인 조회', { publicAccess: true })
endpoint('/teams', 'get', '내가 참여한 팀')
endpoint('/teams', 'post', '팀과 소유자 참여 생성', { input: { name: '새로운 팀', description: '함께 협업할 팀입니다.' }, code: 201 })
endpoint('/teams/{teamId}', 'get', '참여 중인 팀 조회')
endpoint('/teams/{teamId}', 'patch', '소유자의 팀 정보 수정', { input: { name: '수정된 팀', description: '새 팀 소개' } })
endpoint('/teams/{teamId}', 'delete', '소유자의 팀 삭제', { code: 204 })
endpoint('/teams/{teamId}/members', 'get', '같은 팀원 목록 및 공개범위에 맞는 프로필')
endpoint('/teams/{teamId}/members/me', 'get', '내 팀별 역할과 목표')
endpoint('/teams/{teamId}/members/me', 'patch', '내 팀별 역할과 목표 저장', { input: { goal: 'API와 DB를 연결해요.', roles: ['Backend', 'AI'], projectLinks: [] } })
endpoint('/teams/{teamId}/members/{memberId}', 'get', '같은 팀원 상세')
endpoint('/team-invitations/{inviteCode}', 'get', '로그인 후 초대 정보 확인')
endpoint('/team-memberships', 'post', '초대 코드로 참여, 중복 참여는 기존 팀 반환', { input: { inviteCode: 'SKALA3' }, code: 201 })
const document = {
  openapi: '3.0.3', info: { title: 'HowToDo Service API', version: '2.0.0', description: '실제 Node.js + SQLite 서비스. 앱에서 로그인 후 세션 쿠키로 실행합니다. 8개 도메인 테이블과 sessions에 저장합니다. x-user-id 헤더는 인증에 사용하지 않습니다. 기존 API.yml은 MSW 단계의 역사적 설계 기록입니다.' },
  servers: [{ url: '/api' }], paths,
  components: { securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'howtodo_session' } } },
}
writeFileSync(new URL('../public/specs/ServiceAPI.json', import.meta.url), JSON.stringify(document, null, 2) + '\n')
console.log(JSON.stringify({ operations: Object.values(paths).reduce((sum, item) => sum + Object.keys(item).length, 0) }))
