import Icon from '../../components/Icon.jsx'
import styles from './EmptyPodState.module.css'

/** 건물에 열린 팟이 하나도 없을 때 목록 자리에 보여주는 안내 (디자인 16번 화면). */
export default function EmptyPodState({ onCreatePod }) {
  return (
    <>
      <section className={styles.card}>
        <div className={`${styles.glow} ${styles.glowTopLeft}`} />
        <div className={`${styles.glow} ${styles.glowBottomRight}`} />

        <div className={styles.illustration}>
          <div className={styles.illustrationCircle}>
            <div className={styles.illustrationInnerCircle} />
          </div>
          <LockerIllustration />
        </div>

        <span className={styles.statusBadge}>
          <Icon name="notifications_paused" size={14} />
          모두 분배 완료 상태
        </span>
        <h1 className={styles.heading}>아직 열린 팟이 없어요</h1>
        <p className={styles.description}>
          같이 사고 싶은 상품이 있다면 첫 번째 팟을 만들어보세요. 같은 건물 이웃들이 금방 모일
          거예요!
        </p>

        <button type="button" className={styles.createButton} onClick={onCreatePod}>
          <Icon name="add_circle" size={20} />
          첫 팟 만들기
        </button>
        {/* TODO: 투표함 기능은 아직 기획 문서에 없음 — 팀 논의 후 연결 */}
        <button type="button" className={styles.voteLink}>
          사고 싶은 것 투표함에 올리기
          <Icon name="arrow_forward" size={16} />
        </button>
      </section>

      <section className={styles.tip}>
        <div className={styles.tipIcon}>
          <Icon name="lightbulb" size={18} />
        </div>
        <div>
          <div className={styles.tipHeader}>
            <span className={styles.tipTitle}>소분 성공 확률 99% 팁</span>
            <span className={styles.tipTag}>입주민 데이터</span>
          </div>
          <p className={styles.tipBody}>
            코스트코 키친타올이나 대용량 세제처럼 부피가 크고 유통기한이 긴 생필품은 보통{' '}
            <span className={styles.tipHighlight}>30분 안에 팟이 마감</span>돼요!
          </p>
        </div>
      </section>
    </>
  )
}

/** 무인보관함 + 택배상자 그림. Stitch 디자인(16._empty_state/code.html)의 SVG를 그대로 옮겼다. */
function LockerIllustration() {
  return (
    <svg className={styles.illustrationSvg} fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect fill="#006194" fillOpacity="0.15" height="52" rx="4" width="34" x="22" y="24" />
      <rect fill="#007bb9" height="23" rx="3" width="30" x="24" y="26" />
      <rect fill="#006194" height="23" rx="3" width="30" x="24" y="51" />
      <circle cx="50" cy="37" fill="#fdfcff" r="1.75" />
      <circle cx="50" cy="62" fill="#fdfcff" r="1.75" />
      <rect fill="#cce5ff" height="2" rx="1" width="12" x="27" y="32" />
      <rect fill="#cce5ff" height="2" rx="1" width="12" x="27" y="57" />
      <g>
        <rect fill="#fd933d" height="34" rx="4" width="36" x="44" y="44" />
        <path d="M44 54H80" opacity="0.3" stroke="#944a00" strokeDasharray="2 3" strokeLinecap="round" strokeWidth="2" />
        <rect fill="#ffdcc5" fillOpacity="0.75" height="34" width="8" x="58" y="44" />
        <circle cx="62" cy="54" fill="#ffffff" r="5" />
        <path
          d="M62 56.5s-2.5-1.5-2.5-3c0-.9.7-1.5 1.5-1.5.6 0 1 .4 1 1 .1-.6.5-1 1-1 .8 0 1.5.6 1.5 1.5 0 1.5-2.5 3-2.5 3z"
          fill="#fd933d"
        />
      </g>
      <circle cx="76" cy="28" fill="#f9bd22" r="2.5" />
      <path d="M18 42L20 40L18 38L16 40Z" fill="#ffb783" />
      <circle cx="82" cy="40" fill="#007bb9" r="1.5" />
    </svg>
  )
}
