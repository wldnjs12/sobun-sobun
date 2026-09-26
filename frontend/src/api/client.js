const BASE_URL = '/api'

/**
 * 모든 API 응답이 { success, data, message } 형태(백엔드 ApiResponse)라고 가정하고
 * data만 꺼내주는 공용 fetch 래퍼. 초보 팀원도 이 함수 하나만 알면 API를 붙일 수 있다.
 */
async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.message ?? '요청에 실패했습니다')
  }
  return json.data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
}
