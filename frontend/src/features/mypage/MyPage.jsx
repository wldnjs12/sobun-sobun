import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import { getJoinedPodIds, getMyUserId, isVerified } from '../../api/currentUser.js'
import { BUILDING, fetchPod } from '../pod/podApi.js'
import { calcPerPersonPrice } from '../pod/podUtils.js'
import { fetchSettlement } from '../settlement/settlementApi.js'
import styles from './MyPage.module.css'

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'recruiting', label: '진행중' },
  { key: 'closed', label: '정산중' },
  { key: 'settled', label: '완료' },
]

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
 * 마이페이지 (S14 · Stitch 15번). 기획상 "있으면 좋음" 화면이라 꼭 필요한 것만:
 * 내가 참여한 팟 목록과 상태별 필터.
 * "내가 참여한 팟"을 서버에서 조회하는 API가 없어서, 이 브라우저에서 참여한 기록(currentUser.js)으로 불러온다.
 */
export default function MyPage() {
  const [items, setItems] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const ids = getJoinedPodIds()
    // allSettled: 팟 하나가 지워졌거나 실패해도 나머지는 보여준다 (Promise.all은 하나만 실패해도 전부 실패)
    Promise.allSettled(ids.map((id) => Promise.all([fetchPod(id), fetchSettlement(id)]))).then((results) => {
      const rows = results.filter((r) => r.status === 'fulfilled').map((r) => r.value) // [pod, settlement][]
      setItems(rows.reverse().map(([pod, settlement]) => ({ pod, status: statusOf(pod, settlement) }))) // 최근 참여가 위로
    })
  }, [])

  const visible = items?.filter((item) => filter === 'all' || item.status.key === filter) ?? []
  const countOf = (key) => items?.filter((item) => key === 'all' || item.status.key === key).length ?? 0

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />

      <main className={styles.main}>
        <section className={styles.profile}>
          <span className={styles.avatar}>
            <Icon name="person" size={28} filled />
          </span>
          <div>
            <span className={styles.eyebrow}>합리적인 1인가구 소비생활</span>
            <h1 className={styles.name}>마이소분</h1>
            <span className={styles.userTag}>사용자 #{getMyUserId()} (로그인 전 임시)</span>
          </div>
        </section>

        <section className={styles.stats}>
          <div>
            <span>참여한 팟</span>
            <strong>{countOf('all')}회</strong>
          </div>
          <div>
            <span>정산 완료</span>
            <strong>{countOf('settled')}건</strong>
          </div>
          <div>
            <span>건물 인증</span>
            <strong className={isVerified() ? styles.ok : styles.warn}>{isVerified() ? '완료' : '필요'}</strong>
          </div>
        </section>

        <section className={styles.history}>
          <div className={styles.historyHead}>
            <h2>소분 참여 내역</h2>
          </div>
          <div className={styles.filters}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`${styles.filter} ${filter === f.key ? styles.filterActive : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} {countOf(f.key)}
              </button>
            ))}
          </div>

          {items === null && <p className={styles.empty}>불러오는 중이에요…</p>}
          {items !== null && visible.length === 0 && (
            <div className={styles.empty}>
              <p>{filter === 'all' ? '아직 참여한 팟이 없어요.' : '이 상태의 팟이 없어요.'}</p>
              <Link to="/home" className={styles.link}>
                건물 홈에서 팟 둘러보기
              </Link>
            </div>
          )}

          {visible.map(({ pod, status }) => (
            <Link key={pod.id} to={status.link} className={styles.item}>
              <span className={styles.thumb}>
                <Icon name="inventory_2" size={26} />
              </span>
              <div className={styles.itemInfo}>
                <span className={`${styles.statusTag} ${styles[status.key]}`}>{status.label}</span>
                <strong className={styles.itemTitle}>{pod.title}</strong>
                <span className={styles.itemSub}>
                  내 몫: 1/{pod.targetParticipantCount} · {pod.participantCount}/{pod.targetParticipantCount}명 참여
                </span>
              </div>
              <div className={styles.itemPrice}>
                {(status.price ?? calcPerPersonPrice(pod.totalAmount, pod.commissionRate, pod.participantCount)).toLocaleString()}원
                <Icon name="chevron_right" size={20} />
              </div>
            </Link>
          ))}
        </section>

        <section className={styles.settings}>
          <h2>계정 및 거점</h2>
          <Link to="/onboarding/scan" className={styles.settingRow}>
            <Icon name="door_front" size={22} className={styles.primaryIcon} />
            <div>
              <strong>비대면 픽업 거점</strong>
              <span>{BUILDING.name} 1층 무인락커</span>
            </div>
            <span className={styles.settingAction}>다시 인증</span>
          </Link>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
