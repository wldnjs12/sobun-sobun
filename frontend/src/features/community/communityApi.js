import { api } from '../../api/client.js'
import { getMyUserId } from '../../api/currentUser.js'
import { BUILDING } from '../pod/podApi.js'

/**
 * ⑤ 동네 익명 커뮤니티 API. 계약: docs/API_SPEC.md ⑤ (백엔드 담당: 김민준)
 * 범위: 내 건물 반경 1km 안 이웃들의 글 (2026-11 개편 — 예전엔 같은 건물만). 범위는 서버가 정한다.
 *
 * ⑤ 백엔드(PR #22)가 develop에 머지돼서 실제 서버를 쓴다 (USE_MOCK = false).
 * 백엔드 없이 화면만 볼 때는 true로 바꾸면 아래 목업으로 동작한다.
 *
 * 응답 모양 (API_SPEC에 필드가 다 적혀 있지 않아서 프론트가 이렇게 가정함 — 백엔드와 맞출 것):
 *   CommunityPostSummary = { id, category, content, preview, commentCount, suggestable, createdAt, mine,
 *                            neighborhoodName, distanceLabel }
 *   CommunityPostDetail  = { id, category, authorLabel, content, createdAt, mine, suggestable,
 *                            neighborhoodName, distanceLabel,
 *                            comments: [{ id, content, createdAt, authorLabel, mine }] }
 *   - neighborhoodName: 글쓴이 건물의 법정동 이름(예 "용현동"), distanceLabel: 대략 거리(예 "같은 건물", "약 300m")
 *     → 건물명·주소는 익명성을 깨뜨려서 서버가 아예 내려주지 않는다
 *   - authorLabel: 글쓴이는 "글쓴이", 나머지는 그 글 안에서 처음 등장한 순서대로 "이웃 1", "이웃 2"…
 *   - mine: 내가 쓴 글/댓글인지 (삭제 버튼 표시용). 실제 작성자 id는 응답에 절대 없다
 */
const USE_MOCK = false

export const CATEGORIES = [
  { key: 'GROUP_BUY_SUGGESTION', label: '공구 제안', emoji: '🔥' },
  { key: 'SHARE', label: '나눔', emoji: '🎁' },
  { key: 'QUESTION', label: '질문', emoji: '💬' },
  { key: 'FREE', label: '자유', emoji: '☕' },
]
export const categoryOf = (key) => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[3]

const me = () => getMyUserId()

// 요청한 사람은 X-User-Id 헤더로 보낸다. 로그인 후에는 서버 필터가 이 헤더를 토큰 주인으로 덮어써서 사칭이 막힌다.
// (?userId= 쿼리는 예전 서버와의 호환용으로 같이 보낸다 — 서버는 헤더가 있으면 헤더를 쓴다)
const withMe = () => ({ headers: { 'X-User-Id': String(me()) } })

/** 글 카드에 붙일 대략 위치. "용현동 · 약 300m" / "용현동 · 같은 건물" / 값이 없으면 "우리 동네" */
export function locationLabel(post) {
  const parts = [post?.neighborhoodName, post?.distanceLabel].filter(Boolean)
  return parts.length ? parts.join(' · ') : '우리 동네'
}

/** 글 목록. category가 없으면 전체 */
export async function fetchPosts(category) {
  if (USE_MOCK) return mockList(category)
  const query = `userId=${me()}` + (category ? `&category=${category}` : '')
  return api.get(`/community/posts?${query}`, withMe())
}

export async function fetchPost(postId) {
  if (USE_MOCK) return mockDetail(Number(postId))
  return api.get(`/community/posts/${postId}?userId=${me()}`, withMe())
}

export async function createPost({ category, content }) {
  if (USE_MOCK) return mockCreate({ category, content })
  return api.post(`/community/posts?userId=${me()}`, { category, content }, withMe())
}

export async function deletePost(postId) {
  if (USE_MOCK) return mockDeletePost(Number(postId))
  return api.delete(`/community/posts/${postId}?userId=${me()}`, withMe())
}

export async function addComment(postId, content) {
  if (USE_MOCK) return mockAddComment(Number(postId), content)
  return api.post(`/community/posts/${postId}/comments?userId=${me()}`, { content }, withMe())
}

/**
 * 댓글 삭제 후 갱신된 글 상세를 돌려준다.
 * 서버 DELETE는 data 없이(null) 응답하므로, 화면이 바로 다시 그릴 수 있게 상세를 한 번 더 불러온다.
 */
export async function deleteComment(postId, commentId) {
  if (USE_MOCK) return mockDeleteComment(Number(postId), Number(commentId))
  await api.delete(`/community/comments/${commentId}?userId=${me()}`, withMe())
  return fetchPost(postId)
}

export async function reportPost(postId) {
  if (USE_MOCK) return mockReport('post', Number(postId))
  return api.post(`/community/posts/${postId}/report?userId=${me()}`, undefined, withMe())
}

export async function reportComment(commentId) {
  if (USE_MOCK) return mockReport('comment', Number(commentId))
  return api.post(`/community/comments/${commentId}/report?userId=${me()}`, undefined, withMe())
}

/** 본문의 첫 줄을 제목처럼, 나머지를 본문처럼 보여주기 위한 도우미 (API에는 content 하나뿐) */
export function splitContent(content) {
  const [first, ...rest] = content.trim().split('\n')
  return { title: first.trim(), body: rest.join('\n').trim() }
}

/** "방금 전", "15분 전", "3시간 전", "2일 전" */
export function timeAgo(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`
  return `${Math.floor(minutes / (60 * 24))}일 전`
}

// ───────────────────────── 목업 (⑤ 백엔드 완성 전 임시) ─────────────────────────
// 서버 규칙을 흉내 낸다: 동네별로 분리(목업에선 단순히 "처음 연 건물" 기준), 익명 번호는 응답 만들 때 계산, 실제 작성자 id는 밖으로 안 내보냄,
// 같은 사람 중복 신고 무시, 신고 3회면 숨김.
// localStorage에 저장해서 새로고침해도 남고, 같은 브라우저의 다른 탭에서도 같은 글이 보인다.
const STORE_KEY = 'sobun.mockCommunity'
const REPORT_HIDE_THRESHOLD = 3
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString()

function seed() {
  // 시연 예시 품목: 생활용품만 (2026-11 개편 — 식품·식재료는 다루지 않는다). 묶음을 미개봉 단위로 나누는 예시 위주
  return {
    nextId: 100,
    posts: [
      {
        id: 1, buildingId: null, author: 9003, category: 'GROUP_BUY_SUGGESTION', createdAt: ago(2), reports: [], hidden: false,
        neighborhoodName: '용현동', distanceLabel: '같은 건물',
        content: '휴지 30롤 같이 사실 분? (1인 10롤씩)\n10롤 묶음 3개라 뜯지 않고 1묶음씩 나누면 돼요. 공동현관 앞에서 전달할게요!',
        comments: [
          { id: 11, author: 9007, content: '저요! 휴지 딱 떨어졌어요', createdAt: ago(1), reports: [], hidden: false },
        ],
      },
      {
        id: 2, buildingId: null, author: 9007, category: 'GROUP_BUY_SUGGESTION', createdAt: ago(15), reports: [], hidden: false,
        neighborhoodName: '용현동', distanceLabel: '약 300m',
        content: '물티슈 10팩, 2팩씩 5명 나눠요!\n혼자 쓰기엔 너무 많아서요. 비닐 포장 그대로 나누니까 위생 걱정 없어요.',
        comments: [
          { id: 21, author: 9012, content: '저도 참여하고 싶어요! 팟 열어주시면 바로 들어갈게요 🙌', createdAt: ago(8), reports: [], hidden: false },
          { id: 22, author: 9007, content: '감사해요! 팟 열기 버튼으로 바로 개설할게요 🎉', createdAt: ago(3), reports: [], hidden: false },
        ],
      },
      {
        id: 3, buildingId: null, author: 9001, category: 'SHARE', createdAt: ago(60), reports: [], hidden: false,
        neighborhoodName: '학익동', distanceLabel: '약 700m',
        content: '세제 리필 나눔 후기\n지난주 세제 3L 리필팩을 3명이서 나눴는데 미개봉이라 깔끔했어요. 다음엔 섬유유연제도 같이 해요!',
        comments: [],
      },
      {
        id: 4, buildingId: null, author: 9005, category: 'QUESTION', createdAt: ago(180), reports: [], hidden: false,
        neighborhoodName: '용현동', distanceLabel: '100m 이내',
        content: '근처에 쓰레기봉투 묶음으로 파는 곳 있나요?\n20L 종량제 봉투를 한 번에 사서 나누고 싶어요.',
        comments: [],
      },
    ],
  }
}

/**
 * 샘플 글은 "처음 커뮤니티를 연 건물"의 글로 정한다 (실제 건물 id는 등록할 때 서버가 정하므로 미리 알 수 없음).
 * (목업 한계) 다른 건물 사람은 샘플이 안 보이고 빈 커뮤니티로 시작한다 — 실제 서버는 반경 1km 동네 단위로 보여준다.
 */
function load() {
  let store
  try {
    store = JSON.parse(localStorage.getItem(STORE_KEY)) ?? seed()
  } catch {
    store = seed()
  }
  if (store.posts.some((p) => p.buildingId === null)) {
    store.posts.forEach((p) => {
      if (p.buildingId === null) p.buildingId = BUILDING.id
    })
    save(store)
  }
  return store
}

function save(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    // 저장 못 해도 이번 화면에서는 동작
  }
}

function visiblePost(store, postId) {
  const post = store.posts.find((p) => p.id === postId && p.buildingId === BUILDING.id && !p.hidden)
  if (!post) throw Object.assign(new Error('글을 찾을 수 없어요. 삭제됐거나 숨겨진 글일 수 있어요.'), { status: 404 })
  return post
}

/** 서버가 응답을 만들 때처럼 익명 번호를 붙인다 (저장하지 않고 매번 계산) */
function toDetail(post) {
  const numbers = new Map()
  const labelOf = (author) => {
    if (author === post.author) return '글쓴이'
    if (!numbers.has(author)) numbers.set(author, numbers.size + 1)
    return `이웃 ${numbers.get(author)}`
  }
  return {
    id: post.id,
    category: post.category,
    content: post.content,
    createdAt: post.createdAt,
    mine: post.author === me(),
    suggestable: post.category === 'GROUP_BUY_SUGGESTION',
    neighborhoodName: post.neighborhoodName ?? '용현동',
    distanceLabel: post.distanceLabel ?? '같은 건물',
    comments: post.comments
      .filter((c) => !c.hidden)
      .map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt, authorLabel: labelOf(c.author), mine: c.author === me() })),
  }
}

async function mockList(category) {
  await delay(250)
  return load()
    .posts.filter((p) => p.buildingId === BUILDING.id && !p.hidden && (!category || p.category === category))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({
      id: p.id,
      category: p.category,
      content: p.content,
      createdAt: p.createdAt,
      commentCount: p.comments.filter((c) => !c.hidden).length,
      mine: p.author === me(),
      neighborhoodName: p.neighborhoodName ?? '용현동',
      distanceLabel: p.distanceLabel ?? '같은 건물',
    }))
}

async function mockDetail(postId) {
  await delay(200)
  return toDetail(visiblePost(load(), postId))
}

async function mockCreate({ category, content }) {
  await delay(250)
  const store = load()
  const post = { id: store.nextId++, buildingId: BUILDING.id, author: me(), category, content, createdAt: new Date().toISOString(), reports: [], hidden: false, comments: [] }
  store.posts.push(post)
  save(store)
  return toDetail(post)
}

async function mockDeletePost(postId) {
  await delay(200)
  const store = load()
  const post = visiblePost(store, postId)
  if (post.author !== me()) throw new Error('내가 쓴 글만 삭제할 수 있어요.')
  store.posts = store.posts.filter((p) => p.id !== postId)
  save(store)
}

async function mockAddComment(postId, content) {
  await delay(200)
  const store = load()
  const post = visiblePost(store, postId)
  post.comments.push({ id: store.nextId++, author: me(), content, createdAt: new Date().toISOString(), reports: [], hidden: false })
  save(store)
  return toDetail(post)
}

async function mockDeleteComment(postId, commentId) {
  await delay(200)
  const store = load()
  const post = visiblePost(store, postId)
  const comment = post.comments.find((c) => c.id === commentId)
  if (!comment || comment.author !== me()) throw new Error('내가 쓴 댓글만 삭제할 수 있어요.')
  post.comments = post.comments.filter((c) => c.id !== commentId)
  save(store)
  return toDetail(post)
}

async function mockReport(type, id) {
  await delay(200)
  const store = load()
  const target =
    type === 'post'
      ? store.posts.find((p) => p.id === id)
      : store.posts.flatMap((p) => p.comments).find((c) => c.id === id)
  if (!target) return
  if (!target.reports.includes(me())) target.reports.push(me()) // 같은 사람 중복 신고는 한 번만
  if (target.reports.length >= REPORT_HIDE_THRESHOLD) target.hidden = true
  save(store)
}
