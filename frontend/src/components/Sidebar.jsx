import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import { getMyNickname, logout } from '../api/currentUser.js'
import { BUILDING } from '../features/pod/podApi.js'
import styles from './Sidebar.module.css'

// 데스크톱(≥1024px)에서만 보이는 왼쪽 내비게이션. 모바일은 기존 하단 탭(BottomNav)을 그대로 쓴다.
const NAV = [
  { to: '/home', icon: 'grid_view', label: '공동구매' },
  { to: '/community', icon: 'forum', label: '커뮤니티' },
  { to: '/my-pods', icon: 'inventory_2', label: '내 팟' },
  { to: '/notifications', icon: 'notifications', label: '알림' },
]
const INSIGHT = [
  { to: '/impact', icon: 'monitoring', label: '임팩트 리포트' },
  { to: '/mypage', icon: 'person', label: '마이페이지' },
]

/**
 * 로그인 + 건물 인증이 끝난 화면 전체를 감싸는 레이아웃.
 * body에 has-shell 클래스를 붙여서 데스크톱에서 본문을 사이드바 폭만큼 오른쪽으로 민다 (tokens.css).
 */
export default function AppShell() {
  useShellShortcuts()
  useEffect(() => {
    document.body.classList.add('has-shell')
    return () => document.body.classList.remove('has-shell')
  }, [])

  return (
    <>
      <Sidebar />
      <Outlet />
    </>
  )
}

function Sidebar() {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const nickname = getMyNickname() ?? '이웃'

  return (
    <aside className={styles.sidebar} aria-label="주 메뉴">
      <Link to="/home" className={styles.brand}>
        <img src="/logo.svg" alt="" className={styles.logo} />
        <span className={styles.wordmark}>소분소분</span>
      </Link>

      <Link to="/onboarding/address" className={styles.building} title="건물 다시 등록하기">
        <span className={styles.liveDot} aria-hidden="true" />
        <span className={styles.buildingText}>
          <span className={styles.buildingLabel}>인증된 건물</span>
          <span className={styles.buildingName}>{BUILDING.name}</span>
        </span>
        <Icon name="unfold_more" size={16} className={styles.buildingChevron} />
      </Link>

      <button type="button" className={styles.create} onClick={() => navigate('/pods/new')}>
        <Icon name="add" size={18} />
        새 공동구매 열기
        <kbd className={styles.kbd}>N</kbd>
      </button>

      <nav className={styles.nav}>
        <span className={styles.section}>건물</span>
        {NAV.map((item) => (
          <SideLink key={item.to} {...item} />
        ))}
        <span className={styles.section}>인사이트</span>
        {INSIGHT.map((item) => (
          <SideLink key={item.to} {...item} />
        ))}
      </nav>

      <div className={styles.footer}>
        <span className={styles.avatar}>{nickname.slice(0, 1)}</span>
        <span className={styles.nickname}>{nickname}</span>
        <button
          type="button"
          className={styles.logout}
          aria-label="로그아웃"
          title="로그아웃"
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true)
            await logout()
          }}
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    </aside>
  )
}

function SideLink({ to, icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
      <Icon name={icon} size={18} />
      {label}
    </NavLink>
  )
}

/** 데스크톱 단축키: N = 새 팟 열기 (입력 중일 때는 무시) */
export function useShellShortcuts() {
  const navigate = useNavigate()
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (e.metaKey || e.ctrlKey || e.altKey || tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      if (e.key === 'n' || e.key === 'N') navigate('/pods/new')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}
