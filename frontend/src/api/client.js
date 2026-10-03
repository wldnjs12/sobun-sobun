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

  // 백엔드가 꺼져 있거나 서버 오류 페이지(HTML)가 오면 JSON이 아니라서 res.json()이 터진다.
  // 그대로 두면 "Unexpected token <" 같은 알아보기 힘든 에러가 화면에 나오므로 미리 바꿔준다.
  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(`서버에 연결하지 못했어요 (HTTP ${res.status}). 백엔드가 켜져 있는지 확인해주세요.`)
  }

  if (!json.success) {
    throw new Error(json.message ?? '요청에 실패했습니다')
  }
  return json.data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
