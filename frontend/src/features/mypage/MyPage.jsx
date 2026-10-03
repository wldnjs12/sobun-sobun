import { Link } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import { getMyUserId, isVerified } from '../../api/currentUser.js'
import { BUILDING } from '../pod/podApi.js'
import useMyPods from './useMyPods.js'
import styles from './MyPage.module.css'

/**
 * 마이 탭 (S14 · Stitch 15번).
 * 기획 개편으로 "참여한 팟 목록"은 "내 팟" 탭(MyPodsPage)으로 분리했고, 여기는 요약 숫자와 내 건물 설정만 둔다.
 */
export default function MyPage() {
  const items = useMyPods()
  const countOf = (key) => items?.filter((item) => key === 'all' || item.status.key === key).length ?? 0
  const inProgress = countOf('recruiting') + countOf('closed')

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />

      <main className={styles.main}>
        <section className={styles.profile}>
          <span className={styles.avatar}>
            <Icon name="person" size={28} filled />
          </span>
          <div>
            <span className={styles.eyebrow}>우리 건물 알뜰 이웃</span>
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

        <Link to="/my-pods" className={styles.settingRow}>
          <Icon name="inventory_2" size={22} className={styles.primaryIcon} />
          <div>
            <strong>내 팟</strong>
            <span>{items === null ? '불러오는 중이에요…' : `진행 중 ${inProgress}개 · 정산 완료 ${countOf('settled')}개`}</span>
          </div>
          <Icon name="chevron_right" size={20} />
        </Link>


        <section className={styles.settings}>
          <h2>계정 및 거점</h2>
          <Link to="/onboarding/address" className={styles.settingRow}>
            <Icon name="door_front" size={22} className={styles.primaryIcon} />
            <div>
              <strong>내 건물</strong>
              <span>{BUILDING.name}</span>
            </div>
            <span className={styles.settingAction}>건물 변경</span>
          </Link>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
