const getUserId = () => JSON.parse(localStorage.getItem('manual_user') || 'null')?.id

export async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId() || '',
      ...options.headers,
    },
  })
  if (response.status === 204) return null
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message || '요청을 처리하지 못했습니다.')
  return body
}
