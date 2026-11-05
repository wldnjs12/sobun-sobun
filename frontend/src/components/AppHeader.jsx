import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import { getMyNickname, logout } from '../api/currentUser.js'
import styles from './AppHeader.module.css'

/** 팟·커뮤니티·내 팟·마이 화면 상단에 공통으로 붙는 헤더 (건물명 + 알림 + 계정 메뉴). */
export default function AppHeader({ buildingName }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef(null)

  // 메뉴 바깥을 누르거나 Esc를 누르면 닫는다
  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false)
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout() // 토큰 삭제 후 로그인 화면으로 이동 (페이지가 새로 열림)
  }

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
        {/* 프로필 자리에 앱 로고. 누르면 계정 메뉴(닉네임 · 마이페이지 · 로그아웃) */}
        <div className={styles.menuWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.profile}
            aria-label="계정 메뉴"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <img src="/logo.svg" alt="" className={styles.profileLogo} />
          </button>
          {menuOpen && (
            <div className={styles.menu} role="menu">
              <div className={styles.menuNickname}>{getMyNickname() ?? '이웃'}님</div>
              <Link to="/mypage" role="menuitem" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                <Icon name="person" size={20} />
                마이페이지
              </Link>
              <button type="button" role="menuitem" className={styles.menuItem} onClick={handleLogout} disabled={loggingOut}>
                <Icon name="logout" size={20} />
                {loggingOut ? '로그아웃 중…' : '로그아웃'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
