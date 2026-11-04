import { useCallback, useEffect, useState } from 'react'
import { fetchMyPods } from '../pod/podApi.js'
import { fetchSettlement } from '../settlement/settlementApi.js'

/**
 * 팟 하나의 진행 단계를 정한다. 위에서부터 먼저 맞는 조건이 이긴다.
 * settlement은 서버 GET /settlements/{podId} 조회 결과(없으면 null).
 */
function statusOf(pod, settlement) {
  if (pod.status === 'CANCELLED') return { key: 'cancelled', label: '모집 취소', link: `/pods/${pod.id}` }
  if (settlement) return { key: 'settled', label: '정산 완료', link: `/pods/${pod.id}/pickup`, price: settlement.perPersonAmount }
  if (pod.closed) return { key: 'closed', label: '구매·정산 중', link: `/pods/${pod.id}/complete` }
  if (pod.participantCount >= pod.targetParticipantCount) return { key: 'recruiting', label: '인원 다 모임', link: `/pods/${pod.id}` }
  return { key: 'recruiting', label: '모집 중', link: `/pods/${pod.id}` }
}

/**
 * "내 팟" 목록 훅. "내 팟" 탭, 마이 탭(요약 숫자), 알림 화면이 같이 쓴다.
 * 서버 GET /api/pods/mine?role=host|joined 에서 가져온다 → 다른 기기에서 로그인해도 똑같이 보인다.
 * 결과: { items: null(불러오는 중) | [{ pod, settlement, status, role }], error, reload }
 * 정산은 마감된 팟만 조회한다 (모집 중인 팟은 정산이 있을 수 없어서 요청을 아낀다).
 */
export default function useMyPods() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const [hosted, joined] = await Promise.all([fetchMyPods('host'), fetchMyPods('joined')])
      const all = [
        ...hosted.map((pod) => ({ pod, role: 'host' })),
        ...joined.map((pod) => ({ pod, role: 'joined' })),
      ].sort((a, b) => b.pod.id - a.pod.id)
      const settlements = await Promise.all(all.map(({ pod }) => (pod.closed ? fetchSettlement(pod.id) : null)))
      setItems(all.map((row, i) => ({ ...row, settlement: settlements[i], status: statusOf(row.pod, settlements[i]) })))
    } catch (e) {
      setError(e)
      setItems([])
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { items, error, reload }
}
