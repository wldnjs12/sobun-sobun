import Icon from './Icon.jsx'
import styles from './AppHeader.module.css'

/** 건물 홈·최저가·마이 화면 상단에 공통으로 붙는 헤더 (건물명 + 알림 + 프로필). */
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
        <div className={styles.profile} aria-label="프로필">
          <Icon name="person" size={20} />
        </div>
      </div>
    </header>
  )
}
