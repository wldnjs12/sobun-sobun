import { Client } from '@stomp/stompjs'

/**
 * 팟 실시간 정산 갱신용 STOMP 클라이언트.
 * 사용 예: const client = connectPodSocket(podId, (event) => setAmount(event.perPersonAmount))
 */
export function connectPodSocket(podId, onUpdate) {
  const client = new Client({
    brokerURL: `ws://${location.hostname}:8080/ws-sobun`,
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
