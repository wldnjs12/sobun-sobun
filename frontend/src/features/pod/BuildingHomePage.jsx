import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import PodCard from './PodCard.jsx'
import EmptyPodState from './EmptyPodState.jsx'
import { fetchBuildingPods } from './podListApi.js'
import styles from './BuildingHomePage.module.css'

// TODO: 온보딩(①)에서 인증한 건물 정보를 받아오도록 교체
const BUILDING = { id: 1, name: '신촌 청년드림빌' }

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'fresh', label: '냉장/냉동' },
  { key: 'processed', label: '가공식품' },
  { key: 'household', label: '생필품' },
]

/**
 * 건물 홈 / 팟 목록 (디자인 핸드오프 S4, Stitch 05번 · 빈 상태는 16번).
 * 개발 중 빈 화면을 확인하려면 주소 뒤에 ?empty 를 붙인다: /home?empty
 */
export default function BuildingHomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const forceEmpty = searchParams.has('empty')

  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('all')

  useEffect(() => {
    fetchBuildingPods(BUILDING.id)
      .then((data) => setPods(forceEmpty ? [] : data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [forceEmpty])

  const openPods = pods.filter((pod) => !pod.closed)
  const visiblePods =
    category === 'all' ? openPods : openPods.filter((pod) => pod.category === category)

  const goToPod = (pod) => navigate(`/pods/${pod.id}`)
  // TODO: 팟 생성 화면(S5) 라우트가 생기면 연결
  const goToCreatePod = () => {}

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />

      <main className={styles.main}>
        <div className={styles.statusStrip}>
          <div className={styles.statusLeft}>
            <span className={styles.verifiedBadge}>
              <Icon name="verified" size={14} filled />
              입주민 전용 인증
            </span>
            <span className={styles.statusBuilding}>{BUILDING.name}</span>
          </div>
          {openPods.length > 0 && (
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              실시간 {openPods.length}개 팟 진행 중
            </span>
          )}
        </div>

        <HeroBanner />

        <div className={styles.chipRow}>
          <div className={styles.chips}>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`${styles.chip} ${category === c.key ? styles.chipActive : ''}`}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button type="button" className={styles.createChip} onClick={goToCreatePod}>
            <Icon name="add" size={16} className={styles.createChipIcon} />
            팟 만들기
          </button>
        </div>

        {loading && <p className={styles.message}>팟 목록을 불러오는 중이에요…</p>}
        {error && <p className={styles.message}>목록을 불러오지 못했어요. ({error})</p>}

        {!loading && !error && openPods.length === 0 && (
          <EmptyPodState onCreatePod={goToCreatePod} />
        )}

        {!loading && !error && openPods.length > 0 && (
          <>
            <div className={styles.feed}>
              {visiblePods.map((pod) => (
                <PodCard key={pod.id} pod={pod} onJoin={goToPod} />
              ))}
              {visiblePods.length === 0 && (
                <p className={styles.message}>이 카테고리에는 진행 중인 팟이 없어요.</p>
              )}
            </div>

            <div className={styles.suggestion}>
              <div className={styles.suggestionText}>
                <Icon name="help" size={22} className={styles.suggestionIcon} />
                <div>
                  <div className={styles.suggestionTitle}>원하는 상품이 없나요?</div>
                  <div className={styles.suggestionBody}>이웃 입주민에게 소분 팟을 먼저 제안해보세요</div>
                </div>
              </div>
              <button type="button" className={styles.suggestionButton} onClick={goToCreatePod}>
                요청하기
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function HeroBanner() {
  return (
    <div className={styles.hero}>
      <div className={styles.heroContent}>
        <span className={styles.heroTag}>1인 가구 알뜰 소분</span>
        <h2 className={styles.heroTitle}>
          대용량 가격으로 1인분씩!
          <br />
          이번 주 우리건물 핫한 소분
        </h2>
        <div className={styles.heroPerks}>
          <Icon name="local_shipping" size={16} className={styles.heroPerkIcon} />
          <span>배송비 0원</span>
          <span className={styles.heroDot}>·</span>
          <Icon name="smart_toy" size={16} className={styles.heroPerkIcon} />
          <span>1층 스마트 무인보관함 픽업</span>
        </div>
      </div>
      {/* 선물상자 그림: Stitch 디자인(05./code.html)의 SVG를 그대로 옮겼다 */}
      <svg className={styles.heroGift} fill="none" viewBox="0 0 100 100" aria-hidden="true">
        <rect fill="#FFDCC5" height="48" rx="8" width="60" x="20" y="38" />
        <rect fill="#FD933D" height="14" rx="4" width="68" x="16" y="28" />
        <rect fill="#F9BD22" height="58" width="10" x="45" y="28" />
        <path d="M50 28C44 14 26 14 36 28C40 28 46 28 50 28Z" fill="#F9BD22" />
        <path d="M50 28C56 14 74 14 64 28C60 28 54 28 50 28Z" fill="#F9BD22" />
        <circle cx="50" cy="28" fill="#765700" r="4" />
        <circle cx="82" cy="22" fill="#FFE5A3" r="3" />
        <circle cx="20" cy="18" fill="#FFFFFF" r="2.5" />
      </svg>
    </div>
  )
}
