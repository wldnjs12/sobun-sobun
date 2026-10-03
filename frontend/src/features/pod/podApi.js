import { api } from '../../api/client.js'
import { getMyUserId, rememberJoined } from './currentUser.js'

/**
 * 팟(②) 화면들이 쓰는 API 함수 모음. 백엔드: origin/feature/pod-realtime (docs/handoff/pod.md)
 *
 * 서버 응답(Pod)에는 화면에 필요한 사진·픽업 장소 같은 필드가 없어서,
 * toPod()에서 기본값을 채워 화면들이 항상 같은 모양의 객체를 받게 한다.
 * 백엔드에 필드가 추가되면 toPod()의 기본값 부분만 고치면 된다.
 */

// TODO: 온보딩(①)에서 인증한 건물로 교체
export const BUILDING = { id: 1, name: '신촌 청년드림빌' }
const DEFAULT_PICKUP_SPOT = '1층 무인락커'

/** 서버 Pod 응답 → 화면용 객체 */
function toPod(raw) {
  return {
    ...raw,
    // BigDecimal은 JSON 숫자로 오지만, 혹시 문자열로 와도 계산이 깨지지 않게 숫자로 맞춘다
    totalAmount: Number(raw.totalAmount),
    commissionRate: Number(raw.commissionRate),
    perPersonAmount: Number(raw.perPersonAmount),
    // ↓ API에 없는 화면용 필드 (백엔드와 협의 필요)
    imageUrl: null,
    unitLabel: `1/${raw.targetParticipantCount} 소분`,
    pickupSpot: DEFAULT_PICKUP_SPOT,
    originalPrice: null,
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
export async function createPod({ title, totalAmount, targetParticipantCount, commissionRate, deadline }) {
  const created = await api.post('/pods', {
    buildingId: BUILDING.id,
    hostUserId: getMyUserId(),
    title,
    totalAmount,
    targetParticipantCount,
    commissionRate,
    deadline: toLocalDateTime(deadline),
  })
  return joinPod(created.id)
}
