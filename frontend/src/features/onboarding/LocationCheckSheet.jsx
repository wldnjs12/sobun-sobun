import { useEffect } from 'react'
import Icon from '../../components/Icon.jsx'
import { BUILDING } from '../pod/podApi.js'
import styles from './LocationCheck.module.css'

/**
 * GPS 확인 실패 바텀시트 3종 (S3-a/b/c). 문구는 docs/API_SPEC.md ① 표 그대로.
 * 전체 화면이 아니라 바텀시트라서, 닫으면 하던 화면(팟 생성 폼 등)으로 그대로 돌아간다.
 */
const CONTENT = {
  outOfRange: {
    icon: 'wrong_location',
    title: () => `지금 위치가 등록한 건물(${BUILDING.name})과 달라요.`,
    body: '집에 돌아가서 다시 시도해 주세요.',
  },
  denied: {
    icon: 'location_disabled',
    title: () => '이웃 확인을 위해 위치 권한이 필요해요.',
    body: '같은 건물 이웃인지 확인할 때만 쓰고, 위치 자체는 저장하지 않아요.',
  },
  unavailable: {
    icon: 'location_searching',
    title: () => '위치를 확인하지 못했어요.',
    body: '창가나 건물 입구 근처에서 다시 시도해 주세요.',
  },
}

export default function LocationCheckSheet({ reason, retrying, onRetry, onClose }) {
  const content = CONTENT[reason] ?? CONTENT.unavailable

  // ESC 키로도 닫히게
  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="location-sheet-title">
        <div className={styles.handle} />
        <span className={`${styles.icon} ${reason === 'outOfRange' ? styles.iconWarn : ''}`}>
          <Icon name={content.icon} size={28} />
        </span>
        <h2 id="location-sheet-title" className={styles.title}>
          {content.title()}
        </h2>
        <p className={styles.body}>{content.body}</p>

        {reason === 'denied' && (
          <ol className={styles.steps}>
            <li>주소창 왼쪽의 자물쇠(또는 설정) 아이콘을 눌러요</li>
            <li>
              <strong>위치</strong>를 <strong>허용</strong>으로 바꿔요
            </li>
            <li>아래 [다시 확인]을 눌러요</li>
          </ol>
        )}

        {reason === 'outOfRange' && (
          <div className={styles.tips}>
            <span className={styles.tipsTitle}>
              <Icon name="tips_and_updates" size={18} /> 빠른 위치 인식 해결 방법
            </span>
            <p>
              <Icon name="wifi" size={16} /> 와이파이를 켜면 실내 GPS 오차가 크게 줄어요
            </p>
            <p>
              <Icon name="door_front" size={16} /> 건물 입구나 로비 근처에서 시도해 보세요
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            닫기
          </button>
          <button type="button" className={styles.retryButton} disabled={retrying} onClick={onRetry}>
            <Icon name="refresh" size={18} className={retrying ? styles.spin : ''} />
            {retrying ? '위치를 확인하고 있어요…' : '다시 확인'}
          </button>
        </div>
      </div>
    </>
  )
}
