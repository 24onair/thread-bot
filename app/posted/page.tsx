'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

type ScheduleRecord = {
  id: string
  post_id: string
  scheduled_at: string
  status: string
  updated_at: string
}

type PostedRecord = {
  id: string
  post_id: string
  scheduled_at: string
  status: string
  updated_at: string
  post: {
    id: string
    hook: string
    body: string
    closing_line: string | null
    hashtags: string | null
  } | null
}

export default function PostedPage() {
  const [postedSchedules, setPostedSchedules] = useState<PostedRecord[]>([])
  const [selectedPostedId, setSelectedPostedId] = useState('')
  const [message, setMessage] = useState('포스팅된 목록을 불러오는 중...')
  const [copiedPostedId, setCopiedPostedId] = useState('')

  const fetchPostedSchedules = async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select('id, post_id, scheduled_at, status, updated_at')
      .eq('status', 'posted')
      .order('updated_at', { ascending: false })

    if (error) {
      setMessage(`포스팅 목록 불러오기 실패: ${error.message}`)
      return
    }

    const rawSchedules = (data as ScheduleRecord[]) ?? []
    const postIds = Array.from(
      new Set(rawSchedules.map((schedule) => schedule.post_id).filter(Boolean)),
    )

    let postMap = new Map<
      string,
      {
        id: string
        hook: string
        body: string
        closing_line: string | null
        hashtags: string | null
      }
    >()

    if (postIds.length > 0) {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('id, hook, body, closing_line, hashtags')
        .in('id', postIds)

      if (postError) {
        setMessage(`포스트 불러오기 실패: ${postError.message}`)
        return
      }

      postMap = new Map(
        (postData ?? []).map((post) => [
          post.id,
          {
            id: post.id,
            hook: post.hook,
            body: post.body,
            closing_line: post.closing_line,
            hashtags: post.hashtags,
          },
        ]),
      )
    }

    const postedList: PostedRecord[] = rawSchedules.map((schedule) => ({
      id: schedule.id,
      post_id: schedule.post_id,
      scheduled_at: schedule.scheduled_at,
      status: schedule.status,
      updated_at: schedule.updated_at,
      post: postMap.get(schedule.post_id) ?? null,
    }))

    setPostedSchedules(postedList)
    setSelectedPostedId((current) => current || postedList[0]?.id || '')
    setMessage(
      postedList.length === 0
        ? '아직 포스팅 완료된 글이 없습니다.'
        : '포스팅 완료된 글 목록을 불러왔습니다.',
    )
  }

  useEffect(() => {
    let isCancelled = false

    const loadInitialPostedSchedules = async () => {
      if (isCancelled) return
      await fetchPostedSchedules()
    }

    void loadInitialPostedSchedules()

    return () => {
      isCancelled = true
    }
  }, [])

  const selectedPosted =
    postedSchedules.find((schedule) => schedule.id === selectedPostedId) ?? null

  const handleCopyPost = async () => {
    const post = selectedPosted?.post

    if (!post) {
      setMessage('복사할 포스트가 없습니다.')
      return
    }

    const textToCopy = [post.hook, '', post.body, '', post.closing_line || '', '', post.hashtags || '']
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(textToCopy)
      if (selectedPosted) {
        setCopiedPostedId(selectedPosted.id)
        window.setTimeout(() => {
          setCopiedPostedId((current) =>
            current === selectedPosted.id ? '' : current,
          )
        }, 1500)
      }
      setMessage('포스팅된 글을 클립보드에 복사했습니다.')
    } catch {
      setMessage('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dcfce7,_#f0fdf4_40%,_#ffffff)] px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <nav className="sticky top-4 z-10 flex items-center justify-between rounded-full border border-slate-200 bg-white/90 px-5 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <Link href="/" className="text-sm font-semibold text-slate-950">
            Threads Writer
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              홈
            </Link>
            <Link
              href="/schedules"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              예약 목록 보기
            </Link>
            <Link
              href="/posted"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              포스팅 완료 보기
            </Link>
          </div>
        </nav>

        <section className="rounded-[32px] border border-emerald-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-emerald-600 uppercase">
                Posted Center
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                포스팅 완료 목록
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                포스팅 완료된 글만 따로 확인하고, 전체 내용을 다시 복사할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[32px] border border-emerald-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-semibold text-slate-950">포스팅 완료 리스트</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>

            <div className="mt-6 grid gap-4">
              {postedSchedules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-sm text-slate-500">
                  아직 포스팅 완료된 글이 없습니다.
                </div>
              ) : (
                postedSchedules.map((schedule) => (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => setSelectedPostedId(schedule.id)}
                    className={`rounded-3xl border p-5 text-left transition ${
                      selectedPostedId === schedule.id
                        ? 'border-emerald-300 bg-emerald-100'
                        : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-950">
                      {schedule.post?.hook || '연결된 글 없음'}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      예약 시간: {new Date(schedule.scheduled_at).toLocaleString('ko-KR')}
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      포스팅 시간: {new Date(schedule.updated_at).toLocaleString('ko-KR')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-emerald-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-semibold text-slate-950">포스팅 완료 상세</h2>

            {!selectedPosted || !selectedPosted.post ? (
              <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-sm text-slate-500">
                왼쪽 리스트에서 포스팅 완료된 글을 선택하면 전체 내용이 여기에 표시됩니다.
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="text-xs font-semibold tracking-[0.2em] text-emerald-600 uppercase">
                  Hook
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-950">
                  {selectedPosted.post.hook}
                </p>

                <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-emerald-600 uppercase">
                  Body
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {selectedPosted.post.body}
                </p>

                <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-emerald-600 uppercase">
                  Closing
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {selectedPosted.post.closing_line || '없음'}
                </p>

                <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-emerald-600 uppercase">
                  Hashtags
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {selectedPosted.post.hashtags || '없음'}
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleCopyPost}
                    className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition active:scale-[0.98] ${
                      copiedPostedId === selectedPosted.id
                        ? 'bg-emerald-700 hover:bg-emerald-700'
                        : 'bg-slate-950 hover:bg-slate-800'
                    }`}
                  >
                    {copiedPostedId === selectedPosted.id
                      ? '복사 완료'
                      : '전체 내용 복사하기'}
                  </button>
                  <p className="text-sm text-slate-600">
                    포스팅 시간: {new Date(selectedPosted.updated_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
