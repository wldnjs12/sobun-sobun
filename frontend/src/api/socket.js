import { Client } from '@stomp/stompjs'

/**
 * 팟 실시간 정산 갱신용 STOMP 클라이언트.
 * 사용 예: const client = connectPodSocket(podId, (event) => setAmount(event.perPersonAmount))
 */
export function connectPodSocket(podId, onUpdate) {
  const client = new Client({
    // 백엔드가 /ws-sobun 을 SockJS로 열어둬서(WebSocketConfig의 .withSockJS()),
    // 순수 WebSocket으로 붙으려면 끝에 /websocket 을 붙여야 한다. 없으면 연결 자체가 실패한다.
    brokerURL: `ws://${location.hostname}:8080/ws-sobun/websocket`,
    reconnectDelay: 3000,
    onConnect: () => {
      client.subscribe(`/topic/pods/${podId}`, (message) => {
        onUpdate(JSON.parse(message.body))
      })
    },
  })
  client.activate()
  return client
}
