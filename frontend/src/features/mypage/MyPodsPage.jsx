import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import { BUILDING, categoryIcon } from '../pod/podApi.js'
import { calcPerPersonPrice } from '../pod/podUtils.js'
import useMyPods from './useMyPods.js'
import styles from './MyPage.module.css'

const ROLES = [
  { key: 'all', label: '전체' },
  { key: 'host', label: '내가 연' },
  { key: 'joined', label: '참여한' },
]

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'recruiting', label: '모집중' },
  { key: 'closed', label: '정산중' },
  { key: 'settled', label: '완료' },
  { key: 'cancelled', label: '취소' },
]

/**
 * 내 팟 (하단 탭 "내 팟"). 내가 연 팟 + 참여한 팟을 서버에서 불러와 역할·상태별로 거른다.
 */
export default function MyPodsPage() {
  const { items, error, reload } = useMyPods()
  const [role, setRole] = useState('all')
  const [filter, setFilter] = useState('all')

  const byRole = items?.filter((item) => role === 'all' || item.role === role) ?? []
  const visible = byRole.filter((item) => filter === 'all' || item.status.key === filter)
  const countOf = (key) => byRole.filter((item) => key === 'all' || item.status.key === key).length

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />

      <main className={styles.main}>
        <section className={styles.history}>
          <div className={styles.historyHead}>
            <h2>내 팟</h2>
          </div>
          <div className={styles.filters}>
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`${styles.filter} ${role === r.key ? styles.filterActive : ''}`}
                onClick={() => setRole(r.key)}
              >
                {r.label}
              </button>
            ))}
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
          {error && (
            <div className={styles.empty}>
              <p>내 팟을 불러오지 못했어요. ({error.message})</p>
              <button type="button" className={styles.link} onClick={reload}>
                다시 시도
              </button>
            </div>
          )}
          {items !== null && !error && visible.length === 0 && (
            <div className={styles.empty}>
              <p>{filter === 'all' && role === 'all' ? '아직 열거나 참여한 팟이 없어요.' : '이 조건의 팟이 없어요.'}</p>
              <Link to="/home" className={styles.link}>
                건물 홈에서 팟 둘러보기
              </Link>
            </div>
          )}

          {visible.map(({ pod, status, role: myRole }) => (
            <Link key={pod.id} to={status.link} className={styles.item}>
              <span className={styles.thumb}>
                <Icon name={categoryIcon(pod.category)} size={26} />
              </span>
              <div className={styles.itemInfo}>
                <span className={`${styles.statusTag} ${styles[status.key] ?? ''}`}>
                  {myRole === 'host' ? '대표 · ' : ''}
                  {status.label}
                </span>
                <strong className={styles.itemTitle}>{pod.title}</strong>
                <span className={styles.itemSub}>
                  내 몫: {pod.shareLabel} · {pod.participantCount}/{pod.targetParticipantCount}명 참여
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
