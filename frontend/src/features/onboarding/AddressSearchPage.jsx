import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { searchAddresses } from './onboardingApi.js'
import styles from './Onboarding.module.css'

/**
 * 주소 검색 (S1' · 1차 인증, 가입 시 1회).
 * 상태 4가지: 입력 전 / 검색 중 / 결과 있음 / 결과 없음 (+ 에러)
 * 결과 하나를 고르면 건물 확인 화면(S1'')으로 넘어간다.
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const query = keyword.trim()
    if (!query) return
    const requestId = ++latestRequest.current
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

  const choose = (candidate) => navigate('/onboarding/confirm', { state: { candidate } })

  return (
    <div className={styles.page}>
      <PageHeader title="우리 건물 찾기" />

      <main className={styles.main}>
        <div>
          <h2 className={styles.sectionTitle}>사는 곳 주소를 검색해주세요</h2>
          <p className={styles.sectionBody}>
            같은 건물 이웃끼리만 공동구매할 수 있도록, 처음 한 번만 등록해요. 호수는 받지 않아요.
          </p>
        </div>

        <form className={styles.searchBox} onSubmit={handleSubmit} role="search">
          <Icon name="search" size={22} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="도로명이나 건물 이름 (예: 인하로, 제니스빌)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterKeyHint="search"
            autoFocus
          />
          <button type="submit" className={styles.searchButton} disabled={!keyword.trim() || loading}>
            검색
          </button>
        </form>

        {searched === null && (
          <div className={styles.infoBox}>
            <span className={styles.infoIcon}>
              <Icon name="lock" size={20} />
            </span>
            <div>
              <strong>주소는 건물 확인에만 써요</strong>
              <p>이웃에게는 건물 이름만 보이고, 내 주소나 호수는 공개되지 않아요.</p>
            </div>
          </div>
        )}

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
          <ul className={styles.resultList}>
            {results.map((candidate) => (
              <li key={candidate.bdMgtSn}>
                <button type="button" className={styles.resultItem} onClick={() => choose(candidate)}>
                  <span className={styles.resultIcon}>
                    <Icon name={candidate.isApartment ? 'apartment' : 'home'} size={22} />
                  </span>
                  <span className={styles.resultText}>
                    <strong>{candidate.buildingName || '건물 이름 없음'}</strong>
                    <span>{candidate.roadAddress}</span>
                  </span>
                  <Icon name="chevron_right" size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
