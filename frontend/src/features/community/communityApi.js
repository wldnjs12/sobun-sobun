import { api } from '../../api/client.js'
import { getMyUserId } from '../../api/currentUser.js'
import { BUILDING } from '../pod/podApi.js'

/**
 * ⑤ 건물별 익명 커뮤니티 API. 계약: docs/API_SPEC.md ⑤ (백엔드 담당: 김민준)
 *
 * TODO(⑤ 백엔드 머지되면): USE_MOCK을 false로 바꾸면 실제 서버를 쓴다.
 *
 * 응답 모양 (API_SPEC에 필드가 다 적혀 있지 않아서 프론트가 이렇게 가정함 — 백엔드와 맞출 것):
 *   CommunityPostSummary = { id, category, content, commentCount, createdAt, mine }
 *   CommunityPostDetail  = { id, category, content, createdAt, mine, suggestable,
 *                            comments: [{ id, content, createdAt, authorLabel, mine }] }
 *   - authorLabel: 글쓴이는 "글쓴이", 나머지는 그 글 안에서 처음 등장한 순서대로 "이웃 1", "이웃 2"…
 *   - mine: 내가 쓴 글/댓글인지 (삭제 버튼 표시용). 실제 작성자 id는 응답에 절대 없다
 */
const USE_MOCK = true

export const CATEGORIES = [
  { key: 'GROUP_BUY_SUGGESTION', label: '공구 제안', emoji: '🔥' },
  { key: 'SHARE', label: '나눔', emoji: '🎁' },
  { key: 'QUESTION', label: '질문', emoji: '💬' },
  { key: 'FREE', label: '자유', emoji: '☕' },
]
export const categoryOf = (key) => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[3]

const me = () => getMyUserId()

/** 글 목록. category가 없으면 전체 */
export async function fetchPosts(category) {
  if (USE_MOCK) return mockList(category)
  const query = `buildingId=${BUILDING.id}&userId=${me()}` + (category ? `&category=${category}` : '')
  return api.get(`/community/posts?${query}`)
}

export async function fetchPost(postId) {
  if (USE_MOCK) return mockDetail(Number(postId))
  return api.get(`/community/posts/${postId}?userId=${me()}`)
}

export async function createPost({ category, content }) {
  if (USE_MOCK) return mockCreate({ category, content })
  return api.post(`/community/posts?userId=${me()}`, { category, content })
}

export async function deletePost(postId) {
  if (USE_MOCK) return mockDeletePost(Number(postId))
  return api.delete(`/community/posts/${postId}?userId=${me()}`)
}

export async function addComment(postId, content) {
  if (USE_MOCK) return mockAddComment(Number(postId), content)
  return api.post(`/community/posts/${postId}/comments?userId=${me()}`, { content })
}

export async function deleteComment(postId, commentId) {
  if (USE_MOCK) return mockDeleteComment(Number(postId), Number(commentId))
  return api.delete(`/community/comments/${commentId}?userId=${me()}`)
}

export async function reportPost(postId) {
  if (USE_MOCK) return mockReport('post', Number(postId))
  return api.post(`/community/posts/${postId}/report?userId=${me()}`)
}

export async function reportComment(commentId) {
  if (USE_MOCK) return mockReport('comment', Number(commentId))
  return api.post(`/community/comments/${commentId}/report?userId=${me()}`)
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
// 서버 규칙을 흉내 낸다: 건물별로 분리(샘플 글은 처음 연 건물 것), 익명 번호는 응답 만들 때 계산, 실제 작성자 id는 밖으로 안 내보냄,
// 같은 사람 중복 신고 무시, 신고 3회면 숨김.
// localStorage에 저장해서 새로고침해도 남고, 같은 브라우저의 다른 탭(?user=2)에서도 같은 글이 보인다.
const STORE_KEY = 'sobun.mockCommunity'
const REPORT_HIDE_THRESHOLD = 3
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString()

function seed() {
  // 시연 예시 품목: 생필품·가공식품만 (기획 개편 1-2)
  return {
    nextId: 100,
    posts: [
      {
        id: 1, buildingId: null, author: 9003, category: 'GROUP_BUY_SUGGESTION', createdAt: ago(2), reports: [], hidden: false,
        content: '삼다수 2L 24병 같이 나누실 분? (1인당 6병씩)\n내일 오전 배송으로 주문할게요. 6병 묶음이 4팩이라 뜯지 않고 1팩씩 나누면 돼요. 1층 무인택배함에 둘게요!',
        comments: [
          { id: 11, author: 9007, content: '저요! 생수 딱 떨어졌어요', createdAt: ago(1), reports: [], hidden: false },
        ],
      },
      {
        id: 2, buildingId: null, author: 9007, category: 'GROUP_BUY_SUGGESTION', createdAt: ago(15), reports: [], hidden: false,
        content: '코스트코 3겹 화장지 30롤, 10롤씩 3명 나눠요!\n혼자 살아서 30롤은 보관할 공간이 부족하네요. 10롤 비닐 그대로 나누니까 위생 걱정 없어요.',
        comments: [
          { id: 21, author: 9012, content: '저도 참여하고 싶어요! 팟 열어주시면 바로 들어갈게요 🙌', createdAt: ago(8), reports: [], hidden: false },
          { id: 22, author: 9007, content: '감사해요! 팟 열기 버튼으로 바로 개설할게요 🎉', createdAt: ago(3), reports: [], hidden: false },
        ],
      },
      {
        id: 3, buildingId: null, author: 9001, category: 'SHARE', createdAt: ago(60), reports: [], hidden: false,
        content: '스팸 클래식 200g 2캔 나눔해요\n본가에서 선물세트로 많이 보내주셨어요. 유통기한 넉넉해요. 1층 보관함에 둘게요!',
        comments: [],
      },
      {
        id: 4, buildingId: null, author: 9005, category: 'QUESTION', createdAt: ago(180), reports: [], hidden: false,
        content: '인하대 후문 쪽에서 트레이더스 가기 편한 방법 있나요?\n차 없이 장보러 가기 괜찮은 방법이나 꿀팁 있으면 알려주세요!',
        comments: [],
      },
    ],
  }
}

/**
 * 샘플 글은 "처음 커뮤니티를 연 건물"의 글로 정한다 (실제 건물 id는 등록할 때 서버가 정하므로 미리 알 수 없음).
 * 다른 건물 사람은 샘플이 안 보이고 빈 커뮤니티로 시작 → 건물별로 분리되는 모습을 데모에서 보여줄 수 있다.
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
