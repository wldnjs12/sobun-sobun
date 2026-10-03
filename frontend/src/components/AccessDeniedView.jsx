import { Link } from 'react-router-dom'
import PageHeader from './PageHeader.jsx'
import Icon from './Icon.jsx'
import { BUILDING } from '../features/pod/podApi.js'
import styles from './AccessDeniedView.module.css'

/**
 * 다른 건물의 팟·정산·커뮤니티 글에 들어왔을 때 보여주는 화면 (서버 403 BUILDING_ACCESS_DENIED).
 * 예: 다른 건물 이웃이 공유한 팟 링크를 그대로 열었을 때.
 *
 * 사용법 (어느 화면이든):
 *   import { isBuildingAccessDenied } from '../../api/client.js'
 *   if (isBuildingAccessDenied(error)) return <AccessDeniedView pageTitle="팟 상세" what="팟" />
 */
export default function AccessDeniedView({ pageTitle = '접근 제한', what = '팟' }) {
  return (
    <div className={styles.page}>
      <PageHeader title={pageTitle} />
      <main className={styles.main}>
        <span className={styles.icon}>
          <Icon name="domain_disabled" size={36} />
        </span>
        <h1 className={styles.title}>다른 건물의 {what}이에요</h1>
        <p className={styles.body}>
          소분소분은 <strong>같은 건물 이웃끼리만</strong> 공동구매해요.
          <br />
          다른 건물의 {what}은 보거나 참여할 수 없어요.
        </p>

        <div className={styles.myBuilding}>
          <Icon name="home" size={18} />
          내 건물 · <strong>{BUILDING.name}</strong>
        </div>

        <Link to="/home" className={styles.primaryButton}>
          <Icon name="shopping_basket" size={20} />
          우리 건물 팟 보러 가기
        </Link>
        <Link to="/onboarding/address" className={styles.textLink}>
          이사했나요? 건물 다시 등록하기
        </Link>
      </main>
    </div>
  )
}
