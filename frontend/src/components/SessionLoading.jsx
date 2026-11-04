import styles from './SessionLoading.module.css'

/** 앱을 열 때 서버에서 내 정보(건물)를 받아오는 동안 잠깐 보이는 화면. */
export default function SessionLoading() {
  return (
    <div className={styles.wrap} role="status">
      <img src="/logo.svg" alt="" className={styles.logo} />
      <span className={styles.spinner} />
      <p className={styles.text}>내 정보를 불러오는 중이에요</p>
    </div>
  )
}
