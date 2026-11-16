import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Icon from '../../components/Icon.jsx'
import { BUILDING, fetchImpact } from '../pod/podApi.js'
import styles from './ImpactPage.module.css'

// 피칭에서 제시한 목표치. 실제 값이 목표에 얼마나 다가갔는지 막대로 보여준다.
const TARGETS = {
  successRate: 0.7, // 열린 팟의 70% 이상 성사
  paymentRate: 0.95, // 정산 확정 후 송금 신고 95%
  pickupRate: 0.95,
  avgFillMinutes: 24 * 60, // 하루 안에 모집 완료
}

const REFRESH_MS = 10_000

const pct = (v) => (v == null ? '–' : `${Math.round(v * 100)}`)
const won = (v) => (v == null ? '–' : v.toLocaleString())
function duration(min) {
  if (min == null) return { value: '–', unit: '' }
  if (min < 60) return { value: Math.round(min), unit: '분' }
  if (min < 60 * 24) return { value: (min / 60).toFixed(1), unit: '시간' }
  return { value: (min / 60 / 24).toFixed(1), unit: '일' }
}

/**
 * 임팩트 리포트 — 우리 건물에서 소분소분이 만든 변화를 숫자로 보여준다.
 * 숫자는 전부 서버(GET /api/pods/impact)가 실제 팟·참여·송금·수령 기록으로 계산한다. 10초마다 새로 받는다.
 */
export default function ImpactPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)

  const load = useCallback(() => {
    fetchImpact()
      .then((d) => {
        setData(d)
        setError(null)
        setUpdatedAt(new Date())
      })
      .catch(setError)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const fill = duration(data?.avgFillMinutes)

  return (
    <div className={styles.page}>
      <AppHeader buildingName={BUILDING.name} />
      <main className={styles.main}>
        <section className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>
              <span className={styles.liveDot} />
              실시간 집계 · {updatedAt ? updatedAt.toTimeString().slice(0, 8) : '불러오는 중'}
            </span>
            <h1 className={styles.title}>임팩트 리포트</h1>
            <p className={styles.subtitle}>
              {BUILDING.name}에서 소분소분이 만든 변화. 모든 숫자는 실제 팟·송금·수령 기록에서 서버가 계산해요.
            </p>
          </div>
          <button type="button" className={styles.ghostButton} onClick={load}>
            <Icon name="refresh" size={16} />
            새로고침
          </button>
        </section>

        {error && (
          <div className={styles.error} role="alert">
            리포트를 불러오지 못했어요. ({error.message})
          </div>
        )}

        {/* ── 핵심 4지표 ── */}
        <section className={styles.hero}>
          <Metric label="절약한 금액" value={won(data?.moneySaved)} unit="원" hint="혼자 샀을 때 가격 − 1인 정산액" />
          <Metric
            label="남지 않은 묶음"
            value={data ? data.surplusUnitsAvoided.toLocaleString() : '–'}
            unit="개"
            hint="각자 묶음을 통째로 샀다면 남았을 양"
          />
          <Metric label="성사율" value={pct(data?.successRate)} unit="%" hint="마감 ÷ (마감 + 취소)" />
          <Metric label="평균 모집 시간" value={fill.value} unit={fill.unit} hint="대표 개설 → 마지막 참여" />
        </section>

        <div className={styles.grid}>
          {/* ── 퍼널 ── */}
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>거래 퍼널</h2>
              <span className={styles.cardMeta}>열림 → 성사 → 송금 → 수령</span>
            </header>
            <Funnel data={data} />
          </section>

          {/* ── 목표 대비 ── */}
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>목표 대비</h2>
              <span className={styles.cardMeta}>피칭에서 제시한 KPI</span>
            </header>
            <div className={styles.targets}>
              <Target label="성사율" value={data?.successRate} target={TARGETS.successRate} format={(v) => `${pct(v)}%`} />
              <Target label="송금 완료율" value={data?.paymentRate} target={TARGETS.paymentRate} format={(v) => `${pct(v)}%`} />
              <Target label="수령 완료율" value={data?.pickupRate} target={TARGETS.pickupRate} format={(v) => `${pct(v)}%`} />
              <Target
                label="모집 시간"
                value={data?.avgFillMinutes == null ? null : Math.min(1, TARGETS.avgFillMinutes / Math.max(1, data.avgFillMinutes))}
                target={1}
                format={() => `${fill.value}${fill.unit} / 24시간`}
              />
            </div>
          </section>
        </div>

        {/* ── 원장 ── */}
        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>건물 원장</h2>
            <span className={styles.cardMeta}>누적</span>
          </header>
          <dl className={styles.ledger}>
            <Row k="열린 팟" v={data?.totalPods} unit="개" />
            <Row k="모집 중" v={data?.openPods} unit="개" />
            <Row k="성사(마감)" v={data?.closedPods} unit="개" />
            <Row k="모집 취소" v={data?.cancelledPods} unit="개" />
            <Row k="참여 연인원" v={data?.neighborsJoined} unit="명" />
            <Row k="미개봉으로 나눈 수량" v={data?.unitsShared} unit="개" />
            <Row k="거래액(수고비 포함)" v={data?.transactedAmount} unit="원" />
            <Row k="플랫폼이 보관한 돈" v={0} unit="원" note="송금은 이웃 → 대표 직접" />
          </dl>
        </section>

        <p className={styles.method}>
          <Icon name="info" size={14} />
          계산식은 서버의 <code>PodImpactCalculator</code>에 있고 단위 테스트(<code>PodImpactCalculatorTest</code>)로 검증해요. 같은
          건물 기록만 집계해요(건물 단위 격리).
        </p>

        <button type="button" className={styles.cta} onClick={() => navigate('/pods/new')}>
          <Icon name="add" size={16} />이 숫자를 늘리러 가기 — 새 공동구매 열기
        </button>
      </main>
      <BottomNav />
    </div>
  )
}

function Metric({ label, value, unit, hint }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>
        <span className="num">{value}</span>
        <small>{unit}</small>
      </span>
      <span className={styles.metricHint}>{hint}</span>
    </div>
  )
}

function Funnel({ data }) {
  const steps = [
    { label: '열린 팟', value: data?.totalPods ?? 0 },
    { label: '성사된 팟', value: data?.closedPods ?? 0 },
    { label: '송금 완료율', value: data?.paymentRate, ratio: true },
    { label: '수령 완료율', value: data?.pickupRate, ratio: true },
  ]
  const base = Math.max(1, data?.totalPods ?? 1)
  return (
    <ol className={styles.funnel}>
      {steps.map((s) => {
        // 비율 단계는 "성사된 팟 중 몇 %"라서 성사 막대 길이에 곱해 퍼널 모양을 유지한다
        const width = s.ratio ? ((s.value ?? 0) * (data?.closedPods ?? 0)) / base : (s.value ?? 0) / base
        return (
          <li key={s.label} className={styles.funnelRow}>
            <span className={styles.funnelLabel}>{s.label}</span>
            <span className={styles.funnelTrack}>
              <span className={styles.funnelBar} style={{ width: `${Math.max(2, width * 100)}%` }} />
            </span>
            <span className={`${styles.funnelValue} num`}>{s.ratio ? `${pct(s.value)}%` : s.value}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Target({ label, value, target, format }) {
  const progress = value == null ? 0 : Math.min(1, value / target)
  const met = value != null && value >= target
  return (
    <div className={styles.target}>
      <div className={styles.targetHead}>
        <span>{label}</span>
        <span className={`${styles.targetValue} num`}>
          {value == null ? '–' : format(value)}
          {met && <Icon name="check" size={14} className={styles.met} />}
        </span>
      </div>
      <div className={styles.targetTrack}>
        <span className={styles.targetBar} style={{ width: `${progress * 100}%` }} />
        <span className={styles.targetMark} />
      </div>
    </div>
  )
}

function Row({ k, v, unit, note }) {
  return (
    <div className={styles.row}>
      <dt>
        {k}
        {note && <span className={styles.rowNote}>{note}</span>}
      </dt>
      <dd>
        <span className="num">{v == null ? '–' : v.toLocaleString()}</span>
        <small>{unit}</small>
      </dd>
    </div>
  )
}
