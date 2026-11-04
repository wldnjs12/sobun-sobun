import { getMyUserId } from '../../api/currentUser.js'

/**
 * 팟장이 남긴 송금 정보(hostPaymentLink)는 글자 하나라서, 어떤 종류인지 보고 버튼 모양을 정한다.
 *   "toss.me/xxx", "https://toss.me/..."  → 토스로 송금 (링크 열기)
 *   "https://qr.kakaopay.com/..."          → 카카오페이로 송금 (링크 열기)
 *   그 밖의 https 링크                      → 송금 링크 열기
 *   그 외 글자(예: "카카오뱅크 3333-...")  → 계좌번호로 보고 복사 버튼
 *
 * 보안: 링크(href)로 만드는 건 https 주소뿐이다. "javascript:"·"data:" 같은 주소는 누르는 순간 스크립트가 실행될 수 있고,
 * http는 중간에서 송금 페이지를 바꿔치기할 수 있어서 링크로 만들지 않고 그냥 글자(복사용)로만 보여준다.
 * 토스·카카오페이 판정은 "주소에 toss가 들어 있나"가 아니라 정확한 도메인으로 한다 (evil-toss.com 같은 가짜 주소 방지).
 */
const TOSS_HOSTS = ['toss.me', 'toss.im']
const KAKAOPAY_HOSTS = ['qr.kakaopay.com', 'link.kakaopay.com']

/** host가 domain 자체이거나 그 하위 도메인인가 (예: www.toss.im → toss.im) */
const isHostOf = (host, domains) => domains.some((d) => host === d || host.endsWith(`.${d}`))

/** 이 글자를 안전하게 열 수 있는 https 주소로 바꾼다. 아니면 null */
export function toSafeHttpsUrl(raw) {
  const text = raw?.trim()
  if (!text) return null
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
  // 주소 형식(scheme:)으로 시작하면 https만 허용. "toss.me/아이디"처럼 scheme 없이 알려진 도메인이면 https를 붙여준다
  if (hasScheme && !/^https:\/\//i.test(text)) return null
  if (!hasScheme && !/^(toss\.me|toss\.im|qr\.kakaopay\.com|link\.kakaopay\.com)\//i.test(text)) return null
  try {
    const url = new URL(hasScheme ? text : `https://${text}`)
    return url.protocol === 'https:' && url.hostname ? url : null
  } catch {
    return null
  }
}

/**
 * 확정 전에 입력값을 검사한다. 서버(SettlementService.normalizePaymentLink)와 같은 규칙:
 * "javascript:", "http:" 처럼 주소 형식으로 시작하는데 https가 아니면 거절. 200자 제한. 문제없으면 null.
 */
export function paymentLinkError(raw) {
  const text = raw?.trim()
  if (!text) return null
  if (text.length > 200) return '송금 정보는 200자까지 적을 수 있어요.'
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^https:\/\//i.test(text)) return '송금 링크는 https:// 로 시작하는 주소만 쓸 수 있어요.'
  return null
}

export function describePaymentLink(raw) {
  const text = raw?.trim()
  if (!text) return null
  const url = toSafeHttpsUrl(text)
  if (url) {
    const host = url.hostname.toLowerCase()
    if (isHostOf(host, TOSS_HOSTS)) return { type: 'link', label: '토스로 송금', icon: 'bolt', url: url.href }
    if (isHostOf(host, KAKAOPAY_HOSTS)) return { type: 'link', label: '카카오페이로 송금', icon: 'payments', url: url.href }
    return { type: 'link', label: '송금 링크 열기', icon: 'open_in_new', url: url.href }
  }
  return { type: 'account', text }
}

/**
 * 글자를 클립보드에 복사한다. navigator.clipboard는 보안 주소(localhost, https)에서만 쓸 수 있어서,
 * 휴대폰으로 http://192.168… 처럼 접속했을 때를 대비해 예전 방식(숨긴 입력칸 선택 후 복사)으로 대신한다.
 */
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 아래 예전 방식으로
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

// "다음 정산에도 기본으로 사용"을 체크하면 이 브라우저에 기억해둔다 (사용자별)
const savedLinkKey = () => `sobun.paymentLink.${getMyUserId()}`

export function getSavedPaymentLink() {
  try {
    return localStorage.getItem(savedLinkKey()) ?? ''
  } catch {
    return ''
  }
}

export function savePaymentLink(link) {
  try {
    if (link) localStorage.setItem(savedLinkKey(), link)
    else localStorage.removeItem(savedLinkKey())
  } catch {
    // 저장 못 해도 이번 정산에는 영향 없음
  }
}
