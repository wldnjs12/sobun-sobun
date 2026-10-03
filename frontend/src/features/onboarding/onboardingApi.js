import { api } from '../../api/client.js'
import { getMyUserId, markVerified } from '../../api/currentUser.js'

/**
 * 건물 인증. 백엔드: origin/feature/qr-auth (docs/handoff/qr-auth.md)
 * 실패하면 error.code 로 원인을 알 수 있다: INVALID_QR / EXPIRED_QR / OUT_OF_RANGE
 * (code가 없으면 요청 값 문제 — 예: 좌표 누락)
 *
 * X-User-Id 헤더: 로그인이 없어서 임시로 붙인다. 붙여야 서버에 인증 기록(BUILDING_AUTH)이 남는다.
 */
export async function verifyBuilding({ qrToken, latitude, longitude }) {
  await api.post(
    '/auth/verify',
    { qrToken, latitude, longitude },
    { headers: { 'X-User-Id': String(getMyUserId()) } },
  )
  markVerified()
}

/**
 * QR 안에 든 글자에서 토큰을 꺼낸다.
 * QR에 토큰만 들어 있을 수도 있고, "https://…/onboarding/verify?qr=토큰" 같은 링크일 수도 있다.
 * (링크로 만들어두면 휴대폰 기본 카메라 앱으로 찍어도 바로 이 앱의 인증 화면이 열린다)
 */
export function extractQrToken(rawText) {
  const text = rawText.trim()
  try {
    const url = new URL(text)
    return url.searchParams.get('qr') ?? text
  } catch {
    return text // URL이 아니면 글자 그대로가 토큰
  }
}
