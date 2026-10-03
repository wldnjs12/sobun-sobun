import { NavLink } from 'react-router-dom'
import Icon from './Icon.jsx'
import styles from './BottomNav.module.css'

// 기획 개편(design-changes.md S15): 홈·최저가·마이 → 팟·커뮤니티·내 팟·마이
const TABS = [
  { to: '/home', icon: 'shopping_basket', label: '팟' },
  { to: '/community', icon: 'forum', label: '커뮤니티' },
  { to: '/my-pods', icon: 'inventory_2', label: '내 팟' },
  { to: '/mypage', icon: 'person', label: '마이' },
]

/**
 * 하단 탭 바 (디자인 핸드오프 S15 공통 컴포넌트). 공용 파일이라 고치기 전에 팀 채팅에 알리기.
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
