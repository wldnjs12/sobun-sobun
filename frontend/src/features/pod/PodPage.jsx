import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { connectPodSocket } from '../../api/socket.js'

/**
 * 핵심 기능 ②: 팟 개설·참여·실시간 정산 갱신 (담당: 도우현 프론트 / 지원 백엔드 페어)
 * TODO:
 *  - 팟 상세 정보 최초 로딩(GET /api/pods/{id})
 *  - 참여 버튼 -> 참여 API 호출 -> 서버가 재계산 후 WebSocket으로 브로드캐스트
 *  - 아래는 실시간 구독만 우선 연결해둔 상태
 */
export default function PodPage() {
  const { podId } = useParams()
  const [amount, setAmount] = useState(null)
  const [participantCount, setParticipantCount] = useState(0)

  useEffect(() => {
    const client = connectPodSocket(podId, (event) => {
      setAmount(event.perPersonAmount)
      setParticipantCount(event.participantCount)
    })
    return () => client.deactivate()
  }, [podId])

  return (
    <div style={{ padding: 16 }}>
      <h1>팟 #{podId}</h1>
      <p>참여 인원: {participantCount}명</p>
      <p>1인당 금액: {amount !== null ? `${amount}원` : '대기 중'}</p>
    </div>
  )
}
