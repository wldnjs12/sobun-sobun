import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import styles from './AppHeader.module.css'

/** 팟·커뮤니티·내 팟·마이 화면 상단에 공통으로 붙는 헤더 (건물명 + 알림 + 로고). */
export default function AppHeader({ buildingName }) {
  return (
    <header className={styles.header}>
      {/* 건물명을 누르면 주소 검색으로 → 다른 건물을 고르면 소속이 바뀐다 (이사 등, 서버가 재등록 지원) */}
      <Link to="/onboarding/address" className={styles.buildingButton} aria-label={`${buildingName} · 주소 다시 등록하기`}>
        <Icon name="apartment" size={20} className={styles.buildingIcon} />
        <span className={styles.buildingName}>{buildingName}</span>
        <Icon name="expand_more" size={18} className={styles.chevron} />
      </Link>
      <div className={styles.actions}>
        <Link to="/notifications" aria-label="알림" className={styles.iconButton}>
          <Icon name="notifications" size={24} />
        </Link>
        {/* 프로필 자리에 앱 로고 (로그인·프로필 사진 기능이 없어서). 누르면 건물 홈으로 */}
        <Link to="/home" className={styles.profile} aria-label="홈">
          <img src="/logo.svg" alt="" className={styles.profileLogo} />
        </Link>
      </div>
    </header>
  )
}
