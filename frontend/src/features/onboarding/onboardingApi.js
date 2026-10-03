import { api } from '../../api/client.js'
import { getMyUserId, setMyBuilding } from '../../api/currentUser.js'

/**
 * ① 주소+GPS 건물 인증 API. 계약: docs/API_SPEC.md ① (백엔드: 최지원)
 *
 * 1차(가입 시 1회): 주소 검색 → 건물 등록
 * 2차(팟 개설·참여·커뮤니티 입장 직전마다): GPS 확인 — 판정은 반드시 서버가 한다
 *
 * TODO(최지원 ① 백엔드 PR 머지되면): USE_MOCK을 false로 바꾸면 실제 서버를 쓴다. 화면 코드는 고칠 필요 없음.
 */
const USE_MOCK = true

/**
 * 주소 후보 검색.
 * 결과: AddressCandidate[] = { roadAddress, buildingName, bdMgtSn, isApartment, dongOptions: string[] }
 */
export async function searchAddresses(keyword) {
  if (USE_MOCK) return mockSearch(keyword)
  return api.get(`/auth/addresses/search?keyword=${encodeURIComponent(keyword)}`)
}

/** 건물 확정 등록 → 결과 { buildingId, name, dong } 를 "내 건물"로 저장 */
export async function registerBuilding({ roadAddress, bdMgtSn, buildingName, dong }) {
  const building = USE_MOCK
    ? await mockRegister({ buildingName, dong })
    : await api.post(
        '/auth/buildings/register',
        { roadAddress, bdMgtSn, buildingName, dong: dong || null },
        { headers: { 'X-User-Id': String(getMyUserId()) } },
      )
  setMyBuilding(building)
  return building
}

/**
 * GPS 2차 확인. purpose: 'POD_CREATE' | 'POD_JOIN' | 'COMMUNITY_ENTER'
 * 통과하면 그냥 끝나고, 실패하면 error.reason 이 붙은 에러를 던진다:
 *   'outOfRange'  — 서버 판정: 등록한 건물 반경 밖 (code OUT_OF_RANGE)
 *   'denied'      — 브라우저 위치 권한 거부 (서버까지 안 감)
 *   'unavailable' — 위치를 못 받음: 타임아웃·신호 약함 (서버까지 안 감)
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
    if (e.code === 'OUT_OF_RANGE') throw Object.assign(new Error(e.message), { reason: 'outOfRange' })
    throw e // 그 밖의 서버 에러(연결 실패 등)는 그대로
  }
}

/** 브라우저에서 현재 위치를 받는다. 실패 원인을 reason으로 구분해서 던진다. */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error('이 기기에서는 위치를 확인할 수 없어요.'), { reason: 'unavailable' }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      // code 1 = 사용자가 권한 거부, 2 = 위치를 알 수 없음, 3 = 시간 초과
      (err) => reject(Object.assign(new Error(err.message), { reason: err.code === 1 ? 'denied' : 'unavailable' })),
      // 정확도 우선, 10초 안에 못 찾으면 실패, 예전에 저장된 위치는 쓰지 않음 (매번 재확인 원칙)
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}

// ───────────────────────── 목업 (백엔드 완성 전 임시) ─────────────────────────
// 인하대 근처(용현동·학익동)를 흉내 낸 가짜 주소. 실제 주소·건물관리번호가 아니다.
const MOCK_ADDRESSES = [
  {
    roadAddress: '인천광역시 미추홀구 인하로67번길 12 (용현동)',
    buildingName: '제니스빌',
    bdMgtSn: 'MOCK-0001',
    isApartment: false,
    dongOptions: [],
  },
  {
    roadAddress: '인천광역시 미추홀구 인하로59번길 8 (용현동)',
    buildingName: '인하하우스',
    bdMgtSn: 'MOCK-0002',
    isApartment: false,
    dongOptions: [],
  },
  {
    roadAddress: '인천광역시 미추홀구 매소홀로 220 (학익동)',
    buildingName: '학익한마음아파트',
    bdMgtSn: 'MOCK-0003',
    isApartment: true,
    dongOptions: ['101동', '102동', '103동', '104동'],
  },
  {
    // 동 목록을 안 주는 아파트 → 화면이 "동 직접 입력"으로 바뀌는지 확인용
    roadAddress: '인천광역시 미추홀구 독배로 300 (용현동)',
    buildingName: '용현그린아파트',
    bdMgtSn: 'MOCK-0004',
    isApartment: true,
    dongOptions: [],
  },
]

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function mockSearch(keyword) {
  await delay(300) // 네트워크처럼 살짝 늦게
  const q = keyword.replace(/\s/g, '')
  return MOCK_ADDRESSES.filter((a) => (a.roadAddress + a.buildingName).replace(/\s/g, '').includes(q))
}

async function mockRegister({ buildingName, dong }) {
  await delay(300)
  // 지금 백엔드의 팟·정산 API가 건물 1번 기준으로 동작해서, 목업에서는 어떤 건물을 골라도 1번으로 묶는다
  return { buildingId: 1, name: buildingName, dong: dong || null }
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
