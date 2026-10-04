import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { getMyUserId } from '../../api/currentUser.js'
import { fetchParticipants, fetchPod } from '../pod/podApi.js'
import { fetchSettlement } from './settlementApi.js'
import styles from './Settlement.module.css'

const REFRESH_MS = 10000 // 송금 신고는 실시간 이벤트가 없어서 10초마다 다시 불러온다

/**
 * 송금 현황 (Stitch _3, 팟장 전용).
 * 참여자가 [보냈어요]를 누른 내역을 보여준다. 실제 입금은 팟장이 자기 은행/토스 앱에서 확인해야 한다.
 * 서버는 참여자의 실제 userId를 주지만, 화면에는 "이웃 1, 2…"로만 보여준다 (익명 원칙).
 *
 * 디자인에서 뺀 것: [콕 찌르기]·[미송금 이웃에게 일괄 알림] — 알림 보내는 API가 아직 없음
 */
export default function PaymentStatusPage() {
  const { podId } = useParams()
  const navigate = useNavigate()
  const [pod, setPod] = useState(null)
  const [settlement, setSettlement] = useState(null)
  const [participants, setParticipants] = useState(null)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)

  const loadParticipants = useCallback(() => {
    fetchParticipants(podId)
      .then((list) => {
        setParticipants(list)
        setUpdatedAt(new Date())
      })
      .catch((e) => setError(e.message))
  }, [podId])

  useEffect(() => {
    fetchPod(podId).then(setPod).catch(() => {})
    fetchSettlement(podId).then(setSettlement)
    loadParticipants()
    const timerId = setInterval(loadParticipants, REFRESH_MS)
    return () => clearInterval(timerId) // 화면을 떠나면 자동 새로고침 중지
  }, [podId, loadParticipants])

  if (error) {
    return (
      <div className={styles.page}>
        <PageHeader title="송금 현황" />
        <div className={styles.message}>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!participants || !pod) {
    return (
      <div className={styles.page}>
        <PageHeader title="송금 현황" />
        <p className={styles.message}>불러오는 중이에요…</p>
      </div>
    )
  }

  const myId = getMyUserId()
  // 팟장 본인은 자기에게 송금하지 않으므로 목록 맨 위 "나"로 따로 두고, 이웃만 센다
  const neighbors = participants.filter((p) => p.userId !== myId)
  const paidCount = neighbors.filter((p) => p.paid).length
  const perPerson = settlement?.perPersonAmount ?? null
  const allPaid = neighbors.length > 0 && paidCount === neighbors.length
  const percent = neighbors.length ? Math.round((paidCount / neighbors.length) * 100) : 0

  return (
    <div className={styles.page}>
      <PageHeader title="송금 현황" />

      <main className={styles.mainWithCta}>
        <section className={styles.statusHero}>
          <span className={styles.statusPod}>
            {pod.targetParticipantCount}인 소분팟 · {pod.title}
          </span>
          <h2 className={styles.title}>
            {allPaid ? '🎉 모두 송금했어요' : `이웃 ${neighbors.length}명 중 ${paidCount}명 송금 완료`}
          </h2>
          <div className={styles.statusBar}>
            <span style={{ width: `${percent}%` }} />
          </div>
          {perPerson !== null && (
            <p className={styles.statusAmount}>
              받은 금액(신고 기준) <strong>{(paidCount * perPerson).toLocaleString()}원</strong> /{' '}
              {(neighbors.length * perPerson).toLocaleString()}원
            </p>
          )}
        </section>

        <section className={styles.payCard}>
          <div className={styles.payHead}>
            <Icon name="format_list_bulleted" size={20} /> 송금 현황
            <button type="button" className={styles.refreshButton} onClick={loadParticipants}>
              <Icon name="sync" size={16} />
              {updatedAt ? `${updatedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '새로고침'}
            </button>
          </div>

          <ul className={styles.statusList}>
            <li className={styles.statusRow}>
              <span className={`${styles.statusAvatar} ${styles.statusAvatarMe}`}>나</span>
              <div className={styles.statusName}>
                <strong>나 (팟장)</strong>
                <small>내 몫은 송금 없음</small>
              </div>
              <span className={styles.statusPaid}>
                <Icon name="verified" size={16} /> 팟장
              </span>
            </li>
            {neighbors.map((p, i) => (
              <li key={p.userId} className={styles.statusRow}>
                <span className={styles.statusAvatar}>{i + 1}</span>
                <div className={styles.statusName}>
                  <strong>이웃 {i + 1}</strong>
                  <small>{perPerson !== null ? `${perPerson.toLocaleString()}원` : ''}</small>
                </div>
                {p.paid ? (
                  <span className={styles.statusPaid}>
                    <Icon name="check_circle" size={16} filled /> 보냈어요
                  </span>
                ) : (
                  <span className={styles.statusWaiting}>송금 대기 중</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.infoBox}>
          <Icon name="account_balance_wallet" size={20} className={styles.primaryIcon} />
          <p>
            이웃이 <strong>[보냈어요]</strong>를 누른 내역이에요. 실제로 쓰는 은행·토스 앱에서 입금을 꼭 확인한 뒤 소분해서 픽업
            장소에 두세요.
          </p>
        </div>
      </main>

      <div className={styles.ctaDock}>
        <button type="button" className={styles.primaryButton} onClick={() => navigate(`/pods/${podId}/pickup`)}>
          <Icon name="key" size={20} />
          픽업 장소·비밀번호 확인하기
        </button>
      </div>
    </div>
  )
}
