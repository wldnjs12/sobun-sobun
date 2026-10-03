import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { CATEGORIES, createPost } from './communityApi.js'
import useCommunityEntry from './useCommunityEntry.js'
import EntryGate from './EntryGate.jsx'
import styles from './Community.module.css'

const PLACEHOLDER = {
  GROUP_BUY_SUGGESTION: '예) 생수 2L 24병 같이 나누실 분?\n6병 묶음 4팩이라 뜯지 않고 1팩씩 나누면 돼요.',
  SHARE: '예) 라면 5개 나눔해요\n1층 보관함에 둘게요!',
  QUESTION: '예) 근처에서 대용량 세제 싸게 사는 곳 있나요?',
  FREE: '이웃에게 하고 싶은 이야기를 적어주세요.',
}

/**
 * ⑤ 커뮤니티 글쓰기 (S18 — Stitch 디자인 없음, 같은 스타일로 구성).
 * API에는 제목 칸이 따로 없고 content 하나라서, "첫 줄이 제목처럼 보인다"고 안내한다.
 */
export default function CommunityWritePage() {
  const navigate = useNavigate()
  const entry = useCommunityEntry({ recheckOnEnter: false })
  const [category, setCategory] = useState(useLocation().state?.category ?? 'FREE')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (entry.status !== 'passed') {
    return (
      <div className={styles.page}>
        <PageHeader title="글쓰기" />
        <EntryGate status={entry.status} onRetry={entry.retry} />
        {entry.locationSheet}
      </div>
    )
  }

  const empty = !content.trim()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (empty) {
      setError('내용을 입력해주세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const post = await createPost({ category, content: content.trim() })
      navigate(`/community/posts/${post.id}`, { replace: true }) // replace: 뒤로가기로 글쓰기 화면에 안 돌아오게
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="글쓰기" />

      <form className={styles.writeMain} onSubmit={handleSubmit}>
        <div className={styles.segment} role="radiogroup" aria-label="카테고리">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={category === c.key}
              className={`${styles.segmentItem} ${category === c.key ? styles.segmentActive : ''}`}
              onClick={() => setCategory(c.key)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {category === 'GROUP_BUY_SUGGESTION' && (
          <p className={styles.writeHint}>
            <Icon name="bolt" size={16} /> 공구 제안 글에는 [이 품목으로 팟 열기] 버튼이 붙어요. 첫 줄에 품목 이름을 적어주세요.
          </p>
        )}

        <textarea
          className={styles.textarea}
          placeholder={PLACEHOLDER[category]}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            if (error) setError(null)
          }}
          maxLength={2000}
          autoFocus
        />
        <div className={styles.writeMeta}>
          <span>첫 줄이 제목처럼 보여요 · 익명으로 올라가요</span>
          <span>{content.length}/2000</span>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.writeDock}>
          <button type="submit" className={styles.primaryButton} disabled={submitting}>
            {submitting ? '올리는 중…' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
