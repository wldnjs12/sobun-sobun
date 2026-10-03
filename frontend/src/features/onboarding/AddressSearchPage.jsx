import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { searchAddresses } from './onboardingApi.js'
import styles from './Onboarding.module.css'

// 자주 찾는 동네 바로가기 (누르면 그 단어로 검색)
const QUICK_KEYWORDS = [
  { label: '#인하대후문', keyword: '인하로' },
  { label: '#용현동', keyword: '용현' },
  { label: '#학익동', keyword: '학익' },
]

/**
 * 주소 검색 (S1' · Stitch s1_2 "우리 동네/건물 찾기", 1차 인증, 가입 시 1회).
 * 상태 4가지: 입력 전 / 검색 중 / 결과 있음 / 결과 없음 (+ 에러)
 * 결과 하나를 고르면 건물 확인 화면(S1'')으로 넘어간다.
 *
 * 디자인에서 뺀 것: 결과 카드의 "이웃 38명·진행 팟 9개·도보 2분", "현위치로 찾기" — 주소 API가 주지 않는 값이라
 */
export default function AddressSearchPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [searched, setSearched] = useState(null) // null이면 "입력 전"
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 빠르게 두 번 검색하면 늦게 온 옛날 응답이 새 결과를 덮어쓸 수 있어서, 마지막 요청만 반영한다
  const latestRequest = useRef(0)

  const search = async (text) => {
    const query = text.trim()
    if (!query) return
    const requestId = ++latestRequest.current
    setKeyword(query)
    setSearched(query)
    setLoading(true)
    setError(null)
    try {
      const data = await searchAddresses(query)
      if (requestId === latestRequest.current) setResults(data)
    } catch (err) {
      if (requestId === latestRequest.current) {
        setError(err.message)
        setResults([])
      }
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    search(keyword)
  }

  const choose = (candidate) => navigate('/onboarding/confirm', { state: { candidate } })

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button type="button" aria-label="뒤로가기" className={styles.roundButton} onClick={() => navigate(-1)}>
          <Icon name="arrow_back_ios_new" size={20} />
        </button>
        <span className={styles.regionChip}>
          <Icon name="share_location" size={16} />
          인천 미추홀권역
        </span>
      </div>

      <main className={styles.main}>
        <div>
          <span className={styles.matchBadge}>
            <Icon name="bolt" size={14} />
            주소 기반 이웃 매칭
          </span>
          <h1 className={styles.searchTitle}>우리 동네 / 건물 찾기</h1>
          <p className={styles.sectionBody}>골목 원룸부터 대단지 아파트까지, 같은 건물 소분 메이트를 만나요. 호수는 받지 않아요.</p>
        </div>

        <form className={styles.searchBox} onSubmit={handleSubmit} role="search">
          <Icon name="search" size={24} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="도로명, 건물명, 아파트명 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterKeyHint="search"
            autoFocus
          />
          {keyword && (
            <button type="button" aria-label="지우기" className={styles.clearButton} onClick={() => setKeyword('')}>
              <Icon name="cancel" size={20} filled />
            </button>
          )}
          <button type="submit" className={styles.searchButton} disabled={!keyword.trim() || loading}>
            검색
          </button>
        </form>

        <div className={styles.quickChips}>
          {QUICK_KEYWORDS.map((q) => (
            <button key={q.label} type="button" className={styles.quickChip} onClick={() => search(q.keyword)}>
              {q.label}
            </button>
          ))}
        </div>

        {loading && <p className={styles.stateText}>'{searched}' 주소를 찾는 중이에요…</p>}

        {!loading && error && (
          <p className={styles.stateText}>주소를 불러오지 못했어요. 잠시 후 다시 시도해주세요. ({error})</p>
        )}

        {!loading && !error && searched !== null && results.length === 0 && (
          <div className={styles.emptyState}>
            <Icon name="search_off" size={36} />
            <strong>검색 결과가 없어요</strong>
            <span>도로명을 다시 확인해주세요. (예: "인하로67번길")</span>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className={styles.resultCount}>
              검색 결과 <strong>{results.length}</strong>건
            </p>
            <ul className={styles.resultList}>
              {results.map((candidate) => (
                <li key={candidate.bdMgtSn}>
                  <button type="button" className={styles.resultCard} onClick={() => choose(candidate)}>
                    <span className={styles.resultBadges}>
                      <span className={candidate.isApartment ? styles.typeBadgeApt : styles.typeBadge}>
                        {candidate.isApartment ? '아파트' : '빌라·원룸'}
                      </span>
                      {candidate.isApartment && <span className={styles.typeBadgeSub}>동 선택</span>}
                    </span>
                    <strong className={styles.resultName}>{candidate.buildingName || '건물 이름 없음'}</strong>
                    <span className={styles.resultAddress}>{candidate.roadAddress}</span>
                    <span className={styles.resultArrow}>
                      <Icon name="arrow_forward" size={20} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <section className={styles.safeInfo}>
          <span className={styles.safeIcon}>
            <Icon name="door_front" size={22} />
          </span>
          <div>
            <strong>비대면 안전 소분 안내</strong>
            <p>원룸, 빌라, 오피스텔, 아파트 등 같은 건물 이웃과 1층 보관함이나 공동 로비에서 얼굴 마주치지 않고 함께 사요.</p>
            <span className={styles.safeLink}>
              <Icon name="lock" size={14} /> 주소는 건물 확인에만 쓰고, 이웃에게는 건물 이름만 보여요
            </span>
          </div>
        </section>
      </main>
    </div>
  )
}
