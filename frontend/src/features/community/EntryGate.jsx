import Icon from '../../components/Icon.jsx'
import styles from './Community.module.css'

/**
 * 커뮤니티 입장 GPS 확인 중 / 막힘 상태를 보여주는 자리.
 * 막혔을 때는 이유(failure.reason)별로 무엇을 하면 되는지 알려주고, [다시 확인]으로 언제든 재시도할 수 있게 한다.
 * (막다른 화면이 되지 않게 — 이유를 모르면 사용자는 앱이 고장 난 줄 안다)
 */
const REASONS = {
  denied: {
    icon: 'location_disabled',
    title: '위치 권한이 꺼져 있어요',
    body: '같은 건물 이웃인지 확인할 때만 위치를 쓰고, 위치 자체는 저장하지 않아요.',
    steps: [
      '주소창 왼쪽의 자물쇠(또는 설정) 아이콘을 눌러요',
      '위치를 "허용"으로 바꿔요',
      '아래 [다시 확인]을 눌러요',
    ],
  },
  unavailable: {
    icon: 'location_searching',
    title: '위치를 받지 못했어요',
    body: 'GPS 신호가 약하거나 시간이 오래 걸렸어요. 휴대폰의 위치 서비스(GPS)가 켜져 있는지 확인하고, 창가나 건물 입구 근처에서 다시 시도해 주세요.',
  },
  outOfRange: {
    icon: 'wrong_location',
    title: '등록한 건물 근처가 아니에요',
    body: '커뮤니티는 등록한 건물 근처에서 위치를 확인한 뒤 들어올 수 있어요. 집 근처에서 다시 시도해 주세요.',
  },
  network: {
    icon: 'cloud_off',
    title: '서버에 연결하지 못했어요',
    body: '인터넷 연결을 확인하고 잠시 뒤 다시 시도해 주세요.',
  },
}

export default function EntryGate({ status, failure, onRetry }) {
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

  const info = REASONS[failure?.reason] ?? REASONS.network
  // 서버가 보낸 한국어 안내(예: 반경 밖 사유)가 있으면 같이 보여준다. 브라우저 위치 에러 원문(영어)은 숨긴다
  const serverMessage = failure?.reason === 'outOfRange' || failure?.reason === 'network' ? failure?.message : null

  return (
    <div className={styles.gate} role="alert">
      <span className={`${styles.gateIcon} ${styles.gateIconWarn}`}>
        <Icon name={info.icon} size={32} />
      </span>
      <strong>{info.title}</strong>
      <p>{info.body}</p>
      {serverMessage && <p>{serverMessage}</p>}
      {info.steps && (
        <ol>
          {info.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      <button type="button" className={styles.primaryButton} onClick={onRetry}>
        <Icon name="refresh" size={18} />
        다시 확인
      </button>
    </div>
  )
}
