import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import AccessDeniedView from '../../components/AccessDeniedView.jsx'
import { isBuildingAccessDenied } from '../../api/client.js'
import { BUILDING } from '../pod/podApi.js'
import {
  addComment,
  categoryOf,
  deleteComment,
  deletePost,
  fetchPost,
  reportComment,
  reportPost,
  splitContent,
  timeAgo,
} from './communityApi.js'
import useCommunityEntry from './useCommunityEntry.js'
import EntryGate from './EntryGate.jsx'
import styles from './Community.module.css'

/**
 * ⑤ 커뮤니티 글 상세 (S17 · Stitch s17).
 * - 글쓴이는 "글쓴이" 뱃지, 다른 사람은 "이웃 N" (번호는 서버가 그 글 안에서 등장 순서로 매김)
 * - ⋯ 메뉴: 내 글이면 삭제, 남의 글이면 신고 ("신고했어요" 토스트)
 * - "공구 제안" 글이면 [이 품목으로 팟 열기] → 팟 생성 화면에 품목 이름을 채워서 이동 (거기서 GPS 한 번 더 확인)
 * 목록을 거치지 않고 링크로 바로 열어도 입장 GPS 확인을 거친다.
 */
export default function CommunityDetailPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const entry = useCommunityEntry({ recheckOnEnter: false }) // 목록에서 들어왔으면 다시 묻지 않음
  const [post, setPost] = useState(null)
  const [error, setError] = useState(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [menuFor, setMenuFor] = useState(null) // 'post' | 댓글 id | null
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    if (entry.status !== 'passed') return
    fetchPost(postId).then(setPost).catch(setError)
  }, [entry.status, postId])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = (text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }

  if (isBuildingAccessDenied(error)) return <AccessDeniedView pageTitle="커뮤니티" what="글" />

  if (entry.status !== 'passed') {
    return (
      <div className={styles.page}>
        <PageHeader title="커뮤니티" />
        <EntryGate status={entry.status} onRetry={entry.retry} />
        {entry.locationSheet}
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className={styles.page}>
        <PageHeader title="커뮤니티" />
        <p className={styles.stateText}>{error?.message ?? '글을 불러오는 중이에요…'}</p>
      </div>
    )
  }

  const { title, body } = splitContent(post.content)
  const cat = categoryOf(post.category)

  const handleSend = async (e) => {
    e.preventDefault()
    const text = comment.trim()
    if (!text) return
    setSending(true)
    try {
      setPost(await addComment(post.id, text))
      setComment('')
    } catch (err) {
      showToast(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleReport = async (target) => {
    setMenuFor(null)
    try {
      if (target === 'post') await reportPost(post.id)
      else await reportComment(target)
      showToast('신고했어요. 검토 후 처리할게요.')
    } catch (err) {
      showToast(err.message)
    }
  }

  const handleDelete = async (target) => {
    setMenuFor(null)
    if (!window.confirm(target === 'post' ? '이 글을 삭제할까요?' : '이 댓글을 삭제할까요?')) return
    try {
      if (target === 'post') {
        await deletePost(post.id)
        navigate('/community', { replace: true })
      } else {
        setPost(await deleteComment(post.id, target))
      }
    } catch (err) {
      showToast(err.message)
    }
  }

  // 공구 제안 → 팟 생성: 첫 줄(제목)을 품목 이름으로 넘긴다. 팟 생성 화면이 "커뮤니티 제안에서 가져왔어요"로 표시
  const openPod = () => navigate('/pods/new', { state: { title } })

  return (
    <div className={styles.page}>
      <PageHeader title="커뮤니티" />

      <main className={styles.detailMain}>
        <div className={styles.detailTop}>
          <span className={`${styles.categoryBadge} ${styles[`cat_${post.category}`]}`}>
            {cat.emoji} {cat.label}
          </span>
          <span className={styles.muted}>{timeAgo(post.createdAt)}</span>
        </div>

        <section className={styles.authorRow}>
          <span className={styles.avatarLarge}>
            <Icon name="person" size={22} filled />
          </span>
          <div className={styles.authorText}>
            <strong>
              {post.mine ? '나' : '익명 이웃'} <span className={styles.writerBadge}>글쓴이</span>
            </strong>
            <span>
              <Icon name="verified" size={14} /> {BUILDING.name} 이웃
            </span>
          </div>
          <MoreMenu
            open={menuFor === 'post'}
            onToggle={() => setMenuFor(menuFor === 'post' ? null : 'post')}
            mine={post.mine}
            onReport={() => handleReport('post')}
            onDelete={() => handleDelete('post')}
          />
        </section>

        <article className={styles.postBody}>
          <h1 className={styles.postTitle}>{title}</h1>
          {body && <p className={styles.postText}>{body}</p>}
        </article>

        {post.suggestable && (
          <section className={styles.podCta}>
            <span className={styles.podCtaEyebrow}>
              <Icon name="bolt" size={16} /> 공구 제안 → 팟 바로 연결
            </span>
            <h2 className={styles.podCtaTitle}>이 품목으로 바로 팟 열기</h2>
            <p className={styles.podCtaBody}>품목 이름이 채워진 팟 생성 화면으로 이동해요. 금액과 인원만 정하면 끝!</p>
            <button type="button" className={styles.podCtaButton} onClick={openPod}>
              팟 개설하기
              <Icon name="arrow_forward" size={18} />
            </button>
          </section>
        )}

        <section className={styles.comments}>
          <h2 className={styles.commentsTitle}>
            댓글 <span>{post.comments.length}</span>
          </h2>
          {post.comments.length === 0 && <p className={styles.muted}>아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>}
          {post.comments.map((c) => {
            const isWriter = c.authorLabel === '글쓴이'
            const number = c.authorLabel.match(/\d+/)?.[0]
            return (
              <div key={c.id} className={`${styles.comment} ${isWriter ? styles.commentWriter : ''}`}>
                <span className={`${styles.commentAvatar} ${isWriter ? styles.commentAvatarWriter : ''}`}>
                  {isWriter ? <Icon name="edit" size={14} /> : number}
                </span>
                <div className={styles.commentBody}>
                  <div className={styles.commentMeta}>
                    <strong>{c.mine ? `${c.authorLabel} (나)` : c.authorLabel}</strong>
                    {isWriter && <span className={styles.writerBadge}>작성자</span>}
                    <small>{timeAgo(c.createdAt)}</small>
                  </div>
                  <p>{c.content}</p>
                </div>
                <MoreMenu
                  small
                  open={menuFor === c.id}
                  onToggle={() => setMenuFor(menuFor === c.id ? null : c.id)}
                  mine={c.mine}
                  onReport={() => handleReport(c.id)}
                  onDelete={() => handleDelete(c.id)}
                />
              </div>
            )
          })}
        </section>

        <p className={styles.notice}>
          <Icon name="shield" size={14} /> 모든 글과 댓글은 익명이에요. 신고 처리를 위해서만 작성자 정보가 서버에 보관돼요.
        </p>
      </main>

      <form className={styles.commentDock} onSubmit={handleSend}>
        <input
          className={styles.commentInput}
          placeholder="따뜻한 이웃 간의 댓글을 남겨보세요"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
        />
        <button type="submit" className={styles.commentSend} disabled={!comment.trim() || sending}>
          등록
        </button>
      </form>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}

/** ⋯ 메뉴: 내 것이면 삭제, 남의 것이면 신고 */
function MoreMenu({ open, onToggle, mine, onReport, onDelete, small }) {
  return (
    <div className={styles.moreWrap}>
      <button type="button" aria-label="더보기" className={small ? styles.moreButtonSmall : styles.moreButton} onClick={onToggle}>
        <Icon name="more_horiz" size={small ? 18 : 22} />
      </button>
      {open && (
        <div className={styles.moreMenu}>
          {mine ? (
            <button type="button" onClick={onDelete}>
              <Icon name="delete" size={16} /> 삭제하기
            </button>
          ) : (
            <button type="button" onClick={onReport}>
              <Icon name="flag" size={16} /> 신고하기
            </button>
          )}
        </div>
      )}
    </div>
  )
}
