import AppHeader from './AppHeader.jsx'
import BottomNav from './BottomNav.jsx'
import Icon from './Icon.jsx'
import { BUILDING } from '../features/pod/podApi.js'
import styles from './ComingSoonPage.module.css'

/**
 * 아직 만들어지지 않은 탭의 자리 표시 화면.
 * 지금은 "커뮤니티" 탭에 쓴다 — ⑤ 커뮤니티 화면(김민준 담당, features/community/)이 생기면
 * App.jsx의 /community 라우트에서 이 컴포넌트를 그 화면으로 바꾸면 된다.
 */
export default function ComingSoonPage({ icon, title, description }) {
  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />
      <main className={styles.main}>
        <span className={styles.icon}>
          <Icon name={icon} size={36} />
        </span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <span className={styles.badge}>준비 중이에요</span>
      </main>
      <BottomNav />
    </div>
  )
}
