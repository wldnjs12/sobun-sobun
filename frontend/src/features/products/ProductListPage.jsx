import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client.js'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import { BUILDING } from '../pod/podApi.js'
import { calcPerPersonPrice } from '../pod/podUtils.js'
import styles from './ProductListPage.module.css'

const POPULAR_KEYWORDS = ['코스트코 화장지', '닭가슴살 20개', '햇반 36입', '탄산수']
// "몇 명이 나누면 얼마"를 보여줄 때 쓰는 예시 값 (팟 기본 수고비율 5%와 같게)
const SPLIT_EXAMPLE = { people: 3, commissionRate: 0.05 }

/** 네이버 쇼핑 API는 상품명에 검색어 강조용 <b> 태그를 섞어 보낸다. 화면에 태그가 그대로 보이지 않게 지운다. */
const stripTags = (text) => text.replace(/<[^>]+>/g, '')

/**
 * 핵심 기능 ④: 최저가 조회 (디자인 핸드오프 S13 · Stitch 14번). 담당: 도우현 프론트 / 김민준 백엔드
 * 상태 4가지: 검색 전 / 검색 중 / 결과 있음 / 결과 없음 (+ 에러)
 * 이 기능이 고장 나도 팟 만들기는 막히면 안 된다 (docs/features/04-product-search.md 엣지 케이스)
 */
export default function ProductListPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [searchedKeyword, setSearchedKeyword] = useState(null) // null이면 "검색 전"
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 검색을 빠르게 두 번 하면 먼저 보낸 요청의 응답이 늦게 도착해서 결과를 덮어쓸 수 있다.
  // 요청마다 번호를 붙이고, 가장 마지막 요청의 응답만 화면에 반영한다.
  const latestRequest = useRef(0)

  const search = async (text) => {
    const query = text.trim()
    if (!query) return
    const requestId = ++latestRequest.current
    setKeyword(query)
    setSearchedKeyword(query)
    setLoading(true)
    setError(null)
    try {
      const data = await api.get(`/products/search?keyword=${encodeURIComponent(query)}`)
      if (requestId !== latestRequest.current) return
      // 가격 오름차순 정렬은 백엔드 담당이지만, 혹시 몰라 화면에서도 한 번 더 정렬한다
      setResults([...data].sort((a, b) => Number(a.price) - Number(b.price)))
    } catch (e) {
      if (requestId !== latestRequest.current) return
      setError(e.message)
      setResults([])
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    search(keyword)
  }

  // 팟 생성 화면으로 상품명과 가격을 넘긴다. state는 주소에 안 보이게 화면끼리 값을 전달하는 방법이다.
  const createPodWith = (product) => {
    navigate('/pods/new', { state: { title: stripTags(product.name), totalAmount: Number(product.price) } })
  }

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />

      <main className={styles.main}>
        <h1 className={styles.heading}>대용량 최저가 비교</h1>

        <form className={styles.searchBox} onSubmit={handleSubmit} role="search">
          <Icon name="search" size={22} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="상품을 검색해보세요 (예: 휴지, 닭가슴살)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterKeyHint="search"
          />
          {keyword && (
            <button type="button" aria-label="지우기" className={styles.clearButton} onClick={() => setKeyword('')}>
              <Icon name="close" size={18} />
            </button>
          )}
          <button type="submit" className={styles.searchButton} disabled={!keyword.trim() || loading}>
            검색
          </button>
        </form>

        <div className={styles.keywords}>
          <span className={styles.keywordsLabel}>
            <Icon name="local_fire_department" size={15} className={styles.fireIcon} />
            인기
          </span>
          {POPULAR_KEYWORDS.map((word) => (
            <button key={word} type="button" className={styles.keywordChip} onClick={() => search(word)}>
              #{word}
            </button>
          ))}
        </div>

        <ResultSection
          searchedKeyword={searchedKeyword}
          results={results}
          loading={loading}
          error={error}
          onCreatePod={createPodWith}
        />
      </main>

      <BottomNav />
    </div>
  )
}

function ResultSection({ searchedKeyword, results, loading, error, onCreatePod }) {
  if (searchedKeyword === null) {
    return (
      <div className={styles.state}>
        <Icon name="travel_explore" size={40} className={styles.stateIcon} />
        <p className={styles.stateTitle}>사고 싶은 대용량 상품을 검색해보세요</p>
        <p className={styles.stateBody}>가장 싼 판매처를 찾아서, 바로 이웃과 나눌 팟을 만들 수 있어요.</p>
      </div>
    )
  }

  if (loading) {
    return <p className={styles.loading}>'{searchedKeyword}' 최저가를 찾는 중이에요…</p>
  }

  if (error) {
    return (
      <div className={styles.state}>
        <Icon name="cloud_off" size={40} className={styles.stateIcon} />
        <p className={styles.stateTitle}>잠시 후 다시 시도해주세요</p>
        <p className={styles.stateBody}>최저가 정보를 불러오지 못했어요. ({error})</p>
        <Link to="/pods/new" className={styles.stateLink}>
          최저가 조회 없이 팟 만들기
          <Icon name="arrow_forward" size={16} />
        </Link>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className={styles.state}>
        <Icon name="search_off" size={40} className={styles.stateIcon} />
        <p className={styles.stateTitle}>검색 결과가 없어요</p>
        <p className={styles.stateBody}>다른 검색어로 시도해보세요.</p>
      </div>
    )
  }

  return (
    <section className={styles.results}>
      <div className={styles.resultsHeader}>
        <h2 className={styles.resultsTitle}>
          '{searchedKeyword}' 최저가
          <span className={styles.countBadge}>{results.length}</span>
        </h2>
        <span className={styles.sortLabel}>
          <Icon name="swap_vert" size={16} className={styles.primaryIcon} />
          낮은 가격순
        </span>
      </div>

      {results.map((product, i) => (
        <ProductCard
          key={`${product.url}-${i}`}
          product={product}
          isLowest={i === 0}
          onCreatePod={() => onCreatePod(product)}
        />
      ))}
    </section>
  )
}

function ProductCard({ product, isLowest, onCreatePod }) {
  const price = Number(product.price)
  const perPerson = calcPerPersonPrice(price, SPLIT_EXAMPLE.commissionRate, SPLIT_EXAMPLE.people)

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.thumb}>
          <Icon name="shopping_bag" size={36} className={styles.thumbIcon} />
          {isLowest && <span className={styles.lowestBadge}>최저가</span>}
        </div>
        <div className={styles.cardInfo}>
          <div className={styles.mall}>
            <Icon name="storefront" size={13} />
            {product.mallName}
          </div>
          <h3 className={styles.productName}>{stripTags(product.name)}</h3>
          <div className={styles.priceRow}>
            <span className={styles.price}>{price.toLocaleString()}원</span>
            {product.url && (
              <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.mallLink}>
                판매처 보기
              </a>
            )}
          </div>
        </div>
      </div>

      <div className={styles.split}>
        <div className={styles.splitRow}>
          <span className={styles.splitLabel}>
            <Icon name="pie_chart" size={18} className={styles.tertiaryIcon} />
            {SPLIT_EXAMPLE.people}명이 나누면
          </span>
          <span className={styles.splitPrice}>
            {perPerson.toLocaleString()}원<small>/인</small>
          </span>
        </div>
        <div className={styles.splitBar} style={{ gridTemplateColumns: `repeat(${SPLIT_EXAMPLE.people}, 1fr)` }}>
          {Array.from({ length: SPLIT_EXAMPLE.people }, (_, i) => (
            <span key={i} className={i === 0 ? styles.splitMine : styles.splitEmpty} />
          ))}
        </div>
        <span className={styles.splitHint}>대표 수고비 {SPLIT_EXAMPLE.commissionRate * 100}% 포함 · 인원은 팟 만들 때 바꿀 수 있어요</span>
      </div>

      <button type="button" className={styles.createButton} onClick={onCreatePod}>
        <Icon name="group_add" size={18} />
        이 상품으로 팟 만들기
      </button>
    </article>
  )
}
