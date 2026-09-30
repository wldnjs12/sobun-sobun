// import { api } from '../../api/client.js'

/**
 * 건물 홈(S4)에서 쓰는 팟 목록 조회.
 *
 * 아직 백엔드에 목록 API가 없어서(docs/API_SPEC.md 참고) 임시 데이터를 돌려준다.
 * 백엔드에 GET /api/pods?buildingId= 가 생기면 아래 한 줄만 바꾸면 화면은 그대로 동작한다:
 *   return api.get(`/pods?buildingId=${buildingId}`)
 *
 * 필드 설명 — ERD(POD 테이블)에 있는 것:
 *   id, title, totalAmount, targetParticipantCount, participantCount, commissionRate, deadline, closed
 * 화면 표시용으로 임시 추가한 것 (백엔드와 협의 필요):
 *   category, imageUrl, unitLabel, pickupSpot, originalPrice(혼자 살 때 1인분 가격), participantUnits(참여자 호수)
 */
export async function fetchBuildingPods(buildingId) {
  return createMockPods()
}

const HOUR = 60 * 60 * 1000

function createMockPods() {
  const now = Date.now()
  return [
    {
      id: 1,
      title: '코스트코 냉동 블루베리 2kg',
      category: 'fresh',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDK4cUIlrPCWefEDkLZnAiPu-2Blgd_HULbKJvDPgu7I1Zp6Hm2zuMpnyaLUm5IHG_KHWZdv-S-6K8zUvRhF5QDpIG8CYtTeD9fQ_6OdcbX_lvkCRDDEs4pZO3vqp2nAAMNhpOfIrh5VWcB5o7lVpihlKp_pyNEycZwqhmYu2MkFx2pBCEsq0YzvMWXw6-r-PAbFDOOdnHJWRziZZqUYLiHPqww1BEPFcBPrkm8iQAJV-Jo5k__fKl2',
      unitLabel: '1/4 팩',
      pickupSpot: '1층 무인락커',
      totalAmount: 32380,
      commissionRate: 0.05,
      targetParticipantCount: 5,
      participantCount: 3,
      participantUnits: ['302', '514', '201'],
      originalPrice: 10000,
      deadline: new Date(now + 2 * HOUR + 14 * 60 * 1000).toISOString(),
      closed: false,
    },
    {
      id: 2,
      title: '커클랜드 3겹 롤화장지 30롤',
      category: 'household',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBDZvEKii9eQRsXBNVF_FlqTjoEOxzO7laL2zhtRVmEcB6qwpi8aa4ABKCYhRYOhYgDhoXn87ihlxi1XPKB2Y7VQVy2ePuML5tubi_9vIsOq8EFdPfBNSJgU3RwCpuscftjNLhiD1dTU-ckwKCiPpaGBXIXJTUxCVIeJnQ1IMWIziosodWfDo5AQRS1JsfVhqLNFjxK_-bd5hX6wfNavXr_Oc-ig3JHTTKmHhxjMbUYGL5liHr3CtNU',
      unitLabel: '5롤 묶음',
      pickupSpot: '1층 무인락커',
      totalAmount: 25714,
      commissionRate: 0.05,
      targetParticipantCount: 6,
      participantCount: 4,
      participantUnits: ['108', '404', '702', '611'],
      originalPrice: 8200,
      deadline: new Date(now + 5 * HOUR + 20 * 60 * 1000).toISOString(),
      closed: false,
    },
    {
      id: 3,
      title: '하림 닭가슴살 오리지널 20팩',
      category: 'processed',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBr-AFyFj86ctMLqQ2Dm01vmBiImqIQYH11hLEbsmO4PajT0qoR8FiY2WWC9xQDnu83Fb4l9IgPxprX0claW2F3u7ewK2YMEQQwAkMTZrv930pp9j1mSnXcjVTn7vxVGTTZDHzG8NNAjhRf1h304nWIkZlL7NWczvaKY45FN0WtvMp3HlD-hnyIrCUZ9ng9cj29uxzLstmIigvgme93xVIwRoT_Lm_nP00YFCSuZqFsEDAKc6RBgrHV',
      unitLabel: '5팩 묶음',
      pickupSpot: '1층 무인락커',
      totalAmount: 27428,
      commissionRate: 0.05,
      targetParticipantCount: 4,
      participantCount: 3,
      participantUnits: ['803', '112', '309'],
      originalPrice: 10000,
      deadline: new Date(now + 8 * HOUR + 45 * 60 * 1000).toISOString(),
      closed: false,
    },
  ]
}
