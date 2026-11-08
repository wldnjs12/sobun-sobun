import { api } from '../../api/client.js'
import { getMyBuilding, getMyUserId } from '../../api/currentUser.js'

/**
 * 팟(②) 화면들이 쓰는 API 함수 모음. 백엔드: pod/controller/PodController.java
 *
 * "누가 요청했나"는 X-User-Id 헤더로 보낸다. 로그인 기능이 붙으면 서버 필터가 이 헤더를
 * 토큰의 userId로 덮어쓰기 때문에, 여기서 보낸 값은 로그인 전 개발용 기본값일 뿐이다.
 */

/**
 * 지금 사용자가 등록한 건물 (① 온보딩에서 저장).
 * 여러 화면이 BUILDING.id / BUILDING.name 으로 읽고 있어서, 값 대신 "읽을 때마다 최신 값을 돌려주는" getter로 만들었다.
 * (get 키워드: 속성처럼 읽지만 실제로는 함수가 실행됨 → 건물을 새로 등록하면 화면들이 바로 새 건물을 본다)
 */
export const BUILDING = {
  get id() {
    return getMyBuilding()?.buildingId ?? null
  },
  get name() {
    const building = getMyBuilding()
    if (!building) return '우리 건물'
    const name = building.name || building.buildingName || '내 건물'
    return building.dong ? `${name} ${building.dong}` : name // 아파트면 "OO아파트 101동"
  },
}

/** 카테고리 (백엔드 PodCategory와 같은 이름·표시명) */
export const CATEGORIES = [
  { key: 'TISSUE', label: '휴지·물티슈', icon: 'layers' },
  { key: 'LAUNDRY', label: '세제·세탁', icon: 'local_laundry_service' },
  { key: 'BATH', label: '샴푸·욕실', icon: 'shower' },
  { key: 'KITCHEN', label: '주방용품', icon: 'kitchen' },
  { key: 'CLEANING', label: '청소용품', icon: 'cleaning_services' },
  { key: 'DAILY', label: '생활잡화', icon: 'shopping_basket' },
  { key: 'PROCESSED_FOOD', label: '생수·가공식품', icon: 'water_bottle' },
  { key: 'ETC', label: '기타', icon: 'inventory_2' },
]

export function categoryIcon(key) {
  return CATEGORIES.find((c) => c.key === key)?.icon ?? 'inventory_2'
}

/**
 * 팟 카드·상세에 보여줄 예시 사진 (frontend/public/pods/, 출처는 같은 폴더 CREDITS.md).
 * 팟에 사진 업로드 기능이 아직 없어서, 제목 키워드 → 카테고리 순으로 어울리는 사진을 고른다.
 * 왜 키워드를 먼저 보나: "물티슈"도 "휴지·물티슈" 카테고리라 카테고리만 보면 화장지 사진이 나온다.
 * 맞는 사진이 없으면 null → 화면은 기존처럼 카테고리 아이콘을 보여준다.
 */
const IMAGE_BY_KEYWORD = [
  ['물티슈', 'wipes'],
  ['키친타월', 'kitchen-towel'],
  ['생수', 'water'],
  ['라면', 'noodles'],
  ['세제', 'detergent'],
  ['화장지', 'tissue'],
  ['휴지', 'tissue'],
]
const IMAGE_BY_CATEGORY = { TISSUE: 'tissue', LAUNDRY: 'detergent', KITCHEN: 'kitchen-towel' }

export function podImage(pod) {
  const title = pod?.title ?? ''
  const name = IMAGE_BY_KEYWORD.find(([keyword]) => title.includes(keyword))?.[1] ?? IMAGE_BY_CATEGORY[pod?.category]
  return name ? `/pods/${name}.jpg` : null
}

const withMe = (options = {}) => ({ ...options, headers: { 'X-User-Id': String(getMyUserId()), ...options.headers } })

/** 서버 Pod 응답 → 화면용 객체 */
function toPod(raw) {
  const hasUnits = raw.unitsPerPerson != null && raw.unitLabel
  return {
    ...raw,
    // BigDecimal은 JSON 숫자로 오지만, 혹시 문자열로 와도 계산이 깨지지 않게 숫자로 맞춘다
    totalAmount: Number(raw.totalAmount),
    commissionRate: Number(raw.commissionRate),
    perPersonAmount: Number(raw.perPersonAmount),
    originalPrice: raw.originalPrice != null ? Number(raw.originalPrice) : null,
    status: raw.status ?? (raw.closed ? 'CLOSED' : 'OPEN'),
    isHost: Boolean(raw.isHost),
    // "1인 10롤" — 개수 정보가 없는 옛 팟은 "1/N 나눔"으로 보여준다
    shareLabel: hasUnits ? `1인 ${raw.unitsPerPerson}${raw.unitLabel}` : `1/${raw.targetParticipantCount} 나눔`,
    totalLabel: raw.totalUnits != null && raw.unitLabel ? `${raw.totalUnits}${raw.unitLabel}` : null,
    // 정산·픽업 화면이 pickupSpot으로 읽는다. 대표가 적은 안내가 없으면 중립 문구
    pickupSpot: raw.pickupNote || '대표가 안내하는 장소',
  }
}

/**
 * Date → "2026-10-02T22:00:00" (시간대 표시 없는 내 컴퓨터 시각).
 * 백엔드 deadline이 LocalDateTime(시간대 없음)이라, toISOString()처럼 UTC로 보내면 9시간 어긋난다.
 */
export function toLocalDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  )
}

/**
 * 내 건물 팟 목록 (서버가 요청자의 건물로 범위를 정한다).
 * @param {{ keyword?: string, category?: string, status?: 'OPEN'|'ALL', sort?: 'DEADLINE'|'NEWEST' }} filters
 */
export async function fetchNeighborhoodPods({ keyword, category, status = 'OPEN', sort } = {}) {
  const params = new URLSearchParams()
  if (keyword?.trim()) params.set('keyword', keyword.trim())
  if (category && category !== 'ALL') params.set('category', category)
  if (status) params.set('status', status)
  if (sort) params.set('sort', sort)
  const pods = await api.get(`/pods?${params}`, withMe())
  return pods.map(toPod)
}

/** 예전 이름 호환 (다른 화면이 아직 쓰고 있을 수 있음) — buildingId는 서버가 무시한다 */
export function fetchBuildingPods() {
  return fetchNeighborhoodPods()
}

/** 마이페이지: role = 'host'(내가 연 팟) | 'joined'(내가 참여한 팟) */
export async function fetchMyPods(role) {
  const pods = await api.get(`/pods/mine?role=${role}`, withMe())
  return pods.map(toPod)
}

/** 팟 상세 */
export async function fetchPod(podId) {
  return toPod(await api.get(`/pods/${podId}`, withMe()))
}

/** 팟 참여 */
export async function joinPod(podId) {
  return toPod(await api.post(`/pods/${podId}/join`, undefined, withMe()))
}

/** 팟 참여 취소 (마감 전까지, 대표는 불가) */
export async function cancelJoinPod(podId) {
  return toPod(await api.delete(`/pods/${podId}/join`, withMe()))
}

/** 팟 마감 (대표만) */
export async function closePod(podId) {
  return toPod(await api.post(`/pods/${podId}/close`, undefined, withMe()))
}

/** 모집 취소 (대표만, 마감 전까지) */
export async function cancelPod(podId) {
  return toPod(await api.post(`/pods/${podId}/cancel`, undefined, withMe()))
}

/** 폼 값 → 서버 요청 본문 (개설·수정 공용) */
function toBody(form) {
  return {
    category: form.category,
    title: form.title,
    description: form.description ?? '',
    totalAmount: form.totalAmount,
    totalUnits: form.totalUnits,
    unitLabel: form.unitLabel,
    unitsPerPerson: form.unitsPerPerson,
    targetParticipantCount: form.targetParticipantCount,
    deadline: toLocalDateTime(form.deadline),
    pickupNote: form.pickupNote ?? '',
    originalPrice: form.originalPrice,
  }
}

/** 팟 개설. 서버가 대표를 자동으로 참여시킨다(참여 1명으로 시작). */
export async function createPod(form) {
  return toPod(await api.post('/pods', { ...toBody(form), commissionRate: form.commissionRate }, withMe()))
}

/**
 * 팟 수정 (대표만, 모집중 + 다른 참여자 없을 때). PATCH라서 보낸 값만 바뀐다.
 * api.patch는 공용 client.js에 추가될 예정 (로그인 작업과 함께).
 */
export async function updatePod(podId, form) {
  return toPod(await api.patch(`/pods/${podId}`, toBody(form), withMe()))
}

/**
 * 내 참여/송금/수령 상태 + 비대면 픽업 PIN. 참여 안 했으면 PIN 없이 joined:false.
 * pickupPin은 비참여자에게 노출되면 안 돼서 일반 팟 조회(fetchPod)엔 없고 여기에만 있다.
 */
export async function fetchMyParticipation(podId) {
  return api.get(`/pods/${podId}/me`, withMe())
}

/** "보냈어요" 자가 신고 — 참여자가 대표에게 송금한 뒤 누른다 (실제 입금 여부는 앱이 확인하지 않음). */
export async function markPaid(podId) {
  return api.post(`/pods/${podId}/paid`, undefined, withMe())
}

/**
 * 참여자별 송금·수령 현황 (대표만 조회 가능).
 * 결과: [{ userId, paid, pickedUp }] — 화면에는 userId를 그대로 보여주지 않고 "이웃 1, 2…"로 바꿔 쓴다 (익명 원칙).
 */
export async function fetchParticipants(podId) {
  return api.get(`/pods/${podId}/participants`, withMe())
}

/** "수령 완료" 자가 신고 — 비대면 픽업 화면에서 쓴다. */
export async function markPickedUp(podId) {
  return api.post(`/pods/${podId}/picked-up`, undefined, withMe())
}

/**
 * 대표가 올린 상품 사진 (팟당 1장). 백엔드: pod/controller/PodImageController.java
 *
 * 사진은 <img src="/api/...">로 바로 못 띄운다 — <img>는 로그인 토큰을 못 붙여서 서버가 "같은 건물인지" 확인할 수 없기 때문.
 * 그래서 다른 API처럼 토큰을 붙여 JSON으로 받고, 그 안의 dataUrl("data:image/jpeg;base64,...")을 src에 넣는다.
 * 같은 사진을 화면마다 다시 받지 않도록 "팟 id + 버전"으로 기억해 둔다. 사진을 바꾸면 버전이 올라가서 새로 받는다.
 */
const podPhotoCache = new Map()

export function fetchPodPhoto(podId, version) {
  const key = `${podId}:${version}`
  if (!podPhotoCache.has(key)) {
    const request = api.get(`/pods/${podId}/image`, withMe()).then((image) => image.dataUrl)
    // 실패한 요청은 기억하지 않는다 → 다음에 화면을 열 때 다시 시도
    request.catch(() => podPhotoCache.delete(key))
    podPhotoCache.set(key, request)
  }
  return podPhotoCache.get(key)
}

/** 사진 등록·교체 (대표만, 글 수정과 같은 조건). 올리기 전에 800px JPEG로 줄인다. 결과: imageVersion이 올라간 팟 */
export async function uploadPodPhoto(podId, file) {
  const formData = new FormData()
  formData.append('image', await shrinkImage(file), 'photo.jpg')
  return toPod(await api.upload(`/pods/${podId}/image`, formData))
}

/** 사진 삭제 → 다시 예시 사진·아이콘으로 보인다. */
export async function deletePodPhoto(podId) {
  return toPod(await api.delete(`/pods/${podId}/image`, withMe()))
}

/**
 * 휴대폰 사진(보통 3~10MB)을 긴 변 800px JPEG(보통 200KB 안팎)로 줄인다. 서버 제한은 2MB.
 * canvas에 작게 다시 그린 뒤 JPEG로 뽑는 방식이라, 사진 속 위치 정보(EXIF)도 함께 사라진다.
 * 브라우저가 못 읽는 형식이면 원본을 그대로 보낸다 (서버가 JPG·PNG·WEBP가 아니면 거절해서 안내 문구가 뜬다).
 */
const MAX_PHOTO_SIDE = 800

async function shrinkImage(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  context.fillStyle = '#fff' // 투명 PNG의 투명한 부분이 JPEG에서 검게 나오지 않게 흰 배경을 깐다
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  return blob ?? file
}

/**
 * 팟 참여자 채팅 (대표 + 참여자만, 아니면 403). 백엔드: pod/controller/PodChatController.java
 * 결과: { myLabel, messages: [{ id, senderLabel, content, createdAt }] }
 *   - 보낸 사람은 "대표" / "이웃 N"으로만 온다 (닉네임 비공개, PRODUCT_SPEC D24)
 *   - myLabel: 내 라벨. 아직 한 번도 안 보냈으면 null → 첫 메시지를 보낸 응답의 senderLabel이 내 라벨
 * afterId를 주면 그보다 새 메시지만 온다 (실시간 연결이 끊겼을 때 빈 곳 채우기·폴링용).
 */
export async function fetchPodMessages(podId, afterId) {
  const query = afterId != null ? `?after=${afterId}` : ''
  return api.get(`/pods/${podId}/messages${query}`, withMe())
}

/** 메시지 보내기. 빈 메시지·500자 초과는 서버가 400으로 거절한다. 보낸 메시지(senderLabel 포함)를 돌려준다. */
export async function sendPodMessage(podId, content) {
  return api.post(`/pods/${podId}/messages`, { content }, withMe())
}
