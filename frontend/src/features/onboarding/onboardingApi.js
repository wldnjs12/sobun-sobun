import { api } from '../../api/client.js'
import { getMyUserId, setMyBuilding } from '../../api/currentUser.js'

/**
 * ① 주소+GPS 건물 인증 API. 계약: docs/API_SPEC.md ① (백엔드: 최지원)
 *
 * 1차(가입 시 1회): 주소 검색 → 건물 등록
 * 2차(팟 개설·참여·커뮤니티 입장 직전마다): GPS 확인 — 판정은 반드시 서버가 한다
 *
 * ① 백엔드(PR #17)가 develop에 머지돼서 실제 서버를 쓴다 (USE_MOCK = false).
 * 백엔드 없이 화면만 볼 때는 true로 바꾸면 아래 목업으로 동작한다.
 * ⚠️ 실제 서버를 쓸 때는 반드시 false여야 한다: 목업으로 등록하면 서버에 건물 소속이 안 남아서
 *    팟 목록 등이 전부 403(다른 건물)으로 막힌다.
 */
const USE_MOCK = false

/**
 * 주소 후보 검색 (한 페이지씩).
 * 결과: { items: AddressCandidate[], totalCount, page, hasMore }
 *   AddressCandidate = { roadAddress, jibunAddress, buildingName, displayName, neighborhoodName,
 *                        bdMgtSn, isApartment, dongOptions: string[] }
 *   - buildingName은 주택·빌라면 빈 문자열("")일 수 있다 → 화면에는 displayName(예: "인하로 45")을 쓴다.
 * 실패하면 error.code: 'INVALID_KEYWORD'(400, 검색어 문제) | 'ADDRESS_API_UNAVAILABLE'(503) | 'ADDRESS_API_ERROR'(502)
 */
export async function searchAddresses(keyword, page = 1) {
  if (USE_MOCK) return mockSearch(keyword, page)
  return api.get(`/auth/addresses/search?keyword=${encodeURIComponent(keyword)}&page=${page}`)
}

/**
 * 건물 확정 등록 → 결과 { buildingId, name, dong, roadAddress, neighborhoodName, detailAddress } 를 "내 건물"로 저장.
 * detailAddress(호수·층)는 선택값이고 본인만 보는 값이다 — 서버는 다른 사용자 응답에 절대 넣지 않는다.
 */
export async function registerBuilding({ roadAddress, jibunAddress, bdMgtSn, buildingName, displayName, dong, detailAddress }) {
  const body = {
    roadAddress,
    jibunAddress: jibunAddress || null,
    bdMgtSn,
    buildingName: buildingName || null,
    displayName: displayName || null,
    dong: dong || null,
    detailAddress: detailAddress?.trim() || null,
  }
  const building = USE_MOCK
    ? await mockRegister(body)
    : await api.post('/auth/buildings/register', body, { headers: { 'X-User-Id': String(getMyUserId()) } })
  setMyBuilding(building)
  return building
}

/**
 * GPS 2차 확인. purpose: 'POD_CREATE' | 'POD_JOIN' | 'COMMUNITY_ENTER'
 * 통과하면 그냥 끝나고, 실패하면 error.reason 이 붙은 에러를 던진다:
 *   'outOfRange'  — 서버 판정: 등록한 건물 반경 밖 (code OUT_OF_RANGE)
 *   'denied'      — 브라우저 위치 권한 거부 (Geolocation code 1, 서버까지 안 감)
 *   'insecure'    — https가 아닌 주소라 브라우저가 위치를 아예 막음 (서버까지 안 감)
 *   'unsupported' — 이 브라우저/기기에 위치 기능이 없음
 *   'unavailable' — 위치를 알 수 없음: 신호 약함·GPS 꺼짐 (Geolocation code 2)
 *   'timeout'     — 시간 안에 위치를 못 받음 (Geolocation code 3)
 *   'server'      — 서버가 다른 이유로 거절(건물 미등록 등)하거나 연결 실패. 메시지는 서버 문구 그대로
 */
export async function checkLocation(purpose) {
  const { latitude, longitude } = await getCurrentPosition()
  try {
    if (USE_MOCK) {
      await mockLocationCheck()
    } else {
      await api.post(
        '/auth/location-check',
        { latitude, longitude, purpose },
        { headers: { 'X-User-Id': String(getMyUserId()) } },
      )
    }
  } catch (e) {
    const reason = e.code === 'OUT_OF_RANGE' ? 'outOfRange' : 'server'
    throw Object.assign(new Error(e.message), { reason, code: e.code, status: e.status })
  }
}

const locationError = (reason, message) => Object.assign(new Error(message), { reason })

/** Geolocation API를 Promise로 감싼다 (콜백 → await로 쓰려고). */
function requestPosition(options) {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options))
}

/**
 * 브라우저에서 현재 위치를 받는다. 실패 원인을 reason으로 구분해서 던진다.
 * 정확도 우선(GPS)으로 먼저 시도하고, 시간 초과면 와이파이·기지국 기반(저정확도)으로 한 번 더 시도한다 —
 * 실내에서는 GPS가 안 잡혀도 와이파이 위치는 금방 나오는 경우가 많아서. 예전에 저장된 위치는 쓰지 않는다(매번 재확인 원칙).
 */
async function getCurrentPosition() {
  // 브라우저는 https(또는 localhost)가 아닌 주소에서 위치 기능을 막는다. 이때는 권한 거부(code 1)처럼 보여서 원인을 헷갈리기 쉽다.
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    throw locationError('insecure', '보안 연결(https)이 아니라서 위치를 확인할 수 없어요.')
  }
  if (!navigator.geolocation) {
    throw locationError('unsupported', '이 브라우저에서는 위치를 확인할 수 없어요.')
  }
  try {
    const { coords } = await requestPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
    return { latitude: coords.latitude, longitude: coords.longitude }
  } catch (err) {
    // code 1 = 사용자가 권한 거부, 2 = 위치를 알 수 없음, 3 = 시간 초과
    if (err.code === 1) throw locationError('denied', '위치 권한이 꺼져 있어요.')
    if (err.code !== 3) throw locationError('unavailable', '위치를 확인하지 못했어요.')
  }
  try {
    const { coords } = await requestPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 0 })
    return { latitude: coords.latitude, longitude: coords.longitude }
  } catch (err) {
    if (err.code === 1) throw locationError('denied', '위치 권한이 꺼져 있어요.')
    throw locationError(err.code === 3 ? 'timeout' : 'unavailable', '위치를 확인하지 못했어요.')
  }
}

// ───────────────────────── 목업 (백엔드 완성 전 임시) ─────────────────────────
// 인하대 근처(용현동·학익동)를 흉내 낸 가짜 주소. 실제 주소·건물관리번호가 아니다.
const MOCK_ADDRESSES = [
  mock('인천광역시 미추홀구 인하로67번길 3 (용현동)', '인천광역시 미추홀구 용현동 600-1', '', 'MOCK-0001'),
  mock('인천광역시 미추홀구 인하로67번길 12 (용현동)', '인천광역시 미추홀구 용현동 601-12', '제니스빌', 'MOCK-0002'),
  mock('인천광역시 미추홀구 인하로59번길 8 (용현동)', '인천광역시 미추홀구 용현동 605-3', '인하하우스', 'MOCK-0003'),
  mock('인천광역시 미추홀구 매소홀로 220 (학익동)', '인천광역시 미추홀구 학익동 700', '학익한마음아파트', 'MOCK-0004', [
    '101동',
    '102동',
    '103동',
  ]),
  // 동 목록을 안 주는 아파트 → 화면이 "동 직접 입력"으로 바뀌는지 확인용
  mock('인천광역시 미추홀구 독배로 300 (용현동)', '인천광역시 미추홀구 용현동 650', '용현그린아파트', 'MOCK-0005', []),
]

function mock(roadAddress, jibunAddress, buildingName, bdMgtSn, dongOptions = null) {
  const roadNumber = roadAddress.replace(/\s*\(.*\)$/, '').split(' ').slice(-2).join(' ')
  return {
    roadAddress,
    jibunAddress,
    buildingName,
    displayName: buildingName || roadNumber,
    neighborhoodName: roadAddress.match(/\(([^,)]+)/)?.[1] ?? null,
    bdMgtSn,
    isApartment: dongOptions !== null,
    dongOptions: dongOptions ?? [],
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const MOCK_PAGE_SIZE = 3

async function mockSearch(keyword, page) {
  await delay(300) // 네트워크처럼 살짝 늦게
  const tokens = keyword.split(/\s+/).filter(Boolean)
  const matched = MOCK_ADDRESSES.filter((a) => {
    const text = (a.roadAddress + a.jibunAddress + a.buildingName).replace(/\s/g, '')
    return tokens.every((t) => text.includes(t))
  })
  const items = matched.slice((page - 1) * MOCK_PAGE_SIZE, page * MOCK_PAGE_SIZE)
  return { items, totalCount: matched.length, page, hasMore: page * MOCK_PAGE_SIZE < matched.length }
}

async function mockRegister({ buildingName, displayName, roadAddress, dong, detailAddress }) {
  await delay(300)
  // 지금 백엔드의 팟·정산 API가 건물 1번 기준으로 동작해서, 목업에서는 어떤 건물을 골라도 1번으로 묶는다
  return {
    buildingId: 1,
    name: buildingName || displayName,
    dong,
    roadAddress,
    neighborhoodName: roadAddress.match(/\(([^,)]+)/)?.[1] ?? null,
    detailAddress,
  }
}

// 주소 뒤에 ?mockGps=out 을 붙여 열면 그 탭에서는 "반경 밖" 실패를 흉내 낸다 (실패 바텀시트 확인용)
const MOCK_GPS_KEY = 'sobun.mockGps'
try {
  const fromUrl = new URLSearchParams(window.location.search).get('mockGps')
  if (fromUrl) sessionStorage.setItem(MOCK_GPS_KEY, fromUrl)
} catch {
  // sessionStorage를 못 쓰는 환경이면 그냥 통과 모드
}

async function mockLocationCheck() {
  await delay(400)
  let mode = null
  try {
    mode = sessionStorage.getItem(MOCK_GPS_KEY)
  } catch {
    // 무시
  }
  if (mode === 'out') {
    throw Object.assign(new Error('지금 위치가 등록한 건물과 달라요. 집에 돌아가서 다시 시도해 주세요.'), {
      code: 'OUT_OF_RANGE',
    })
  }
}
