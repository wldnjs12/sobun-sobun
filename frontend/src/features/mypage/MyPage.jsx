import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
// 로그인 기능(logout, getMyNickname)은 계정 작업에서 currentUser.js에 추가된다.
// 아직 없을 때도 빌드가 깨지지 않게 "모듈 통째로" 가져와서 cu.함수?.() 로 있을 때만 부른다.
import * as cu from '../../api/currentUser.js'
import { BUILDING } from '../pod/podApi.js'
import useMyPods from './useMyPods.js'
import styles from './MyPage.module.css'

/**
 * 마이 탭. 요약 숫자, 내 건물, 로그아웃.
 * 숫자는 서버의 "내 팟"(내가 연 팟 + 참여한 팟)에서 센다.
 */
export default function MyPage() {
  const navigate = useNavigate()
  const { items } = useMyPods()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(null)

  const countOf = (key) => items?.filter((item) => key === 'all' || item.status.key === key).length ?? 0
  const inProgress = countOf('recruiting') + countOf('closed')
  const nickname = cu.getMyNickname?.() || null
  const building = cu.getMyBuilding?.()
  const verified = Boolean(building)

  const handleLogout = async () => {
    setLoggingOut(true)
    setLogoutError(null)
    try {
      await cu.logout?.()
      navigate('/', { replace: true })
    } catch (e) {
      setLogoutError(e.message)
      setLoggingOut(false)
    }
  }

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
            <h1 className={styles.name}>{nickname ?? '내 정보'}</h1>
            <span className={styles.userTag}>{BUILDING.name}</span>
          </div>
        </section>

        <section className={styles.stats}>
          <div>
            <span>내 팟</span>
            <strong>{items === null ? '…' : `${countOf('all')}개`}</strong>
          </div>
          <div>
            <span>정산 완료</span>
            <strong>{items === null ? '…' : `${countOf('settled')}건`}</strong>
          </div>
          <div>
            <span>건물 인증</span>
            <strong className={verified ? styles.ok : styles.warn}>{verified ? '완료' : '필요'}</strong>
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
          <h2>계정 및 건물</h2>
          <Link to="/onboarding/address" className={styles.settingRow}>
            <Icon name="door_front" size={22} className={styles.primaryIcon} />
            <div>
              <strong>내 건물</strong>
              <span>{verified ? BUILDING.name : '아직 등록하지 않았어요'}</span>
            </div>
            <span className={styles.settingAction}>{verified ? '건물 변경' : '등록하기'}</span>
          </Link>
          <button type="button" className={styles.settingRow} disabled={loggingOut} onClick={handleLogout}>
            <Icon name="logout" size={22} className={styles.primaryIcon} />
            <div>
              <strong>{loggingOut ? '로그아웃하는 중…' : '로그아웃'}</strong>
              {logoutError && <span>{logoutError}</span>}
            </div>
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
