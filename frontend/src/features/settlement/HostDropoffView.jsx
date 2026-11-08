import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { getMyUserId } from '../../api/currentUser.js'
import { fetchParticipants } from '../pod/podApi.js'
import { unitShareText } from './settlementApi.js'
import styles from './Settlement.module.css'

const REFRESH_MS = 10000 // 수령 완료도 실시간 이벤트가 없어서 송금 현황처럼 10초마다 다시 불러온다

/**
 * 팟장용 "물건 두기 안내" (/pods/:podId/pickup 을 팟장이 열었을 때).
 * 참여자는 픽업 장소에서 "가져가는" 사람이고, 팟장은 거기에 "갖다 두는" 사람이라 할 일이 반대다.
 * 그래서 같은 주소라도 팟장에게는 가져가라는 안내 대신 두는 방법과 이웃별 수령 현황을 보여준다.
 * 수령 현황은 참여자의 [수령 완료] 자가 신고(pickedUp)를 그대로 보여준다. 이름 대신 "이웃 1, 2…" (익명 원칙).
 */
export default function HostDropoffView({ pod, podId }) {
  const navigate = useNavigate()
  const [participants, setParticipants] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    fetchParticipants(podId)
      .then((list) => {
        setParticipants(list)
        setError(null)
      })
      .catch((e) => setError(e.message))
  }, [podId])

  useEffect(() => {
    load()
    const timerId = setInterval(load, REFRESH_MS)
    return () => clearInterval(timerId)
  }, [load])

  const unitShare = unitShareText(pod)
  const spot = pod.pickupNote?.trim() || null
  const myId = getMyUserId()
  // 팟장 본인 몫은 이미 손에 있으니 목록에서 뺀다
  const neighbors = participants?.filter((p) => p.userId !== myId) ?? []
  const pickedCount = neighbors.filter((p) => p.pickedUp).length
  const allPicked = participants !== null && neighbors.length > 0 && pickedCount === neighbors.length

  const steps = [
    { icon: 'account_balance_wallet', text: '은행·토스 앱에서 이웃들의 입금을 확인해요' },
    {
      icon: 'inventory_2',
      text: unitShare ? `묶음을 1인 ${unitShare}씩, 뜯지 않은 그대로 나눠요` : '묶음을 이웃 몫만큼, 뜯지 않은 그대로 나눠요',
    },
    {
      icon: 'place',
      text: spot ? `${spot}에 두고, 팟 이름을 적은 메모를 붙여요` : '정한 픽업 장소에 두고, 팟 이름을 적은 메모를 붙여요',
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader title="물건 두기 안내" />

      <main className={styles.mainWithCta}>
        <section>
          <span className={styles.statusPill}>
            <Icon name="local_shipping" size={16} />
            {allPicked ? '이웃 모두 수령 완료' : '이웃 몫 전달 준비'}
          </span>
          <h2 className={styles.title}>
            {allPicked ? (
              '모두 가져갔어요'
            ) : (
              <>
                이웃 몫을
                <br />
                픽업 장소에 두면 돼요
              </>
            )}
          </h2>
          <p className={styles.body}>
            이웃을 직접 만나서 건넬 필요 없어요. 놓아두면 이웃이 가져가고 [수령 완료]를 눌러 알려줘요.
          </p>
        </section>

        <section className={styles.lockerCard}>
          <div className={styles.lockerRow}>
            <span className={styles.lockerIcon}>
              <Icon name="place" size={22} />
            </span>
            <div>
              <span className={styles.resultLabel}>두는 장소</span>
              <strong>{spot ?? '픽업 장소를 적지 않았어요. 팟 수정이나 커뮤니티로 이웃에게 알려주세요'}</strong>
            </div>
          </div>
        </section>

        <section className={styles.breakdown}>
          <div className={styles.breakdownHead}>
            <h3>
              <Icon name="checklist" size={20} className={styles.primaryIcon} /> 두는 방법
            </h3>
          </div>
          <ol className={styles.pickupSteps}>
            {steps.map((step, i) => (
              <li key={step.text}>
                <span className={styles.pickupStepNum}>{i + 1}</span>
                <Icon name={step.icon} size={18} className={styles.primaryIcon} />
                {step.text}
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.payCard}>
          <div className={styles.payHead}>
            <Icon name="format_list_bulleted" size={20} /> 이웃 수령 현황
            <button type="button" className={styles.refreshButton} onClick={load}>
              <Icon name="sync" size={16} />
              {participants ? `${pickedCount}/${neighbors.length}` : '새로고침'}
            </button>
          </div>
          {participants === null && !error && <p className={styles.body}>불러오는 중이에요…</p>}
          {participants !== null && neighbors.length === 0 && <p className={styles.body}>함께한 이웃이 없어요.</p>}
          {neighbors.length > 0 && (
            <ul className={styles.statusList}>
              {neighbors.map((p, i) => (
                <li key={p.userId} className={styles.statusRow}>
                  <span className={styles.statusAvatar}>{i + 1}</span>
                  <div className={styles.statusName}>
                    <strong>이웃 {i + 1}</strong>
                    <small>{unitShare ? `${unitShare} 미개봉` : '내 몫 1개'}</small>
                  </div>
                  {p.pickedUp ? (
                    <span className={styles.statusPaid}>
                      <Icon name="check_circle" size={16} filled /> 수령 완료
                    </span>
                  ) : (
                    <span className={styles.statusWaiting}>아직 안 가져감</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {error && <p className={styles.error}>수령 현황을 불러오지 못했어요. 잠시 뒤 자동으로 다시 시도해요. ({error})</p>}
        </section>
      </main>

      <div className={styles.ctaDock}>
        <button type="button" className={styles.primaryButton} onClick={() => navigate(`/settlements/${podId}/payments`)}>
          <Icon name="fact_check" size={20} />
          송금 현황 보기
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => navigate('/home')}>
          <Icon name="home" size={18} /> 건물 홈으로
        </button>
      </div>
    </div>
  )
}
