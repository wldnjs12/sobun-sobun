import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import AccessDeniedView from '../../components/AccessDeniedView.jsx'
import { isBuildingAccessDenied } from '../../api/client.js'
import { BUILDING } from '../pod/podApi.js'
import { CATEGORIES, categoryOf, fetchPosts, splitContent, timeAgo } from './communityApi.js'
import useCommunityEntry from './useCommunityEntry.js'
import EntryGate from './EntryGate.jsx'
import styles from './Community.module.css'

/**
 * ⑤ 커뮤니티 글 목록 (S16 · Stitch s16).
 * 들어올 때 GPS 확인(COMMUNITY_ENTER)을 먼저 통과해야 글이 보인다.
 * 검색창은 서버 검색 API가 없어서, 불러온 글 안에서만 글자로 거른다.
 */
export default function CommunityListPage() {
  const navigate = useNavigate()
  const entry = useCommunityEntry()
  const [category, setCategory] = useState(null) // null = 전체
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (entry.status !== 'passed') return
    setPosts(null)
    fetchPosts(category).then(setPosts).catch(setError)
  }, [entry.status, category])

  if (isBuildingAccessDenied(error)) return <AccessDeniedView pageTitle="커뮤니티" what="커뮤니티 글" />

  const q = keyword.trim()
  const visible = posts?.filter((p) => !q || p.content.includes(q)) ?? []

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />

      {entry.status !== 'passed' ? (
        <EntryGate status={entry.status} onRetry={entry.retry} />
      ) : (
        <main className={styles.listMain}>
          <div className={styles.searchBox}>
            <Icon name="search" size={20} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder={`${BUILDING.name} 이웃 이야기 검색`}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className={styles.chips}>
            <button
              type="button"
              className={`${styles.chip} ${category === null ? styles.chipActive : ''}`}
              onClick={() => setCategory(null)}
            >
              전체
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`${styles.chip} ${category === c.key ? styles.chipActive : ''}`}
                onClick={() => setCategory(c.key)}
              >
                {c.label} {c.emoji}
              </button>
            ))}
          </div>

          {/* 공구 제안 → 반응 좋으면 팟으로: 커뮤니티를 만든 이유(05-community.md) */}
          <section className={styles.promo}>
            <span className={styles.promoBadge}>공구 제안 → 팟으로 바로 연결</span>
            <h2 className={styles.promoTitle}>이웃과 같이 살 대용량 물품 있나요?</h2>
            <p className={styles.promoBody}>먼저 익명으로 가볍게 제안해보고, 반응이 좋으면 바로 팟을 열 수 있어요.</p>
            <button
              type="button"
              className={styles.promoButton}
              onClick={() => navigate('/community/write', { state: { category: 'GROUP_BUY_SUGGESTION' } })}
            >
              <Icon name="campaign" size={18} />
              지금 제안하기
              <Icon name="arrow_forward" size={16} />
            </button>
            <Icon name="shopping_bag" size={88} className={styles.promoDeco} />
          </section>

          {error && <p className={styles.stateText}>글을 불러오지 못했어요. ({error.message})</p>}
          {!error && posts === null && <p className={styles.stateText}>글을 불러오는 중이에요…</p>}

          {!error && posts !== null && visible.length === 0 && (
            <div className={styles.empty}>
              <Icon name="post_add" size={40} />
              <strong>{q ? '검색 결과가 없어요' : '등록된 글이 아직 없어요'}</strong>
              <span>{q ? '다른 단어로 찾아보세요.' : '첫 번째 이야기를 이웃들에게 들려주세요!'}</span>
            </div>
          )}

          {visible.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </main>
      )}

      {entry.status === 'passed' && (
        <Link to="/community/write" state={{ category: category ?? 'FREE' }} className={styles.fab}>
          <Icon name="edit" size={20} />
          글쓰기
        </Link>
      )}

      {entry.locationSheet}
      <BottomNav />
    </div>
  )
}

function PostCard({ post }) {
  const { title, body } = splitContent(post.content)
  const cat = categoryOf(post.category)
  return (
    <Link to={`/community/posts/${post.id}`} className={styles.card}>
      <div className={styles.cardMeta}>
        <span className={styles.avatar}>
          <Icon name="person" size={16} filled />
        </span>
        <span className={styles.metaText}>
          {/* 첫 줄: "익명 이웃 · 건물명" 을 한 덩어리로 묶어야 세로 정렬(flex column)에서 한 줄로 보인다 */}
          <span>
            <strong>{post.mine ? '나' : '익명 이웃'}</strong> · {BUILDING.name}
          </span>
          <small>{timeAgo(post.createdAt)}</small>
        </span>
        <span className={`${styles.categoryBadge} ${styles[`cat_${post.category}`]}`}>
          {cat.emoji} {cat.label}
        </span>
      </div>
      <h3 className={styles.cardTitle}>{title}</h3>
      {body && <p className={styles.cardBody}>{body}</p>}
      <div className={styles.cardFooter}>
        <span>
          <Icon name="chat_bubble" size={16} /> 댓글 {post.commentCount}
        </span>
        {post.category === 'GROUP_BUY_SUGGESTION' && (
          <span className={styles.suggestHint}>
            <Icon name="bolt" size={14} /> 팟으로 열 수 있어요
          </span>
        )}
      </div>
    </Link>
  )
}
