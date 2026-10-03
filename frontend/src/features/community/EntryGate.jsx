import Icon from '../../components/Icon.jsx'
import styles from './Community.module.css'

/**
 * 커뮤니티 입장 GPS 확인 중 / 막힘 상태를 보여주는 자리.
 * 실패 이유별 안내(반경 밖·권한 거부·위치 못 받음)는 바텀시트(LocationCheckSheet)가 따로 띄운다.
 * 시트를 닫으면 여기 "다시 확인" 버튼으로 재시도할 수 있다.
 */
export default function EntryGate({ status, onRetry }) {
  if (status === 'checking') {
    return (
      <div className={styles.gate}>
        <span className={styles.gateIcon}>
          <Icon name="my_location" size={32} className={styles.spin} />
        </span>
        <strong>위치를 확인하고 있어요</strong>
        <p>커뮤니티는 같은 건물 이웃만 들어올 수 있어요. 건물 안에 있는지 확인하는 용도예요.</p>
      </div>
    )
  }
  return (
    <div className={styles.gate}>
      <span className={`${styles.gateIcon} ${styles.gateIconWarn}`}>
        <Icon name="lock" size={32} />
      </span>
      <strong>위치 확인이 필요해요</strong>
      <p>등록한 건물 근처에서 위치를 확인하면 이웃들의 이야기를 볼 수 있어요.</p>
      <button type="button" className={styles.primaryButton} onClick={onRetry}>
        <Icon name="refresh" size={18} />
        다시 확인
      </button>
    </div>
  )
}
