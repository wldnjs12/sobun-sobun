import { api } from './client.js'

/**
 * "나"가 누구인지(로그인 세션)와 "내 건물", "내가 참여한 팟"을 기억하는 곳.
 *
 * 2026-11 기획 개편: 아이디·비밀번호 로그인이 생겼다.
 *   - 예전에는 로그인이 없어서 모든 방문자가 userId=1이었고, 주소에 ?user=2 를 붙이면 남이 될 수 있었다 → 제거.
 *   - 이제 로그인하면 서버가 토큰을 주고, 그 토큰(localStorage)이 곧 "나"다. client.js가 모든 요청에 자동으로 붙인다.
 *   - 서버는 토큰으로 userId를 직접 알아내므로, 화면에서 보내는 userId 값은 서버가 무시하고 덮어쓴다(사칭 불가).
 *   - "내 건물"은 서버(/api/account/me)가 원본이다. 여기 localStorage 값은 화면을 빨리 그리기 위한 사본(캐시)일 뿐이라
 *     새로고침·다른 기기에서도 loadMe()로 서버 값을 다시 받아온다.
 *
 * localStorage는 시크릿 창 등에서 막힐 수 있어서 읽기/쓰기를 전부 try/catch로 감쌌다.
 */

const SESSION_KEY = 'sobun.session' // { token, userId, nickname, loginId? }

function read(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 저장 못 해도 이번 화면에서는 동작하므로 무시
  }
}

function remove(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // 무시
  }
}

function readSession() {
  try {
    return JSON.parse(read(SESSION_KEY))
  } catch {
    return null
  }
}

// ── 로그인 세션 ──

/** 로그인·회원가입 응답({ token, userId, nickname })을 저장한다. */
export function setSession({ token, userId, nickname, loginId }) {
  write(SESSION_KEY, JSON.stringify({ token, userId: Number(userId), nickname, loginId }))
}

/** 저장된 세션과 그 사용자의 건물 사본을 지운다 (참여 기록 등 사용자별 기록은 남겨둔다 — 다시 로그인하면 이어서 보이게). */
export function clearSession() {
  const userId = getMyUserId()
  if (userId) remove(`sobun.building.${userId}`)
  remove(SESSION_KEY)
}

export function getToken() {
  return readSession()?.token ?? null
}

export function isLoggedIn() {
  return Boolean(getToken())
}

/** 로그인한 내 userId. 로그인 전이면 null. */
export function getMyUserId() {
  const id = Number(readSession()?.userId)
  return id || null
}

export function getMyNickname() {
  return readSession()?.nickname ?? null
}

/**
 * 서버에서 내 정보(닉네임·건물)를 받아와 저장한다. 앱 시작 시(App.jsx)와 로그인 직후에 부른다.
 * 결과: { userId, loginId, nickname, building: null | {...} }
 */
export async function loadMe() {
  const me = await api.get('/account/me')
  const session = readSession()
  if (session) write(SESSION_KEY, JSON.stringify({ ...session, nickname: me.nickname, loginId: me.loginId }))
  if (me.building) {
    const b = me.building
    // 다른 화면(podApi의 BUILDING 등)이 { buildingId, name, dong } 모양으로 읽고 있어서 그 모양에 맞춘다
    setMyBuilding({
      buildingId: b.buildingId,
      name: b.buildingName,
      dong: b.dong,
      roadAddress: b.roadAddress,
      detailAddress: b.detailAddress,
      neighborhoodName: b.neighborhoodName,
    })
  } else {
    clearMyBuilding()
  }
  return me
}

/**
 * 로그아웃: 서버 토큰을 지우고(실패해도 상관없음) 이 브라우저의 세션도 지운 뒤 로그인 화면으로 간다.
 * 페이지를 새로 여는 방식(location.replace)이라 열려 있던 실시간 연결·화면 상태도 같이 깨끗하게 정리된다.
 * 마이페이지 등에서는 onClick={logout} 으로 쓰면 된다.
 */
export async function logout() {
  try {
    if (isLoggedIn()) await api.delete('/account/session')
  } catch {
    // 이미 만료된 토큰이면 서버가 401을 주는데, 어차피 지울 거라 무시
  }
  clearSession()
  window.location.replace('/login')
}

// ── 내가 참여한 팟 ("누가 참여했는지" 조회 API가 없어서 이 브라우저가 기억) ──

// 사용자마다 따로 기억해야 한 브라우저에서 계정을 바꿔도 섞이지 않는다
const joinedKey = () => `sobun.joinedPods.${getMyUserId()}`

function readJoined() {
  try {
    return JSON.parse(read(joinedKey())) ?? []
  } catch {
    return []
  }
}

/** 마이페이지(15)에서 "내가 참여한 팟" 목록을 그릴 때 쓴다 */
export function getJoinedPodIds() {
  return readJoined()
}

export function hasJoined(podId) {
  return readJoined().includes(Number(podId))
}

export function rememberJoined(podId) {
  const ids = readJoined()
  if (!ids.includes(Number(podId))) write(joinedKey(), JSON.stringify([...ids, Number(podId)]))
}

// ── 내 건물 (서버 /api/account/me 값의 사본) ──
// 모양: { buildingId, name, dong, roadAddress?, detailAddress?, neighborhoodName? }
const buildingKey = () => `sobun.building.${getMyUserId()}`

export function setMyBuilding(building) {
  if (!getMyUserId()) return
  write(buildingKey(), JSON.stringify(building))
}

function clearMyBuilding() {
  if (getMyUserId()) remove(buildingKey())
}

/** 등록한 건물. 로그인 전이거나 아직 등록 안 했으면 null */
export function getMyBuilding() {
  if (!getMyUserId()) return null
  try {
    return JSON.parse(read(buildingKey()))
  } catch {
    return null
  }
}

/** 건물 등록(1차 인증)을 마쳤는지 */
export function isVerified() {
  return Boolean(getMyBuilding())
}
