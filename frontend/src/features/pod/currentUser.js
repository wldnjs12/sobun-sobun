/**
 * "나"가 누구인지와 "내가 참여한 팟"을 기억하는 임시 장치.
 *
 * 왜 필요한가:
 *   ① 온보딩(로그인/세션)이 아직 없어서, 백엔드 팟 API는 userId를 요청에 직접 받는다 (docs/handoff/pod.md "임시 계약").
 *   또 "누가 참여했는지" 조회 API가 없어서, 내가 참여했는지는 이 브라우저가 기억해둬야 한다.
 *   세션이 붙으면 이 파일은 통째로 지우고 서버 값을 쓰면 된다.
 *
 * 데모 팁: 주소 뒤에 ?user=2 를 붙여 열면 그 탭은 2번 사용자가 된다 (탭을 닫기 전까지 기억됨).
 *   탭 두 개를 서로 다른 user로 열어두면 실시간 갱신을 직접 확인할 수 있다.
 *
 * 저장소를 둘로 나눈 이유:
 *   - 내 userId → sessionStorage: 탭마다 따로라서, 같은 브라우저에서 탭 두 개를 다른 사용자로 쓸 수 있다.
 *     (localStorage는 같은 사이트의 모든 탭이 공유해서, 한 탭에서 바꾸면 다른 탭 사용자도 바뀌어버린다)
 *   - 참여한 팟 목록 → localStorage: 탭을 닫았다 열어도 남아 있어야 해서.
 * 둘 다 시크릿 창 등에서 막힐 수 있어서 읽기/쓰기를 전부 try/catch로 감쌌다.
 */

const USER_KEY = 'sobun.userId'
const DEFAULT_USER_ID = 1

function read(storageName, key) {
  try {
    return window[storageName].getItem(key)
  } catch {
    return null
  }
}

function write(storageName, key, value) {
  try {
    window[storageName].setItem(key, value)
  } catch {
    // 저장 못 해도 이번 화면에서는 동작하므로 무시
  }
}

// 앱이 처음 열릴 때 딱 한 번, 주소의 ?user= 를 저장해둔다.
// (화면을 이동하면 주소에서 ?user= 가 사라지기 때문에, 그때그때 주소를 읽으면 놓친다)
const userFromUrl = Number(new URLSearchParams(window.location.search).get('user')) || null
if (userFromUrl) write('sessionStorage', USER_KEY, String(userFromUrl))

export function getMyUserId() {
  return Number(read('sessionStorage', USER_KEY)) || userFromUrl || DEFAULT_USER_ID
}

// 사용자마다 따로 기억해야 창 두 개로 테스트할 때 섞이지 않는다
const joinedKey = () => `sobun.joinedPods.${getMyUserId()}`

function readJoined() {
  try {
    return JSON.parse(read('localStorage', joinedKey())) ?? []
  } catch {
    return []
  }
}

export function hasJoined(podId) {
  return readJoined().includes(Number(podId))
}

export function rememberJoined(podId) {
  const ids = readJoined()
  if (!ids.includes(Number(podId))) write('localStorage', joinedKey(), JSON.stringify([...ids, Number(podId)]))
}
