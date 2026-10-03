import { useEffect, useState } from 'react'
import { getJoinedPodIds } from '../../api/currentUser.js'
import { fetchPod } from '../pod/podApi.js'
import { fetchSettlement } from '../settlement/settlementApi.js'

/**
 * 팟 하나의 진행 단계를 정한다. 위에서부터 먼저 맞는 조건이 이긴다.
 * settlement은 서버 GET /settlements/{podId} 조회 결과(없으면 null).
 */
function statusOf(pod, settlement) {
  if (settlement) return { key: 'settled', label: '정산 완료', link: `/pods/${pod.id}/pickup`, price: settlement.perPersonAmount }
  if (pod.closed) return { key: 'closed', label: '구매·정산 중', link: `/pods/${pod.id}/complete` }
  if (pod.participantCount >= pod.targetParticipantCount) return { key: 'closed', label: '모집 완료', link: `/pods/${pod.id}/complete` }
  return { key: 'recruiting', label: '모집 중', link: `/pods/${pod.id}` }
}

/**
 * "내가 참여한 팟" 목록을 불러오는 훅. "내 팟" 탭과 마이 탭(요약 숫자)이 같이 쓴다.
 * 결과: null(불러오는 중) 또는 [{ pod, status }] — 최근에 참여한 팟이 위로.
 * "내가 참여한 팟"을 서버에서 조회하는 API가 없어서, 이 브라우저에서 참여한 기록(currentUser.js)으로 불러온다.
 */
export default function useMyPods() {
  const [items, setItems] = useState(null)

  useEffect(() => {
    const ids = getJoinedPodIds()
    // allSettled: 팟 하나가 지워졌거나 실패해도 나머지는 보여준다 (Promise.all은 하나만 실패해도 전부 실패)
    Promise.allSettled(ids.map((id) => Promise.all([fetchPod(id), fetchSettlement(id)]))).then((results) => {
      const rows = results.filter((r) => r.status === 'fulfilled').map((r) => r.value) // [pod, settlement][]
      setItems(rows.reverse().map(([pod, settlement]) => ({ pod, status: statusOf(pod, settlement) })))
    })
  }, [])

  return items
}
