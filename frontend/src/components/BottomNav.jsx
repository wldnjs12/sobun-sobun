import { NavLink } from 'react-router-dom'
import Icon from './Icon.jsx'
import styles from './BottomNav.module.css'

const TABS = [
  { to: '/home', icon: 'home', label: '홈' },
  { to: '/products', icon: 'local_offer', label: '최저가' },
  { to: '/mypage', icon: 'person', label: '마이' }, // TODO: 마이페이지 라우트 추가 필요
]

/**
 * 하단 탭 바 (디자인 핸드오프 S15 공통 컴포넌트).
 * NavLink는 현재 주소와 to가 같으면 isActive=true를 넘겨줘서, 활성 탭 색을 따로 계산할 필요가 없다.
 */
export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        >
          {({ isActive }) => (
            <>
              <Icon name={tab.icon} size={24} filled={isActive} />
              <span className={styles.label}>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
