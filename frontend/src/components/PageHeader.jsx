import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import styles from './PageHeader.module.css'

/** 하위 화면(팟 상세·생성 등) 상단 헤더. 뒤로가기 + 제목. */
export default function PageHeader({ title }) {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      {/* navigate(-1)은 브라우저 뒤로가기와 같다 */}
      <button type="button" aria-label="뒤로가기" className={styles.backButton} onClick={() => navigate(-1)}>
        <Icon name="arrow_back_ios_new" size={22} />
      </button>
      <h1 className={styles.title}>{title}</h1>
    </header>
  )
}
