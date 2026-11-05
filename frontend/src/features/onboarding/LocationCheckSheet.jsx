import { useEffect } from 'react'
import Icon from '../../components/Icon.jsx'
import { BUILDING } from '../pod/podApi.js'
import styles from './LocationCheck.module.css'

/**
 * GPS 확인 실패 바텀시트 (S3-a/b/c + 보안 연결·미지원·시간 초과·서버 오류). 문구 기준: docs/API_SPEC.md ①
 * 전체 화면이 아니라 바텀시트라서, 닫으면 하던 화면(팟 생성 폼 등)으로 그대로 돌아간다.
 * 모든 경우에 [다시 확인]이 있다 — 설정을 바꾸고 돌아와서 바로 다시 시도할 수 있게.
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
    body: '같은 동네 이웃인지 확인할 때만 쓰고, 위치 자체는 저장하지 않아요. 브라우저 설정에서 위치를 허용해 주세요.',
  },
  insecure: {
    icon: 'gpp_maybe',
    title: () => '보안 연결(https)에서만 위치를 확인할 수 있어요.',
    body: '주소창이 https:// 로 시작하는 소분소분 주소로 다시 열어 주세요.',
  },
  unsupported: {
    icon: 'location_off',
    title: () => '이 브라우저에서는 위치를 확인할 수 없어요.',
    body: '크롬·사파리·삼성 인터넷 최신 버전에서 다시 열어 주세요.',
  },
  unavailable: {
    icon: 'location_searching',
    title: () => '위치를 확인하지 못했어요.',
    body: '휴대폰의 위치(GPS) 기능이 켜져 있는지 확인하고, 창가나 건물 입구 근처에서 다시 시도해 주세요.',
  },
  timeout: {
    icon: 'timer_off',
    title: () => '위치 확인이 너무 오래 걸렸어요.',
    body: '와이파이를 켜고 창가나 건물 입구 근처에서 다시 시도해 주세요.',
  },
  server: {
    icon: 'cloud_off',
    title: () => '위치 확인 중 문제가 생겼어요.',
    body: null, // 서버가 준 문구(message)를 그대로 보여준다
  },
}

export default function LocationCheckSheet({ reason, message, retrying, onRetry, onClose }) {
  const content = CONTENT[reason] ?? CONTENT.server
  const body = content.body ?? message ?? '잠시 후 다시 시도해 주세요.'

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
        <p className={styles.body}>{body}</p>

        {reason === 'denied' && (
          <ol className={styles.steps}>
            <li>
              <strong>컴퓨터·안드로이드 크롬</strong>: 주소창 왼쪽 자물쇠(또는 설정) 아이콘 → <strong>위치</strong>를{' '}
              <strong>허용</strong>
            </li>
            <li>
              <strong>아이폰 사파리</strong>: 설정 앱 → 개인정보 보호 및 보안 → 위치 서비스 → Safari 웹 사이트 →{' '}
              <strong>앱을 사용하는 동안</strong>
            </li>
            <li>휴대폰 자체의 위치(GPS) 기능도 켜져 있는지 확인해요</li>
            <li>아래 [다시 확인]을 눌러요</li>
          </ol>
        )}

        {(reason === 'outOfRange' || reason === 'timeout' || reason === 'unavailable') && (
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
