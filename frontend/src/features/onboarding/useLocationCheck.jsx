import { useCallback, useRef, useState } from 'react'
import LocationCheckSheet from './LocationCheckSheet.jsx'
import { checkLocation } from './onboardingApi.js'

/**
 * ① 2차 인증 — "행동 직전 GPS 확인"(S2')을 어느 화면에서나 쓰게 해주는 훅.
 *
 * 사용법 (팟 개설·참여·커뮤니티 입장 버튼에서):
 *   const { runWithLocationCheck, checking, locationSheet } = useLocationCheck()
 *   <button disabled={checking} onClick={() => runWithLocationCheck('POD_JOIN', joinPod)}>
 *     {checking ? '위치를 확인하고 있어요…' : '참여하기'}
 *   </button>
 *   {locationSheet}   ← 실패했을 때 뜨는 바텀시트(S3). 화면 아무 데나 한 번 넣어두면 된다.
 *
 * 흐름: 위치 확인 → 통과하면 action() 실행 / 실패하면 바텀시트 → [다시 확인]을 누르면 같은 행동을 다시 시도
 * runWithLocationCheck는 통과하면 true, 실패하면 false를 돌려준다 (커뮤니티 입장처럼 "막힌 상태"를 그려야 할 때 사용)
 * 원칙: 결과를 기억(캐시)하지 않고 매번 새로 확인한다 (docs/open-decisions.md 확정 사항).
 */
export default function useLocationCheck() {
  const [checking, setChecking] = useState(false)
  const [failure, setFailure] = useState(null) // { reason, message }
  // [다시 확인]을 눌렀을 때 "무엇을" 다시 할지 기억해둔다
  const lastRequest = useRef(null)

  const runWithLocationCheck = useCallback(async (purpose, action) => {
    lastRequest.current = { purpose, action }
    setFailure(null)
    setChecking(true)
    try {
      await checkLocation(purpose)
    } catch (e) {
      setChecking(false)
      // reason이 없는 에러 = 서버 연결 실패 등 → 위치를 못 받은 것과 같은 안내 + 원래 메시지
      setFailure({ reason: e.reason ?? 'unavailable', message: e.message })
      return false
    }
    setChecking(false)
    await action() // 통과 → 원래 하려던 행동(개설·참여·입장)을 그대로 진행
    return true
  }, [])

  const retry = () => {
    const { purpose, action } = lastRequest.current
    runWithLocationCheck(purpose, action)
  }

  const locationSheet = failure && (
    <LocationCheckSheet reason={failure.reason} retrying={checking} onRetry={retry} onClose={() => setFailure(null)} />
  )

  return { runWithLocationCheck, checking, locationSheet }
}
