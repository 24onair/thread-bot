'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

type ScheduleRecord = {
  id: string
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

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [message, setMessage] = useState('예약 목록을 불러오는 중...')

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select(
        'id, scheduled_at, status, updated_at, post:posts(id, hook, body, closing_line, hashtags)',
      )
      .order('scheduled_at', { ascending: true })

    if (error) {
      setMessage(`예약 목록 불러오기 실패: ${error.message}`)
      return
    }

    const scheduleList = (data as ScheduleRecord[]) ?? []
    setSchedules(scheduleList)
    setSelectedScheduleId((current) => current || scheduleList[0]?.id || '')
    setMessage(
      scheduleList.length === 0
        ? '저장된 예약이 아직 없습니다.'
        : '예약 목록을 불러왔습니다.',
    )
  }

  useEffect(() => {
    let isCancelled = false

    const loadInitialSchedules = async () => {
      if (isCancelled) return
      await fetchSchedules()
    }

    void loadInitialSchedules()

    return () => {
      isCancelled = true
    }
  }, [])

  const selectedSchedule =
    schedules.find((schedule) => schedule.id === selectedScheduleId) ?? null

  const isPosted = selectedSchedule?.status === 'posted'

  const handleCopyPost = async () => {
    const post = selectedSchedule?.post

    if (!post) {
      setMessage('복사할 포스트가 없습니다.')
      return
    }

    const textToCopy = [post.hook, '', post.body, '', post.closing_line || '', '', post.hashtags || '']
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(textToCopy)
      setMessage('예약 포스트를 클립보드에 복사했습니다.')
    } catch {
      setMessage('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  const handleMarkAsPosted = async () => {
    if (!selectedSchedule) {
      setMessage('먼저 예약 포스트를 선택해 주세요.')
      return
    }

    const { error } = await supabase
      .from('schedules')
      .update({
        status: 'posted',
        result_message: 'posted manually',
      })
      .eq('id', selectedSchedule.id)

    if (error) {
      setMessage(`상태 변경 실패: ${error.message}`)
      return
    }

    setMessage('상태를 posted로 변경했습니다. 변경 시각이 포스팅 시간으로 기록되었습니다.')
    await fetchSchedules()
    setSelectedScheduleId(selectedSchedule.id)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#ffffff_40%,_#fff7ed)] px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-orange-500 uppercase">
                Schedule Center
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                예약 목록
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                예약된 포스트를 선택하면 전체 내용을 보고 바로 복사할 수 있습니다.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              메인으로 돌아가기
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-semibold text-slate-950">예약 리스트</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>

            <div className="mt-6 grid gap-4">
              {schedules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  아직 예약된 포스트가 없습니다.
                </div>
              ) : (
                schedules.map((schedule) => (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => setSelectedScheduleId(schedule.id)}
                    className={`rounded-3xl border p-5 text-left transition ${
                      selectedScheduleId === schedule.id
                        ? schedule.status === 'posted'
                          ? 'border-emerald-300 bg-emerald-100'
                          : 'border-orange-300 bg-orange-50'
                        : schedule.status === 'posted'
                          ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-950">
                      {schedule.post?.hook || '연결된 글 없음'}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      예약 시간: {new Date(schedule.scheduled_at).toLocaleString('ko-KR')}
                    </p>
                    <p
                      className={`mt-1 text-sm ${
                        schedule.status === 'posted'
                          ? 'text-emerald-700'
                          : 'text-orange-700'
                      }`}
                    >
                      상태: {schedule.status}
                    </p>
                    {schedule.status === 'posted' && (
                      <p className="mt-1 text-sm text-emerald-700">
                        포스팅 시간: {new Date(schedule.updated_at).toLocaleString('ko-KR')}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-semibold text-slate-950">예약 포스트 상세</h2>

            {!selectedSchedule || !selectedSchedule.post ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                왼쪽 예약 리스트에서 포스트를 선택하면 전체 내용이 여기에 표시됩니다.
              </div>
            ) : (
              <div
                className={`mt-6 rounded-3xl border p-6 ${
                  isPosted ? 'border-emerald-200 bg-white/80' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <p className="text-xs font-semibold tracking-[0.2em] text-orange-500 uppercase">
                  Hook
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-950">
                  {selectedSchedule.post.hook}
                </p>

                <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-orange-500 uppercase">
                  Body
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {selectedSchedule.post.body}
                </p>

                <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-orange-500 uppercase">
                  Closing
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {selectedSchedule.post.closing_line || '없음'}
                </p>

                <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-orange-500 uppercase">
                  Hashtags
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {selectedSchedule.post.hashtags || '없음'}
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleCopyPost}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    전체 내용 복사하기
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkAsPosted}
                    disabled={isPosted}
                    className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition ${
                      isPosted
                        ? 'cursor-not-allowed bg-emerald-200 text-emerald-900'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {isPosted ? '포스팅 완료됨' : '포스팅 완료 처리'}
                  </button>
                  <p className="text-sm text-slate-600">
                    예약 시간: {new Date(selectedSchedule.scheduled_at).toLocaleString('ko-KR')}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm leading-6 text-slate-700 ring-1 ring-black/5">
                  <p>
                    <strong>현재 상태:</strong> {selectedSchedule.status}
                  </p>
                  <p>
                    <strong>포스팅 시간:</strong>{' '}
                    {selectedSchedule.status === 'posted'
                      ? new Date(selectedSchedule.updated_at).toLocaleString('ko-KR')
                      : '아직 포스팅 전'}
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
