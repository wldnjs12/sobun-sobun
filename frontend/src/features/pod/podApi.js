import { api } from '../../api/client.js'
import { getMyBuilding, getMyUserId, rememberJoined } from '../../api/currentUser.js'

/**
 * 팟(②) 화면들이 쓰는 API 함수 모음. 백엔드: origin/feature/pod-realtime (docs/handoff/pod.md)
 *
 * 서버 응답(Pod)에는 화면에 필요한 사진·픽업 장소 같은 필드가 없어서,
 * toPod()에서 기본값을 채워 화면들이 항상 같은 모양의 객체를 받게 한다.
 * 백엔드에 필드가 추가되면 toPod()의 기본값 부분만 고치면 된다.
 */

/**
 * 지금 사용자가 등록한 건물 (① 온보딩에서 저장).
 * 여러 화면이 BUILDING.id / BUILDING.name 으로 읽고 있어서, 값 대신 "읽을 때마다 최신 값을 돌려주는" getter로 만들었다.
 * (get 키워드: 속성처럼 읽지만 실제로는 함수가 실행됨 → 건물을 새로 등록하면 화면들이 바로 새 건물을 본다)
 * 아직 등록 전이면 데모용 기본값을 쓰는데, App.jsx가 등록 전에는 이 화면들로 못 들어오게 막는다.
 */
const DEFAULT_BUILDING = { buildingId: 1, name: '제니스빌', dong: null }
export const BUILDING = {
  get id() {
    return (getMyBuilding() ?? DEFAULT_BUILDING).buildingId
  },
  get name() {
    const { name, dong } = getMyBuilding() ?? DEFAULT_BUILDING
    return dong ? `${name} ${dong}` : name // 아파트면 "OO아파트 101동"
  },
}
const DEFAULT_PICKUP_SPOT = '1층 무인락커'

/** 서버 Pod 응답 → 화면용 객체 */
function toPod(raw) {
  return {
    ...raw,
    // BigDecimal은 JSON 숫자로 오지만, 혹시 문자열로 와도 계산이 깨지지 않게 숫자로 맞춘다
    totalAmount: Number(raw.totalAmount),
    commissionRate: Number(raw.commissionRate),
    perPersonAmount: Number(raw.perPersonAmount),
    // originalPrice는 백엔드에 실제로 추가됐음(팟 생성 시 선택 입력) — 있으면 숫자로, 없으면(null) 절약액 카드를 안 보여줌
    originalPrice: raw.originalPrice != null ? Number(raw.originalPrice) : null,
    // ↓ 여전히 API에 없는 화면용 필드
    imageUrl: null,
    unitLabel: `1/${raw.targetParticipantCount} 소분`,
    pickupSpot: DEFAULT_PICKUP_SPOT,
    category: null,
  }
}

/**
 * Date → "2026-10-02T22:00:00" (시간대 표시 없는 내 컴퓨터 시각).
 * 백엔드 deadline이 LocalDateTime(시간대 없음)이라, toISOString()처럼 UTC로 보내면 9시간 어긋난다.
 */
function toLocalDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  )
}

/** 건물의 진행중(미마감) 팟 목록, 최신순 */
export async function fetchBuildingPods(buildingId) {
  const pods = await api.get(`/pods?buildingId=${buildingId}`)
  return pods.map(toPod)
}

/** 팟 상세 */
export async function fetchPod(podId) {
  return toPod(await api.get(`/pods/${podId}`))
}

/** 팟 참여 */
export async function joinPod(podId) {
  try {
    const pod = toPod(await api.post(`/pods/${podId}/join?userId=${getMyUserId()}`))
    rememberJoined(podId)
    return pod
  } catch (e) {
    // 다른 창/기기에서 이미 참여한 경우: 브라우저 기억만 맞춰주고 최신 상태를 돌려준다
    if (e.message.includes('이미 참여한')) {
      rememberJoined(podId)
      return fetchPod(podId)
    }
    throw e
  }
}

/** 팟 마감 (팟장만 가능) */
export async function closePod(podId) {
  return toPod(await api.post(`/pods/${podId}/close?hostUserId=${getMyUserId()}`))
}

/**
 * 팟 개설.
 * 서버는 팟을 참여자 0명으로 만들기 때문에, "나누어 살 인원(본인 포함)"에 맞추려면
 * 만든 직후 팟장 본인을 참여시켜야 한다.
 */
export async function createPod({ title, totalAmount, originalPrice, targetParticipantCount, commissionRate, deadline }) {
  const created = await api.post('/pods', {
    buildingId: BUILDING.id,
    hostUserId: getMyUserId(),
    title,
    totalAmount,
    originalPrice,
    targetParticipantCount,
    commissionRate,
    deadline: toLocalDateTime(deadline),
  })
  return joinPod(created.id)
}

/**
 * 내 참여/송금/수령 상태 + 비대면 픽업 PIN. 참여 안 했으면 PIN 없이 joined:false.
 * pickupPin은 비참여자에게 노출되면 안 돼서(락커 보안) 일반 팟 조회(fetchPod)엔 없고 여기에만 있다.
 */
export async function fetchMyParticipation(podId) {
  return api.get(`/pods/${podId}/me?userId=${getMyUserId()}`)
}

/** "수령 완료" 자가 신고 — 비대면 픽업 화면에서 쓴다. */
export async function markPickedUp(podId) {
  return api.post(`/pods/${podId}/picked-up?userId=${getMyUserId()}`)
}
