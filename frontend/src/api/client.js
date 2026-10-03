const BASE_URL = '/api'

/**
 * 모든 API 응답이 { success, data, message, code? } 형태(백엔드 ApiResponse)라고 가정하고
 * data만 꺼내주는 공용 fetch 래퍼. 초보 팀원도 이 함수 하나만 알면 API를 붙일 수 있다.
 *
 * 실패하면 Error를 던지는데, 화면에서 상황별로 다르게 처리할 수 있도록
 * error.code(예: 'OUT_OF_RANGE')와 error.status(HTTP 상태 코드)를 같이 붙여준다.
 */
async function request(path, { headers, ...options } = {}) {
  // 기본 헤더 위에 호출한 쪽 헤더를 "덮어쓰지 않고 합친다" (X-User-Id 같은 헤더를 추가할 수 있게)
  const mergedHeaders = { 'Content-Type': 'application/json', ...headers }
  // 값이 undefined인 헤더는 지운다. 그대로 넘기면 fetch가 문자열 "undefined"로 보내버린다.
  Object.keys(mergedHeaders).forEach((key) => mergedHeaders[key] === undefined && delete mergedHeaders[key])

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: mergedHeaders })

  // 백엔드가 꺼져 있거나 서버 오류 페이지(HTML)가 오면 JSON이 아니라서 res.json()이 터진다.
  // 그대로 두면 "Unexpected token <" 같은 알아보기 힘든 에러가 화면에 나오므로 미리 바꿔준다.
  let json
  try {
    json = await res.json()
  } catch {
    throw Object.assign(new Error(`서버에 연결하지 못했어요 (HTTP ${res.status}). 백엔드가 켜져 있는지 확인해주세요.`), {
      status: res.status,
    })
  }

  if (!json.success) {
    throw Object.assign(new Error(json.message ?? '요청에 실패했습니다'), { code: json.code, status: res.status })
  }
  return json.data
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  /**
   * 파일 업로드(multipart). FormData를 보낼 때는 Content-Type을 직접 정하면 안 된다 —
   * 브라우저가 파일 경계값(boundary)을 붙여서 자동으로 채워주기 때문에, undefined로 지워둔다.
   */
  upload: (path, formData) =>
    request(path, { method: 'POST', body: formData, headers: { 'Content-Type': undefined } }),
}

/**
 * "다른 건물 리소스에 접근해서 거절됐다"는 에러인지 (기획 개편: 건물 소속 검증).
 * 서버 계약: 403 + code "BUILDING_ACCESS_DENIED" (docs/API_SPEC.md ②③⑤)
 * 화면에서는 이게 true면 일반 에러 문구 대신 "다른 건물이에요" 안내 화면(AccessDeniedView)을 보여준다.
 */
export function isBuildingAccessDenied(error) {
  return error?.code === 'BUILDING_ACCESS_DENIED' || error?.status === 403
}
