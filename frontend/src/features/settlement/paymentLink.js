import { getMyUserId } from '../../api/currentUser.js'

/**
 * 팟장이 남긴 송금 정보(hostPaymentLink)는 글자 하나라서, 어떤 종류인지 보고 버튼 모양을 정한다.
 *   "toss.me/xxx", "https://toss.me/..." → 토스로 송금 (링크 열기)
 *   "https://qr.kakaopay.com/..."         → 카카오페이로 송금 (링크 열기)
 *   그 밖의 https 링크                     → 송금 링크 열기
 *   그 외 글자(예: "카카오뱅크 3333-...") → 계좌번호로 보고 복사 버튼
 * 링크는 http/https만 연다 (javascript: 같은 위험한 주소를 막기 위해).
 */
export function describePaymentLink(raw) {
  const text = raw?.trim()
  if (!text) return null
  const looksLikeUrl = /^https?:\/\//i.test(text) || /^(toss\.me|qr\.kakaopay\.com)\//i.test(text)
  if (looksLikeUrl) {
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        if (url.hostname.includes('toss')) return { type: 'link', label: '토스로 송금', icon: 'bolt', url: url.href }
        if (url.hostname.includes('kakaopay')) return { type: 'link', label: '카카오페이로 송금', icon: 'payments', url: url.href }
        return { type: 'link', label: '송금 링크 열기', icon: 'open_in_new', url: url.href }
      }
    } catch {
      // URL로 못 읽으면 아래 계좌번호 취급
    }
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
