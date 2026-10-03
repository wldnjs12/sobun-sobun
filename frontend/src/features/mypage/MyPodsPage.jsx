import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import { BUILDING } from '../pod/podApi.js'
import { calcPerPersonPrice } from '../pod/podUtils.js'
import useMyPods from './useMyPods.js'
import styles from './MyPage.module.css'

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'recruiting', label: '진행중' },
  { key: 'closed', label: '정산중' },
  { key: 'settled', label: '완료' },
]

/**
 * 내 팟 (하단 탭 "내 팟", 기획 개편 S14·S15).
 * 원래 마이페이지 안에 있던 "소분 참여 내역"을 별도 탭으로 올린 화면. 상태별(진행중/정산중/완료) 필터.
 */
export default function MyPodsPage() {
  const items = useMyPods()
  const [filter, setFilter] = useState('all')

  const visible = items?.filter((item) => filter === 'all' || item.status.key === filter) ?? []
  const countOf = (key) => items?.filter((item) => key === 'all' || item.status.key === key).length ?? 0

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />

      <main className={styles.main}>
        <section className={styles.history}>
          <div className={styles.historyHead}>
            <h2>내 팟</h2>
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
      </main>

      <BottomNav />
    </div>
  )
}
