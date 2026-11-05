import { api } from '../../api/client.js'
import { loadMe, setSession } from '../../api/currentUser.js'

/**
 * 계정 API (2026-11 개편: 로그인 신규). 서버: backend auth/controller/AccountController
 * 가입·로그인 성공 → 토큰 저장 → 내 정보(건물) 불러오기까지 한 번에 해서, 화면은 결과만 보고 이동하면 된다.
 */
export async function signup({ loginId, password, nickname }) {
  const res = await api.post('/account/signup', { loginId, password, nickname })
  setSession(res)
  return loadMe()
}

export async function login({ loginId, password }) {
  const res = await api.post('/account/login', { loginId, password })
  setSession(res)
  return loadMe()
}

/**
 * 로그인 후 갈 곳. ?next= 가 있으면 그리로(원래 가려던 화면), 없으면 건물 유무로 정한다.
 * next는 "/"로 시작하는 우리 사이트 주소만 받는다 — "//evil.com" 같은 값으로 외부 사이트로 튕기는 걸 막기 위해.
 */
export function pathAfterLogin(next, me) {
  if (!me?.building) return '/onboarding/address'
  if (next && next.startsWith('/') && !next.startsWith('//')) return next
  return '/home'
}

// 회원가입 규칙 (서버 SignupRequest와 같게 맞춤)
export const LOGIN_ID_RULE = /^[a-z0-9]{4,20}$/

export function validateSignup({ loginId, password, passwordConfirm, nickname }) {
  const errors = {}
  if (!loginId) errors.loginId = '아이디를 입력해 주세요'
  else if (!LOGIN_ID_RULE.test(loginId)) errors.loginId = '영문 소문자·숫자 4~20자로 입력해 주세요'
  if (!password) errors.password = '비밀번호를 입력해 주세요'
  else if (password.length < 8) errors.password = '비밀번호는 8자 이상이에요'
  else if (password.length > 64) errors.password = '비밀번호는 64자 이하로 입력해 주세요'
  if (passwordConfirm !== password) errors.passwordConfirm = '비밀번호가 서로 달라요'
  const nick = nickname.trim()
  if (!nick) errors.nickname = '닉네임을 입력해 주세요'
  else if (nick.length < 2 || nick.length > 10) errors.nickname = '닉네임은 2~10자로 입력해 주세요'
  return errors
}
