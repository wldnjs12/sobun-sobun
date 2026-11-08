import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import AccessDeniedView from '../../components/AccessDeniedView.jsx'
import { isBuildingAccessDenied } from '../../api/client.js'
import { connectPodChatSocket } from '../../api/socket.js'
import { fetchPod, fetchPodMessages, sendPodMessage } from './podApi.js'
import styles from './PodChatPage.module.css'

const MAX_LENGTH = 500 // 서버 ChatMessage.MAX_LENGTH와 같게
const POLL_MS = 3000

/**
 * 팟 참여자 채팅 (/pods/:podId/chat). 대표 + 참여자만 들어올 수 있다 (아니면 서버가 403).
 *
 * 메시지가 들어오는 길은 두 가지다:
 *   1) 실시간: STOMP /topic/pods/{podId}/chat 구독 → 누가 보내면 바로 아래에 추가
 *   2) 폴링: 실시간 연결이 안 됐거나 끊겨 있는 동안 3초마다 GET ?after=마지막id 로 새 메시지만 가져온다
 * 시연 중 WebSocket이 끊겨도 채팅이 멈추지 않게 하려고 둘 다 둔다. 같은 메시지가 두 길로 와도 id로 한 번만 넣는다.
 *
 * 내 메시지 판별: 서버는 보낸 사람을 "대표" / "이웃 N"으로만 알려준다(닉네임·userId 비공개).
 * 그래서 내 라벨(myLabel)과 같은 라벨이면 내 메시지(오른쪽)로 그린다.
 */
export default function PodChatPage() {
  const { podId } = useParams()
  const [pod, setPod] = useState(null)
  const [messages, setMessages] = useState([])
  const [myLabel, setMyLabel] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [live, setLive] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const bottomRef = useRef(null)
  // 폴링·재연결 때 "어디까지 받았는지"를 알아야 한다. state는 콜백 안에서 옛 값으로 굳으므로 ref에 최신값을 둔다
  const lastIdRef = useRef(null)
  lastIdRef.current = messages.length ? messages[messages.length - 1].id : null

  /** 새 메시지들을 합친다. 실시간과 폴링으로 같은 메시지가 두 번 와도 id로 걸러서 한 번만 넣는다 */
  const addMessages = useCallback((incoming) => {
    if (!incoming.length) return
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]))
      incoming.forEach((m) => byId.set(m.id, m))
      return [...byId.values()].sort((a, b) => a.id - b.id)
    })
  }, [])

  /** 마지막으로 받은 메시지 이후 것만 가져오기 (연결 직후 빈 곳 채우기 + 폴링) */
  const catchUp = useCallback(async () => {
    const history = await fetchPodMessages(podId, lastIdRef.current)
    if (history.myLabel) setMyLabel(history.myLabel)
    addMessages(history.messages)
  }, [podId, addMessages])

  // 1) 처음: 팟 정보 + 이전 메시지
  useEffect(() => {
    Promise.all([fetchPod(podId), fetchPodMessages(podId)])
      .then(([podData, history]) => {
        setPod(podData)
        setMyLabel(history.myLabel)
        setMessages(history.messages)
        setLoaded(true)
      })
      .catch(setError)
  }, [podId])

  // 2) 실시간 구독 — 이전 메시지를 다 받은 뒤에 붙는다 (권한 없는 사람은 여기까지 오지 않음)
  useEffect(() => {
    if (!loaded) return undefined
    const client = connectPodChatSocket(podId, (message) => addMessages([message]), {
      onConnect: () => {
        setLive(true)
        catchUp().catch(() => {}) // 연결 전·끊겨 있던 사이에 온 메시지
      },
      onClose: () => setLive(false),
    })
    return () => client.deactivate()
  }, [loaded, podId, addMessages, catchUp])

  // 3) 실시간이 아닐 때만 3초마다 폴링
  useEffect(() => {
    if (!loaded || live) return undefined
    const timer = setInterval(() => catchUp().catch(() => {}), POLL_MS)
    return () => clearInterval(timer)
  }, [loaded, live, catchUp])

  // 새 메시지가 오면 맨 아래로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const trimmed = text.trim()
  const handleSend = async (e) => {
    e.preventDefault()
    if (!trimmed || trimmed.length > MAX_LENGTH || sending) return
    setSending(true)
    setSendError(null)
    try {
      const sent = await sendPodMessage(podId, trimmed)
      setMyLabel(sent.senderLabel) // 첫 메시지면 이때 내 "이웃 N" 번호가 정해진다
      addMessages([sent])
      setText('')
    } catch (err) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (error?.code === 'POD_FORBIDDEN') {
    return <Notice podId={podId} text="이 팟에 참여한 이웃만 채팅할 수 있어요." />
  }
  if (isBuildingAccessDenied(error)) return <AccessDeniedView pageTitle="팟 채팅" what="팟" />
  if (error) return <Notice podId={podId} text={`채팅을 불러오지 못했어요. (${error.message})`} />
  if (!loaded) return <Notice text="채팅을 불러오는 중이에요…" />

  return (
    <div className={styles.page}>
      <PageHeader title="팟 채팅" />
      <div className={styles.podBar}>
        <Link to={`/pods/${podId}`} className={styles.podTitle}>
          {pod.title}
        </Link>
        <span className={`${styles.liveTag} ${live ? styles.liveOn : ''}`}>
          <span className={styles.liveDot} />
          {live ? '실시간' : '연결 중'}
        </span>
      </div>
      <p className={styles.privacyNote}>
        <Icon name="lock" size={14} />
        이 팟에 참여한 이웃만 볼 수 있어요. 닉네임 대신 대표 / 이웃 번호로 보여요.
      </p>

      <main className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.empty}>아직 메시지가 없어요. 픽업 시간·장소를 먼저 이야기해 보세요.</p>
        )}
        {messages.map((m, i) => {
          const mine = myLabel != null && m.senderLabel === myLabel
          // 같은 사람이 이어서 보내면 이름은 첫 메시지에만 붙인다
          const showName = !mine && (i === 0 || messages[i - 1].senderLabel !== m.senderLabel)
          return (
            <div key={m.id} className={`${styles.row} ${mine ? styles.rowMine : ''}`}>
              {showName && (
                <span className={`${styles.sender} ${m.senderLabel === '대표' ? styles.senderHost : ''}`}>
                  {m.senderLabel}
                </span>
              )}
              <div className={styles.bubbleLine}>
                <p className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`}>{m.content}</p>
                <time className={styles.time} dateTime={m.createdAt}>
                  {formatTime(m.createdAt)}
                </time>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      <form className={styles.composer} onSubmit={handleSend}>
        {sendError && <p className={styles.sendError}>{sendError}</p>}
        <div className={styles.composerRow}>
          <input
            className={styles.input}
            placeholder="메시지 입력"
            aria-label="메시지 입력"
            maxLength={MAX_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className={styles.sendButton} disabled={!trimmed || sending} aria-label="보내기">
            <Icon name="send" size={20} />
          </button>
        </div>
        {text.length > MAX_LENGTH - 50 && (
          <span className={styles.counter}>
            {text.length}/{MAX_LENGTH}
          </span>
        )}
      </form>
    </div>
  )
}

/** "2026-11-08T21:05:30" → 오늘이면 "오후 9:05", 다른 날이면 "11/8 오후 9:05" */
function formatTime(value) {
  const date = new Date(value)
  const time = date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday ? time : `${date.getMonth() + 1}/${date.getDate()} ${time}`
}

function Notice({ text, podId }) {
  return (
    <div className={styles.page}>
      <PageHeader title="팟 채팅" />
      <p className={styles.empty}>
        {text}
        {podId && (
          <>
            <br />
            <Link to={`/pods/${podId}`}>팟 상세로 돌아가기</Link>
          </>
        )}
      </p>
    </div>
  )
}
