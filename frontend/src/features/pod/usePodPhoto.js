import { useEffect, useState } from 'react'
import { cachedPodPhoto, fetchPodPhoto, podImage } from './podApi.js'

/**
 * 팟에 보여줄 사진 주소. 화면(PodCard·상세·내 팟)은 이 훅 하나만 쓰면 된다.
 *
 * 1) 대표가 올린 사진이 있으면(pod.imageVersion) 서버에서 받아온 사진만 보여준다.
 *    한 번 받은 사진은 브라우저 저장소에 있어서 첫 화면부터 바로 보인다(cachedPodPhoto).
 *    처음 보는 사진만 받아오는 동안 null(화면이 카테고리 아이콘을 그림) — 예시 사진을 잠깐 보여줬다가
 *    바꾸면 옛 사진이 번쩍여서, 올린 사진이 있으면 예시 사진은 쓰지 않는다.
 * 2) 올린 사진이 없거나 받아오기에 실패했을 때만 제목·카테고리로 고른 예시 사진 (podImage)
 * 3) 예시 사진도 없으면 null → 화면이 카테고리 아이콘을 그린다
 */
export default function usePodPhoto(pod) {
  const podId = pod?.id
  const version = pod?.imageVersion
  const hasUpload = podId != null && version != null
  const key = hasUpload ? `${podId}:${version}` : null
  // 받아온 사진은 어느 팟 것인지(key)와 함께 기억 → 다른 팟으로 바뀐 직후에 옛 사진이 섞이지 않는다
  const [fetched, setFetched] = useState({ key: null, url: null, failed: false })

  // 저장소에 있으면 첫 렌더부터 바로 그 사진
  const stored = hasUpload ? cachedPodPhoto(podId, version) : null

  useEffect(() => {
    if (!hasUpload || stored) return undefined // 저장소에 있으면 다시 받지 않는다
    let ignore = false // 응답이 오기 전에 다른 팟으로 바뀌면 옛 사진을 넣지 않도록
    fetchPodPhoto(podId, version)
      .then((url) => !ignore && setFetched({ key, url, failed: false }))
      .catch(() => !ignore && setFetched({ key, url: null, failed: true })) // 실패하면 예시 사진으로
    return () => {
      ignore = true
    }
  }, [hasUpload, stored, podId, version, key])

  if (!hasUpload) return podImage(pod)
  if (stored) return stored
  if (fetched.key === key) return fetched.failed ? podImage(pod) : fetched.url
  return null
}
