import { Client } from '@stomp/stompjs'
import { getMyUserId } from './currentUser.js'

/**
 * 팟 실시간 정산 갱신용 STOMP 클라이언트.
 * 사용 예: const client = connectPodSocket(podId, (event) => setAmount(event.perPersonAmount), { onDenied })
 *
 * 기획 개편(건물 소속 검증): 연결할 때 X-User-Id를 보내야 하고, 다른 건물 팟이면 서버가 구독을 거부한다.
 * 거부되면 onDenied()를 부르고 재연결을 멈춘다. (안 멈추면 3초마다 거부 → 재연결을 끝없이 반복함)
 */
export function connectPodSocket(podId, onUpdate, { onDenied } = {}) {
  const client = new Client({
    // 백엔드가 /ws-sobun 을 SockJS로 열어둬서(WebSocketConfig의 .withSockJS()),
    // 순수 WebSocket으로 붙으려면 끝에 /websocket 을 붙여야 한다. 없으면 연결 자체가 실패한다.
    brokerURL: `ws://${location.hostname}:8080/ws-sobun/websocket`,
    connectHeaders: { 'X-User-Id': String(getMyUserId()) },
    reconnectDelay: 3000,
    onConnect: () => {
      client.subscribe(`/topic/pods/${podId}`, (message) => {
        onUpdate(JSON.parse(message.body))
      })
    },
    // 서버가 STOMP ERROR 프레임을 보냄 = 연결·구독 거부 → 더 시도하지 않는다
    onStompError: (frame) => {
      console.warn('실시간 연결이 거부됐어요:', frame.headers?.message)
      client.deactivate()
      onDenied?.(frame)
    },
  })
  client.activate()
  return client
}
