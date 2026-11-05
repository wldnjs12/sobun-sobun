import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { login, pathAfterLogin } from './accountApi.js'
import styles from './Account.module.css'

/**
 * 로그인 (/login). 아이디 + 비밀번호.
 * 다른 화면에서 "로그인이 필요해요"로 튕겨 왔으면 주소에 ?next=원래주소 가 붙어 있어서, 로그인 후 그 화면으로 돌아간다.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

  const errors = {
    loginId: loginId.trim() ? null : '아이디를 입력해 주세요',
    password: password ? null : '비밀번호를 입력해 주세요',
  }
  const hasError = Boolean(errors.loginId || errors.password)

  const handleSubmit = async (e) => {
    e.preventDefault() // form 기본 동작(페이지 새로고침)을 막는다
    setSubmitted(true)
    if (hasError || loading) return
    setLoading(true)
    setServerError(null)
    try {
      const me = await login({ loginId: loginId.trim().toLowerCase(), password })
      navigate(pathAfterLogin(next, me), { replace: true })
    } catch (err) {
      // 아이디가 없든 비밀번호가 틀리든 서버는 같은 문구를 준다 (어느 쪽이 틀렸는지 알려주지 않는 게 안전)
      setServerError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/')} aria-label="처음 화면으로">
          <Icon name="arrow_back" size={22} />
        </button>
        <span className={styles.brand}>
          <img src="/logo.svg" alt="" className={styles.logo} />
          소분소분
        </span>
      </header>

      <main className={styles.main}>
        <section>
          <h1 className={styles.title}>다시 오셨네요</h1>
          <p className={styles.subtitle}>아이디로 로그인하고 우리 동네 공동구매를 이어서 볼게요.</p>
        </section>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span className={styles.label}>아이디</span>
            <input
              className={`${styles.input} ${submitted && errors.loginId ? styles.inputError : ''}`}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              placeholder="아이디"
            />
            {submitted && errors.loginId && <p className={styles.fieldError}>{errors.loginId}</p>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>비밀번호</span>
            <input
              className={`${styles.input} ${submitted && errors.password ? styles.inputError : ''}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="비밀번호"
            />
            {submitted && errors.password && <p className={styles.fieldError}>{errors.password}</p>}
          </label>

          {serverError && (
            <p className={styles.serverError} role="alert">
              <Icon name="error" size={18} />
              {serverError}
            </p>
          )}

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            {loading ? <span className={styles.spinner} aria-label="로그인 중" /> : '로그인'}
          </button>
        </form>

        <p className={styles.switchRow}>
          아직 계정이 없나요?
          <Link to={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'} className={styles.switchLink}>
            회원가입
          </Link>
        </p>
      </main>
    </div>
  )
}
