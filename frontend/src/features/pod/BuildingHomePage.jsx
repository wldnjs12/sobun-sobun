import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import { isBuildingAccessDenied } from '../../api/client.js'
import PodCard from './PodCard.jsx'
import EmptyPodState from './EmptyPodState.jsx'
import { BUILDING, CATEGORIES, fetchMyPods, fetchNeighborhoodPods } from './podApi.js'
import { calcDiscountRate, calcPerPersonPrice } from './podUtils.js'
import styles from './BuildingHomePage.module.css'

const STATUS_TABS = [
  { key: 'OPEN', label: '모집중' },
  { key: 'ALL', label: '전체' },
]

// 나와 관계된 팟만 보기 — 이미 받은 목록을 화면에서 거른다 (서버 요청 없음)
const MINE_FILTERS = [
  { key: 'HOST', label: '내가 연 팟', icon: 'star' },
  { key: 'JOINED', label: '참여한 팟', icon: 'check_circle' },
]

// 내 팟 필터만 켰는데 0개일 때 보여줄 안내 (검색어·카테고리까지 걸렸으면 일반 "조건에 맞는 팟 없음"을 쓴다)
const MINE_EMPTY = {
  HOST: { title: '아직 내가 연 공동구매가 없어요', body: '필요한 물건을 직접 열면 같은 건물 이웃이 함께해요.' },
  JOINED: { title: '아직 참여한 공동구매가 없어요', body: '이웃이 연 팟에 참여하면 여기에 모여요.' },
}

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
  const [mine, setMine] = useState(null) // null | 'HOST' | 'JOINED'
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // 응답이 늦게 온 "예전 검색" 결과가 최신 결과를 덮어쓰지 않도록 요청 번호를 센다
  const requestSeq = useRef(0)
  const searchRef = useRef(null)
  // "/" 키로 검색창에 바로 포커스 (데스크톱 시연용)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
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

  const serverFiltered = Boolean(keyword) || category !== 'ALL' || status !== 'OPEN'
  const filtered = serverFiltered || mine !== null
  const isMine = (pod, key) => (key === 'HOST' ? pod.isHost : !pod.isHost && joinedIds.has(pod.id))
  const visiblePods = mine ? pods.filter((pod) => isMine(pod, mine)) : pods
  const mineCount = (key) => pods.filter((pod) => isMine(pod, key)).length
  // 검색어·카테고리 없이 '내 팟' 필터만 걸린 상태에서 0개 → 전용 안내
  const mineEmpty = mine && !keyword && category === 'ALL' ? MINE_EMPTY[mine] : null
  const goToPod = (pod) => navigate(`/pods/${pod.id}`)
  const goToCreatePod = () => navigate('/pods/new')
  const resetFilters = () => {
    setKeywordInput('')
    setKeyword('')
    setCategory('ALL')
    setStatus('OPEN')
    setMine(null)
  }

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />

      <main className={styles.main}>
        <section className={styles.heading}>
          <div className={styles.headingText}>
            <span className={styles.eyebrow}>
              <span className={styles.liveDot} />
              입주민 전용 · {BUILDING.name}
            </span>
            <h1 className={styles.title}>우리 건물 공동구매</h1>
            <p className={styles.subtitle}>대용량 묶음은 같이 사고, 뜯지 않은 단위 그대로 나눠요.</p>
          </div>
          <div className={styles.headingActions}>
            <button type="button" className={styles.ghostButton} onClick={() => navigate('/impact')}>
              <Icon name="monitoring" size={16} />
              임팩트
            </button>
            <button type="button" className={styles.primaryButton} onClick={goToCreatePod}>
              <Icon name="add" size={16} />
              새 공동구매
            </button>
          </div>
        </section>

        {/* 지표는 '내 팟만 보기'와 상관없이 건물 전체 기준이라 서버 필터만 표시한다 */}
        <KpiStrip pods={pods} loading={loading} filtered={serverFiltered} />

        <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Icon name="search" size={20} className={styles.searchIcon} />
          <input
            ref={searchRef}
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
          <div className={styles.mineFilters} role="group" aria-label="내 팟만 보기">
            {MINE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={mine === f.key}
                className={`${styles.chip} ${styles.mineChip} ${mine === f.key ? styles.chipActive : ''}`}
                onClick={() => setMine((cur) => (cur === f.key ? null : f.key))}
              >
                <Icon name={f.icon} size={14} filled={mine === f.key} />
                {f.label}
                {!loading && <span className={`${styles.mineCount} num`}>{mineCount(f.key)}</span>}
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

        {!loading && !error && visiblePods.length === 0 && !filtered && <EmptyPodState onCreatePod={goToCreatePod} />}
        {!loading && !error && visiblePods.length === 0 && mineEmpty && (
          <div className={styles.message}>
            <p className={styles.messageTitle}>{mineEmpty.title}</p>
            <p>{mineEmpty.body}</p>
            {mine === 'HOST' && (
              <>
                <button type="button" className={styles.retryButton} onClick={goToCreatePod}>
                  새 공동구매 열기
                </button>{' '}
              </>
            )}
            <button type="button" className={styles.ghostRetry} onClick={() => setMine(null)}>
              모집 중인 팟 보기
            </button>
          </div>
        )}
        {!loading && !error && visiblePods.length === 0 && filtered && !mineEmpty && (
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

        {!loading && !error && visiblePods.length > 0 && (
          <>
            <div className={styles.feed}>
              {visiblePods.map((pod) => (
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
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={styles.skeleton} />
      ))}
    </div>
  )
}

/**
 * 지금 목록 기준 핵심 숫자 4개. 서버 집계 API 없이 목록 응답만으로 계산한다.
 * 절약률 = (혼자 살 때 가격 - 다 모였을 때 1인 금액) / 혼자 살 때 가격 의 평균 (혼자 가격을 적은 팟만)
 */
function KpiStrip({ pods, loading, filtered }) {
  const open = pods.filter((p) => p.status === 'OPEN' && !p.deadlinePassed)
  const neighbors = open.reduce((sum, p) => sum + p.participantCount, 0)
  const seats = open.reduce((sum, p) => sum + Math.max(0, p.targetParticipantCount - p.participantCount), 0)
  const rates = open
    .map((p) => calcDiscountRate(calcPerPersonPrice(p.totalAmount, p.commissionRate, p.targetParticipantCount), p.originalPrice))
    .filter((r) => r !== null && r > 0)
  const avgRate = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null
  const items = [
    { label: '모집 중인 팟', value: open.length, unit: '개' },
    { label: '참여 중인 이웃', value: neighbors, unit: '명' },
    { label: '남은 자리', value: seats, unit: '석' },
    { label: '평균 절약률', value: avgRate ?? '–', unit: avgRate !== null ? '%' : '', accent: true },
  ]
  return (
    <div className={styles.kpis} aria-busy={loading}>
      {items.map((it) => (
        <div key={it.label} className={`${styles.kpi} ${it.accent ? styles.kpiAccent : ''}`}>
          <span className={styles.kpiLabel}>
            {it.label}
            {filtered && <span className={styles.kpiFilter}>필터</span>}
          </span>
          <span className={styles.kpiValue}>
            {loading ? <span className={styles.kpiSkeleton} /> : <>
              <span className="num">{it.value}</span>
              <small>{it.unit}</small>
            </>}
          </span>
        </div>
      ))}
    </div>
  )
}
