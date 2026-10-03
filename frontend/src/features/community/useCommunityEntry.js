import { useEffect, useRef, useState } from 'react'
import { useNavigationType } from 'react-router-dom'
import useLocationCheck from '../onboarding/useLocationCheck.jsx'

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
 */
export default function useCommunityEntry({ recheckOnEnter = true } = {}) {
  const navigationType = useNavigationType() // 'PUSH'(링크·탭 클릭) | 'POP'(뒤로가기·새로고침) | 'REPLACE'
  const { runWithLocationCheck, locationSheet } = useLocationCheck()
  const alreadyInside = enteredThisVisit && (navigationType === 'POP' || !recheckOnEnter)
  const [status, setStatus] = useState(alreadyInside ? 'passed' : 'checking')
  // 개발 모드(StrictMode)는 effect를 두 번 실행해서 GPS 확인이 두 번 나갈 수 있다 → 한 번만
  const started = useRef(false)

  const check = async () => {
    setStatus('checking')
    const passed = await runWithLocationCheck('COMMUNITY_ENTER', () => {
      enteredThisVisit = true
    })
    setStatus(passed ? 'passed' : 'blocked')
  }

  useEffect(() => {
    if (alreadyInside || started.current) return
    started.current = true
    check()
    // 의존성 배열이 비어 있는 이유: 화면이 처음 뜰 때 한 번만 확인하면 되기 때문
  }, [])

  return { status, retry: check, locationSheet }
}
