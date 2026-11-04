import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import styles from './EmptyPodState.module.css'

/** 건물에 열린 공동구매가 하나도 없을 때 목록 자리에 보여주는 안내 (디자인 16번 화면). */
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
          모집중인 공동구매 없음
        </span>
        <h1 className={styles.heading}>아직 열린 공동구매가 없어요</h1>
        <p className={styles.description}>
          화장지·생수처럼 혼자 쓰기엔 많은 묶음 상품이 있다면 첫 공동구매를 열어보세요. 같은 건물 이웃들이 금방
          모일 거예요.
        </p>

        <button type="button" className={styles.createButton} onClick={onCreatePod}>
          <Icon name="add_circle" size={20} />
          첫 공동구매 열기
        </button>
        {/* 글쓰기 화면이 아니라 목록으로 보내는 이유: 커뮤니티 입장 GPS 확인(COMMUNITY_ENTER)은 목록에서 한다 */}
        <Link to="/community" className={styles.voteLink}>
          사고 싶은 것 커뮤니티에 제안하기
          <Icon name="arrow_forward" size={16} />
        </Link>
      </section>

      <section className={styles.tip}>
        <div className={styles.tipIcon}>
          <Icon name="lightbulb" size={18} />
        </div>
        <div>
          <div className={styles.tipHeader}>
            <span className={styles.tipTitle}>나누기 좋은 물건</span>
          </div>
          <p className={styles.tipBody}>
            화장지 30롤, 생수 2L×24병처럼{' '}
            <span className={styles.tipHighlight}>뜯지 않고 개수로 나눌 수 있는 묶음 상품</span>이 좋아요. 식재료
            소분은 위생·보관 리스크가 커서 다루지 않아요.
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
