import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import { isBuildingAccessDenied } from '../../api/client.js'
import PodCard from './PodCard.jsx'
import EmptyPodState from './EmptyPodState.jsx'
import { BUILDING, CATEGORIES, fetchMyPods, fetchNeighborhoodPods } from './podApi.js'
import styles from './BuildingHomePage.module.css'

const STATUS_TABS = [
  { key: 'OPEN', label: '모집중' },
  { key: 'ALL', label: '전체' },
]

// 글자를 칠 때마다 서버에 묻지 않고, 입력을 멈춘 뒤 0.3초가 지나면 한 번만 검색한다 (debounce)
const SEARCH_DELAY_MS = 300

/**
 * 건물 홈 / 공동구매 목록. 같은 건물 이웃들이 연 팟만 보여준다 (건물 단위 격리).
 * 검색어·카테고리·상태는 서버(GET /api/pods)가 거른다.
 * (파일 이름은 라우터·다른 화면이 import하고 있어서 BuildingHomePage 그대로 둔다)
 */
export default function BuildingHomePage() {
  const navigate = useNavigate()

  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('ALL')
  const [status, setStatus] = useState('OPEN')
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // 응답이 늦게 온 "예전 검색" 결과가 최신 결과를 덮어쓰지 않도록 요청 번호를 센다
  const requestSeq = useRef(0)
  // 내가 참여한 팟 id 목록. 팟 목록 응답에는 "내가 연 팟(isHost)"만 있고 "참여했는지"는 없어서,
  // 마이페이지의 '참여한 팟' API로 따로 받아와 카드에 표시한다. 실패해도 목록은 그대로 보여준다.
  const [joinedIds, setJoinedIds] = useState(() => new Set())

  useEffect(() => {
    fetchMyPods('joined')
      .then((list) => setJoinedIds(new Set(list.map((p) => p.id))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => setKeyword(keywordInput.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timerId) // 0.3초 안에 또 입력하면 이전 타이머를 취소
  }, [keywordInput])

  const load = useCallback(() => {
    const seq = ++requestSeq.current
    setLoading(true)
    setError(null)
    fetchNeighborhoodPods({ keyword, category, status })
      .then((data) => seq === requestSeq.current && setPods(data))
      .catch((e) => seq === requestSeq.current && setError(e)) // 에러 객체째 보관 → 403 구분용
      .finally(() => seq === requestSeq.current && setLoading(false))
  }, [keyword, category, status])

  useEffect(load, [load])

  const filtered = Boolean(keyword) || category !== 'ALL' || status !== 'OPEN'
  const goToPod = (pod) => navigate(`/pods/${pod.id}`)
  const goToCreatePod = () => navigate('/pods/new')
  const resetFilters = () => {
    setKeywordInput('')
    setKeyword('')
    setCategory('ALL')
    setStatus('OPEN')
  }

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />

      <main className={styles.main}>
        <div className={styles.statusStrip}>
          <div className={styles.statusLeft}>
            <span className={styles.verifiedBadge}>
              <Icon name="verified" size={14} filled />
              입주민 전용
            </span>
            <span className={styles.statusBuilding}>{BUILDING.name}</span>
          </div>
          {!loading && !error && !filtered && pods.length > 0 && (
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              모집중 {pods.length}개
            </span>
          )}
        </div>

        <HeroBanner />

        <div className={styles.searchBox}>
          <Icon name="search" size={20} className={styles.searchIcon} />
          <input
            type="search"
            aria-label="공동구매 검색"
            className={styles.searchInput}
            placeholder="화장지, 생수, 세제…"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
          />
        </div>

        {/* 탭 줄 오른쪽 끝에 [+ 열기] — 탭(tablist) 밖에 둬야 화면 낭독기가 버튼을 탭으로 착각하지 않는다 */}
        <div className={styles.tabBar}>
          <div className={styles.tabs} role="tablist" aria-label="모집 상태">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={status === t.key}
                className={`${styles.tab} ${status === t.key ? styles.tabActive : ''}`}
                onClick={() => setStatus(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className={styles.createChip} onClick={goToCreatePod}>
            <Icon name="add" size={16} className={styles.createChipIcon} />
            열기
          </button>
        </div>

        <div className={styles.chipRow}>
          <div className={styles.chips}>
            {[{ key: 'ALL', label: '전체' }, ...CATEGORIES].map((c) => (
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
        </div>

        {loading && <ListSkeleton />}

        {/* 403 = 서버가 "이 건물 소속이 아니다"고 판단 (이 브라우저의 건물 정보가 서버와 다를 때) */}
        {!loading && error && isBuildingAccessDenied(error) && (
          <p className={styles.message}>
            건물 정보가 서버와 맞지 않아요. <Link to="/onboarding/address">건물을 다시 등록해주세요</Link>
          </p>
        )}
        {!loading && error && !isBuildingAccessDenied(error) && (
          <div className={styles.message} role="alert">
            <p>목록을 불러오지 못했어요. ({error.message})</p>
            <button type="button" className={styles.retryButton} onClick={load}>
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && pods.length === 0 && !filtered && <EmptyPodState onCreatePod={goToCreatePod} />}
        {!loading && !error && pods.length === 0 && filtered && (
          <div className={styles.message}>
            <p>조건에 맞는 공동구매가 없어요.</p>
            <button type="button" className={styles.retryButton} onClick={resetFilters}>
              필터 초기화
            </button>{' '}
            <button type="button" className={styles.retryButton} onClick={goToCreatePod}>
              직접 열기
            </button>
          </div>
        )}

        {!loading && !error && pods.length > 0 && (
          <>
            <div className={styles.feed}>
              {pods.map((pod) => (
                <PodCard
                  key={pod.id}
                  pod={pod}
                  onJoin={goToPod}
                  myRole={pod.isHost ? 'host' : joinedIds.has(pod.id) ? 'joined' : null}
                />
              ))}
            </div>

            <div className={styles.suggestion}>
              <div className={styles.suggestionText}>
                <Icon name="help" size={22} className={styles.suggestionIcon} />
                <div>
                  <div className={styles.suggestionTitle}>찾는 물건이 없나요?</div>
                  <div className={styles.suggestionBody}>직접 열면 같은 건물 이웃이 함께해요</div>
                </div>
              </div>
              <button type="button" className={styles.suggestionButton} onClick={goToCreatePod}>
                열기
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

/** 불러오는 동안 카드 자리를 회색 상자로 채워서 화면이 덜컹거리지 않게 한다 */
function ListSkeleton() {
  return (
    <div className={styles.feed} aria-busy="true" aria-label="불러오는 중">
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.skeleton} />
      ))}
    </div>
  )
}

function HeroBanner() {
  return (
    <div className={styles.hero}>
      <div className={styles.heroContent}>
        <span className={styles.heroTag}>우리 건물 생필품 공동구매</span>
        <h2 className={styles.heroTitle}>
          대용량 묶음은 같이 사고
          <br />
          미개봉 그대로 나눠요
        </h2>
        <div className={styles.heroPerks}>
          <Icon name="apartment" size={16} className={styles.heroPerkIcon} />
          <span>같은 건물 이웃</span>
          <span className={styles.heroDot}>·</span>
          <Icon name="inventory_2" size={16} className={styles.heroPerkIcon} />
          <span>뜯지 않고 단위로 나눔</span>
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
