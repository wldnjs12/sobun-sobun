import { useEffect, useRef, useState } from 'react'
import { useNavigationType } from 'react-router-dom'
import { checkLocation } from '../onboarding/onboardingApi.js'

// 이번 방문에서 커뮤니티 입장 GPS를 통과했는지. 새로고침하면 false로 돌아간다.
let enteredThisVisit = false

/**
 * 커뮤니티 "입장" 직전 GPS 확인 (purpose = COMMUNITY_ENTER, API_SPEC ⑤).
 *
 * 언제 다시 확인하나:
 *   - 하단 탭 등으로 커뮤니티에 "들어올 때"(PUSH), 새로고침·링크로 바로 열었을 때 → 매번 확인 (캐시 없음 원칙)
 *   - 글 상세에서 뒤로가기로 목록에 "돌아올 때"(POP) → 이미 안에 있던 것이므로 다시 묻지 않음
 *
 * 결과 status: 'checking' | 'passed' | 'blocked'
 * blocked일 때 failure = { reason, message } 를 같이 돌려준다. EntryGate가 이유별로 안내 + [다시 확인] 버튼을 그린다.
 *   reason: 'denied'(위치 권한 거부) | 'unavailable'(GPS 못 받음·10초 시간 초과) | 'outOfRange'(내 건물 근처가 아님)
 *           | 'network'(서버 연결 실패 등 그 밖의 에러)
 *
 * 왜 useLocationCheck(바텀시트)를 안 쓰나: 커뮤니티는 화면 전체가 막히는 "입장 관문"이라, 시트를 닫으면 이유가 사라져
 * 사용자가 왜 막혔는지 모르는 막다른 화면이 됐다. 그래서 이유를 화면에 계속 남겨둔다.
 */
export default function useCommunityEntry({ recheckOnEnter = true } = {}) {
  const navigationType = useNavigationType() // 'PUSH'(링크·탭 클릭) | 'POP'(뒤로가기·새로고침) | 'REPLACE'
  const alreadyInside = enteredThisVisit && (navigationType === 'POP' || !recheckOnEnter)
  const [status, setStatus] = useState(alreadyInside ? 'passed' : 'checking')
  const [failure, setFailure] = useState(null)
  // 개발 모드(StrictMode)는 effect를 두 번 실행해서 GPS 확인이 두 번 나갈 수 있다 → 한 번만
  const started = useRef(false)

  const check = async () => {
    setStatus('checking')
    setFailure(null)
    try {
      await checkLocation('COMMUNITY_ENTER')
      enteredThisVisit = true
      setStatus('passed')
    } catch (e) {
      // reason이 없는 에러 = 서버 연결 실패 등. 위치 문제와 구분해서 안내한다
      setFailure({ reason: e.reason ?? 'network', message: e.message })
      setStatus('blocked')
    }
  }

  useEffect(() => {
    if (alreadyInside || started.current) return
    started.current = true
    check()
    // 의존성 배열이 비어 있는 이유: 화면이 처음 뜰 때 한 번만 확인하면 되기 때문
  }, [])

  // locationSheet: 예전 사용처 호환용 (지금은 EntryGate가 안내를 직접 그려서 항상 null)
  return { status, failure, retry: check, locationSheet: null }
}
