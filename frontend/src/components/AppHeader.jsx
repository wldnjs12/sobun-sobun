import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import styles from './AppHeader.module.css'

/** 팟·커뮤니티·내 팟·마이 화면 상단에 공통으로 붙는 헤더 (건물명 + 알림 + 프로필). */
export default function AppHeader({ buildingName }) {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.buildingButton}>
        <Icon name="apartment" size={20} className={styles.buildingIcon} />
        <span className={styles.buildingName}>{buildingName}</span>
        <Icon name="expand_more" size={18} className={styles.chevron} />
      </button>
      <div className={styles.actions}>
        <button type="button" aria-label="알림" className={styles.iconButton}>
          <Icon name="notifications" size={24} />
        </button>
        {/* 프로필 자리에 앱 로고 (로그인·프로필 사진 기능이 없어서). 누르면 마이 탭으로 */}
        <Link to="/mypage" className={styles.profile} aria-label="마이페이지">
          <img src="/logo.svg" alt="" className={styles.profileLogo} />
        </Link>
      </div>
    </header>
  )
}
