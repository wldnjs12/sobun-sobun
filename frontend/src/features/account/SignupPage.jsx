import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { pathAfterLogin, signup, validateSignup } from './accountApi.js'
import styles from './Account.module.css'

const FIELDS = [
  { name: 'loginId', label: '아이디', hint: '영문 소문자·숫자 4~20자', autoComplete: 'username', type: 'text' },
  { name: 'password', label: '비밀번호', hint: '8자 이상', autoComplete: 'new-password', type: 'password' },
  { name: 'passwordConfirm', label: '비밀번호 확인', autoComplete: 'new-password', type: 'password' },
  { name: 'nickname', label: '닉네임', hint: '2~10자', autoComplete: 'nickname', type: 'text' },
]

/**
 * 회원가입 (/signup). 가입하면 바로 로그인 상태가 되고, 이어서 주소(건물) 등록으로 넘어간다.
 * 검증은 화면에서 한 번(빠른 안내), 서버에서 한 번 더(진짜 판정) 한다 — 화면 검증은 우회될 수 있어서.
 */
export default function SignupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')

  const [values, setValues] = useState({ loginId: '', password: '', passwordConfirm: '', nickname: '' })
  // touched: 한 번이라도 건드린 칸만 에러를 보여준다 (처음부터 빨간 글씨가 가득하면 부담스러워서)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [duplicateId, setDuplicateId] = useState(null) // 서버가 "이미 사용 중"이라고 한 아이디

  const errors = validateSignup(values)
  if (!errors.loginId && duplicateId && values.loginId === duplicateId) errors.loginId = '이미 사용 중인 아이디예요'
  const showError = (name) => (submitted || touched[name]) && errors[name]

  const handleChange = (name) => (e) => {
    // 아이디는 소문자만 허용하므로 입력하는 순간 소문자로 바꿔준다 (대문자를 쳤다고 에러 내는 것보다 친절)
    const value = name === 'loginId' ? e.target.value.toLowerCase().replace(/\s/g, '') : e.target.value
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0 || loading) return
    setLoading(true)
    setServerError(null)
    try {
      const me = await signup({ loginId: values.loginId, password: values.password, nickname: values.nickname.trim() })
      navigate(pathAfterLogin(next, me), { replace: true })
    } catch (err) {
      if (err.code === 'DUPLICATE_LOGIN_ID') setDuplicateId(values.loginId)
      else setServerError(err.message)
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
          <h1 className={styles.title}>계정 만들기</h1>
          <p className={styles.subtitle}>가입하고 우리 동네 이웃과 생활용품을 나눠 사요.</p>
        </section>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {FIELDS.map((field) => (
            <label key={field.name} className={styles.field}>
              <span className={styles.label}>{field.label}</span>
              <input
                className={`${styles.input} ${showError(field.name) ? styles.inputError : ''}`}
                type={field.type}
                value={values[field.name]}
                onChange={handleChange(field.name)}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.name]: true }))}
                autoComplete={field.autoComplete}
                autoCapitalize="none"
                maxLength={field.name === 'nickname' ? 10 : field.name === 'loginId' ? 20 : 64}
                aria-invalid={Boolean(showError(field.name))}
              />
              {showError(field.name) ? (
                <p className={styles.fieldError}>{errors[field.name]}</p>
              ) : (
                field.hint && <p className={styles.hint}>{field.hint}</p>
              )}
            </label>
          ))}

          <div className={styles.notice}>
            <Icon name="lock" size={18} />
            <span>비밀번호는 암호화해서 저장해요. 이웃에게는 내 주소 대신 동네 이름만 보여요.</span>
          </div>

          {serverError && (
            <p className={styles.serverError} role="alert">
              <Icon name="error" size={18} />
              {serverError}
            </p>
          )}

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            {loading ? <span className={styles.spinner} aria-label="가입 중" /> : '가입하고 시작하기'}
          </button>
        </form>

        <p className={styles.switchRow}>
          이미 계정이 있나요?
          <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className={styles.switchLink}>
            로그인
          </Link>
        </p>
      </main>
    </div>
  )
}
