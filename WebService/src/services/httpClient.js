export async function apiRequest(path, options = {}) {
  const mock = import.meta.env.VITE_ENABLE_MOCKS === 'true'
  const cached = mock ? JSON.parse(localStorage.getItem('manual_user') || 'null') : null
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(mock ? { 'x-user-id': cached?.id || '' } : {}),
      ...options.headers,
    },
  })
  if (response.status === 204) return null
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem('manual_user')
    throw Object.assign(new Error(body?.message || '요청을 처리하지 못했습니다.'), { status: response.status })
  }
  return body
}
