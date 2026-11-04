import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { searchAddresses } from './onboardingApi.js'
import styles from './Onboarding.module.css'

// 자주 찾는 동네 바로가기 (누르면 그 단어로 검색)
const QUICK_KEYWORDS = [
  { label: '#인하대후문', keyword: '인하로' },
  { label: '#용현동', keyword: '용현동' },
  { label: '#학익동', keyword: '학익동' },
]

const EXAMPLES = ['인하로67번길', '용현동 123', '학익 아파트']
const MIN_LENGTH = 2 // 서버(AddressKeyword)와 같은 기준. 한 글자는 Juso가 거절한다
const DEBOUNCE_MS = 300

// "인하로 100", "인하로67번길 3"처럼 도로명 뒤에 건물번호가 붙었는지.
// 이 경우 Juso는 그 번호의 건물 딱 1건만 돌려준다(정상 동작) → 화면에서 이유를 알려준다.
const HAS_BUILDING_NUMBER = /(로|길)\s*\d+(-\d+)?\s*$/

const normalize = (text) => text.trim().replace(/\s+/g, ' ')

/**
 * 주소 검색 (S1' · Stitch s1_2 "우리 동네/건물 찾기", 1차 인증, 가입 시 1회).
 * 상태: 입력 전(예시 안내) / 검색 중 / 결과 있음(+더 보기) / 결과 없음(+팁) / 에러(+다시 시도)
 * 결과 하나를 고르면 건물 확인 화면(S1'')으로 넘어간다.
 *
 * 입력하면 0.3초 뒤 자동으로 검색한다(디바운스): 한 글자 칠 때마다 요청하면 서버·Juso에 요청이 폭주하니까,
 * "입력이 0.3초 멈췄을 때" 한 번만 보낸다.
 *
 * 디자인에서 뺀 것: 결과 카드의 "이웃 38명·진행 팟 9개·도보 2분", "현위치로 찾기" — 주소 API가 주지 않는 값이라
 */
export default function AddressSearchPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [searched, setSearched] = useState(null) // 마지막으로 검색한 검색어. null이면 "입력 전"
  const [result, setResult] = useState(null) // { items, totalCount, page, hasMore }
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null) // { message, code }

  // 빠르게 두 번 검색하면 늦게 온 옛날 응답이 새 결과를 덮어쓸 수 있어서, 마지막 요청만 반영한다
  const latestRequest = useRef(0)

  const search = useCallback(async (text) => {
    const query = normalize(text)
    if (query.length < MIN_LENGTH) return
    const requestId = ++latestRequest.current
    setSearched(query)
    setLoading(true)
    setError(null)
    try {
      const page = await searchAddresses(query, 1)
      if (requestId === latestRequest.current) setResult(page)
    } catch (err) {
      if (requestId === latestRequest.current) {
        setError({ message: err.message, code: err.code })
        setResult(null)
      }
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }, [])

  // 디바운스 검색: keyword가 바뀌고 0.3초 동안 더 안 바뀌면 검색. 그 전에 또 바뀌면 이전 타이머는 취소된다(cleanup).
  useEffect(() => {
    const query = normalize(keyword)
    if (query.length < MIN_LENGTH || query === searched) return undefined
    const timer = setTimeout(() => search(query), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [keyword, searched, search])

  const loadMore = async () => {
    if (!result?.hasMore || loadingMore) return
    const requestId = latestRequest.current // 더 보기 도중 새 검색을 시작하면 이 응답은 버린다
    setLoadingMore(true)
    try {
      const next = await searchAddresses(searched, result.page + 1)
      if (requestId === latestRequest.current) {
        setResult((prev) => ({ ...next, items: [...prev.items, ...next.items] }))
      }
    } catch (err) {
      if (requestId === latestRequest.current) setError({ message: err.message, code: err.code })
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    search(keyword)
  }

  // 바로가기·예시 칩: 입력창에도 채워 넣고 바로 검색 (디바운스 기다리지 않음)
  const searchKeyword = (text) => {
    setKeyword(text)
    search(text)
  }

  const choose = (candidate) => navigate('/onboarding/confirm', { state: { candidate } })

  const items = result?.items ?? []
  const trimmedLength = keyword.trim().length
  const typedTooShort = trimmedLength > 0 && trimmedLength < MIN_LENGTH
  const showIdle = searched === null && !loading
  const isKeywordError = error?.code === 'INVALID_KEYWORD'

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
            주소 기반 동네 이웃 매칭
          </span>
          <h1 className={styles.searchTitle}>우리 집 주소 찾기</h1>
          <p className={styles.sectionBody}>
            골목 주택부터 대단지 아파트까지, 우리 집 주소를 찾아 동네 이웃과 생활용품을 나눠요.
          </p>
        </div>

        <form className={styles.searchBox} onSubmit={handleSubmit} role="search">
          <Icon name="search" size={24} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="도로명, 동+지번, 아파트명"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterKeyHint="search"
            aria-label="주소 검색어"
            autoFocus
          />
          {keyword && (
            <button type="button" aria-label="지우기" className={styles.clearButton} onClick={() => setKeyword('')}>
              <Icon name="cancel" size={20} filled />
            </button>
          )}
          <button type="submit" className={styles.searchButton} disabled={trimmedLength < MIN_LENGTH || loading}>
            검색
          </button>
        </form>

        <div className={styles.quickChips}>
          {QUICK_KEYWORDS.map((q) => (
            <button key={q.label} type="button" className={styles.quickChip} onClick={() => searchKeyword(q.keyword)}>
              {q.label}
            </button>
          ))}
        </div>

        {typedTooShort && <p className={styles.hint}>두 글자 이상 입력하면 바로 찾아드려요.</p>}

        {showIdle && (
          <div className={styles.searchHelp}>
            <strong>이렇게 검색해 보세요</strong>
            <div className={styles.exampleChips}>
              {EXAMPLES.map((example) => (
                <button key={example} type="button" className={styles.exampleChip} onClick={() => searchKeyword(example)}>
                  {example}
                </button>
              ))}
            </div>
            <span>인천 미추홀구(용현동·학익동) 근처 주소라면 더 많은 이웃을 만날 수 있어요.</span>
          </div>
        )}

        {loading && (
          <p className={styles.stateText} role="status">
            '{searched}' 주소를 찾는 중이에요…
          </p>
        )}

        {!loading && error && (
          <div className={styles.errorBox} role="alert">
            <Icon name={isKeywordError ? 'edit_note' : 'cloud_off'} size={28} />
            <strong>{isKeywordError ? '검색어를 확인해주세요' : '주소를 불러오지 못했어요'}</strong>
            <span>{error.message}</span>
            {!isKeywordError && (
              <button type="button" className={styles.retryButton} onClick={() => search(searched ?? keyword)}>
                <Icon name="refresh" size={18} /> 다시 시도
              </button>
            )}
          </div>
        )}

        {!loading && !error && result && items.length === 0 && (
          <div className={styles.emptyState}>
            <Icon name="search_off" size={36} />
            <strong>'{searched}' 검색 결과가 없어요</strong>
            <ul className={styles.tipList}>
              <li>도로명 + 건물번호로 검색해 보세요 (예: 인하로67번길 3)</li>
              <li>동 이름 + 지번도 돼요 (예: 용현동 123)</li>
              <li>오타나 띄어쓰기를 확인해 주세요</li>
            </ul>
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            <p className={styles.resultCount}>
              검색 결과 <strong>{result.totalCount.toLocaleString()}</strong>건
            </p>
            {result.totalCount === 1 && HAS_BUILDING_NUMBER.test(searched) && (
              <p className={styles.infoNote}>
                <Icon name="info" size={16} />
                <span>
                  건물번호까지 입력하면 그 건물 하나만 나와요. 도로명만 입력하면(예: "
                  {searched.replace(/\s*\d+(-\d+)?\s*$/, '')}") 주변 건물을 더 볼 수 있어요.
                </span>
              </p>
            )}
            <ul className={styles.resultList}>
              {items.map((candidate) => (
                <li key={candidate.bdMgtSn}>
                  <button type="button" className={styles.resultCard} onClick={() => choose(candidate)}>
                    <span className={styles.resultBadges}>
                      <span className={candidate.isApartment ? styles.typeBadgeApt : styles.typeBadge}>
                        {candidate.isApartment ? '아파트' : '주택·빌라'}
                      </span>
                      {candidate.isApartment && <span className={styles.typeBadgeSub}>동 선택</span>}
                      {candidate.neighborhoodName && (
                        <span className={styles.typeBadgeSub}>{candidate.neighborhoodName}</span>
                      )}
                    </span>
                    <strong className={styles.resultName}>{candidate.displayName || candidate.roadAddress}</strong>
                    <span className={styles.resultAddress}>{candidate.roadAddress}</span>
                    {candidate.jibunAddress && (
                      <span className={styles.resultJibun}>
                        <span className={styles.jibunLabel}>지번</span>
                        {candidate.jibunAddress}
                      </span>
                    )}
                    <span className={styles.resultArrow}>
                      <Icon name="arrow_forward" size={20} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {result.hasMore && (
              <button type="button" className={styles.moreButton} onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? '불러오는 중…' : `더 보기 (${items.length} / ${result.totalCount.toLocaleString()})`}
              </button>
            )}
          </>
        )}

        <section className={styles.safeInfo}>
          <span className={styles.safeIcon}>
            <Icon name="door_front" size={22} />
          </span>
          <div>
            <strong>비대면 안전 소분 안내</strong>
            <p>원룸, 빌라, 오피스텔, 아파트 등 동네 이웃과 공동현관이나 편의점 앞에서 얼굴 마주치지 않고 함께 사요.</p>
            <span className={styles.safeLink}>
              <Icon name="lock" size={14} /> 주소는 동네 확인에만 쓰고, 이웃에게는 동네 이름과 대략적인 거리만 보여요
            </span>
          </div>
        </section>
      </main>
    </div>
  )
}
