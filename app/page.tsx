'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

type Account = {
  id: string
  account_name: string
  brand_description: string | null
  category: string
  target_customer: string | null
  tone: string | null
  cta_style: string | null
}

type Topic = {
  id: string
  title: string
  description: string | null
  reason: string | null
  created_at: string
}

type Post = {
  id: string
  hook: string
  body: string
  closing_line: string | null
  hashtags: string | null
  created_at: string
}

export default function Home() {
  const [accountName, setAccountName] = useState('')
  const [brandDescription, setBrandDescription] = useState('')
  const [category, setCategory] = useState('')
  const [targetCustomer, setTargetCustomer] = useState('')
  const [tone, setTone] = useState('친근함')
  const [ctaStyle, setCtaStyle] = useState('댓글 유도')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [accountLoadMessage, setAccountLoadMessage] = useState('계정 목록을 불러오는 중...')
  const [topicMessage, setTopicMessage] = useState('')
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [topicKeyword, setTopicKeyword] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [postMessage, setPostMessage] = useState('')
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [scheduleMessage, setScheduleMessage] = useState('')
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [copiedPostId, setCopiedPostId] = useState('')
  const [scheduledPostId, setScheduledPostId] = useState('')

  useEffect(() => {
    let isCancelled = false

    const fetchAccounts = async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select(
          'id, account_name, brand_description, category, target_customer, tone, cta_style',
        )
        .order('created_at', { ascending: false })

      if (isCancelled) return

      if (error) {
        setAccountLoadMessage(`계정 불러오기 실패: ${error.message}`)
        return
      }

      const accountList = data ?? []
      setAccounts(accountList)

      if (accountList.length === 0) {
        setSelectedAccountId('')
        setTopics([])
        setSelectedTopicId('')
        setPosts([])
        setSelectedPostId('')
        setAccountLoadMessage('저장된 계정이 아직 없습니다. 먼저 계정을 저장해 주세요.')
        return
      }

      setSelectedAccountId((current) => current || accountList[0].id)
      setAccountLoadMessage('저장된 계정을 불러왔습니다.')
    }

    void fetchAccounts()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedAccountId) {
      return
    }

    let isCancelled = false

    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, title, description, reason, created_at')
        .eq('account_id', selectedAccountId)
        .order('created_at', { ascending: false })
        .limit(6)

      if (isCancelled) return

      if (error) {
        setTopicMessage(`주제 불러오기 실패: ${error.message}`)
        return
      }

      const topicList = data ?? []
      setTopics(topicList)
      setSelectedTopicId((current) => {
        const hasCurrent = topicList.some((topic) => topic.id === current)
        if (hasCurrent) return current
        return topicList[0]?.id ?? ''
      })
    }

    void fetchTopics()

    return () => {
      isCancelled = true
    }
  }, [selectedAccountId])

  useEffect(() => {
    if (!selectedTopicId) {
      return
    }

    let isCancelled = false

    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, hook, body, closing_line, hashtags, created_at')
        .eq('topic_id', selectedTopicId)
        .order('created_at', { ascending: false })
        .limit(6)

      if (isCancelled) return

      if (error) {
        setPostMessage(`글 불러오기 실패: ${error.message}`)
        return
      }

      const postList = data ?? []
      setPosts(postList)
      setSelectedPostId((current) => {
        const hasCurrent = postList.some((post) => post.id === current)
        if (hasCurrent) return current
        return postList[0]?.id ?? ''
      })
    }

    void fetchPosts()

    return () => {
      isCancelled = true
    }
  }, [selectedTopicId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setMessage('저장 중...')

    const { error } = await supabase.from('accounts').insert({
      account_name: accountName,
      brand_description: brandDescription,
      category,
      target_customer: targetCustomer,
      tone,
      cta_style: ctaStyle,
    })

    if (error) {
      setMessage(`저장 실패: ${error.message}`)
      setIsSaving(false)
      return
    }

    setMessage('계정 정보가 저장되었습니다.')
    setAccountName('')
    setBrandDescription('')
    setCategory('')
    setTargetCustomer('')
    setTone('친근함')
    setCtaStyle('댓글 유도')
    setIsSaving(false)
    const { data } = await supabase
      .from('accounts')
      .select(
        'id, account_name, brand_description, category, target_customer, tone, cta_style',
      )
      .order('created_at', { ascending: false })

    const accountList = data ?? []
    setAccounts(accountList)
    setSelectedAccountId((current) => current || accountList[0]?.id || '')
    setAccountLoadMessage('저장된 계정을 불러왔습니다.')
  }

  const handleGenerateTopics = async () => {
    if (!selectedAccountId) {
      setTopicMessage('먼저 계정을 하나 선택해 주세요.')
      return
    }

    const selectedAccount = accounts.find((account) => account.id === selectedAccountId)

    if (!selectedAccount) {
      setTopicMessage('선택한 계정 정보를 찾지 못했습니다.')
      return
    }

    setIsGeneratingTopics(true)
    setTopicMessage('OpenAI로 새로운 주제 3개를 만드는 중...')

    const priorityKeywords = topicKeyword
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)

    const generateResponse = await fetch('/api/generate-topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: selectedAccount,
        existingTitles: topics.map((topic) => topic.title),
        priorityKeywords,
      }),
    })

    const generateResult = await generateResponse.json()

    if (!generateResponse.ok) {
      setTopicMessage(generateResult.error || 'OpenAI 주제 생성에 실패했습니다.')
      setIsGeneratingTopics(false)
      return
    }

    const topicDrafts = generateResult.topics.map(
      (topic: { title: string; description: string; reason: string }) => ({
        account_id: selectedAccount.id,
        title: topic.title,
        description: topic.description,
        reason: topic.reason,
        status: 'recommended',
      }),
    )

    const { error } = await supabase.from('topics').insert(topicDrafts)

    if (error) {
      setTopicMessage(`주제 생성 실패: ${error.message}`)
      setIsGeneratingTopics(false)
      return
    }

    setTopicMessage('주제 3개를 저장했습니다.')
    setIsGeneratingTopics(false)
    const { data } = await supabase
      .from('topics')
      .select('id, title, description, reason, created_at')
      .eq('account_id', selectedAccountId)
      .order('created_at', { ascending: false })
      .limit(6)

    const topicList = data ?? []
    setTopics(topicList)
    setSelectedTopicId((current) => current || topicList[0]?.id || '')
  }

  const handleGeneratePosts = async () => {
    if (!selectedAccountId) {
      setPostMessage('먼저 계정을 선택해 주세요.')
      return
    }

    if (!selectedTopicId) {
      setPostMessage('먼저 주제를 하나 선택해 주세요.')
      return
    }

    const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
    const selectedTopic = topics.find((topic) => topic.id === selectedTopicId)

    if (!selectedAccount || !selectedTopic) {
      setPostMessage('선택한 계정 또는 주제 정보를 찾지 못했습니다.')
      return
    }

    setIsGeneratingPosts(true)
    setPostMessage('OpenAI로 글 초안 3개를 만드는 중...')

    const generateResponse = await fetch('/api/generate-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: selectedAccount,
        topic: selectedTopic,
      }),
    })

    const generateResult = await generateResponse.json()

    if (!generateResponse.ok) {
      setPostMessage(generateResult.error || 'OpenAI 글 생성에 실패했습니다.')
      setIsGeneratingPosts(false)
      return
    }

    const postDrafts = generateResult.posts.map(
      (post: {
        hook: string
        body: string
        closing_line: string
        hashtags: string
      }) => ({
        account_id: selectedAccount.id,
        topic_id: selectedTopic.id,
        hook: post.hook,
        body: post.body,
        closing_line: post.closing_line,
        hashtags: post.hashtags,
        tone: selectedAccount.tone || '친근함',
        length_type: '보통',
        cta_style: selectedAccount.cta_style || '댓글 유도',
        status: 'draft',
      }),
    )

    const { error } = await supabase.from('posts').insert(postDrafts)

    if (error) {
      setPostMessage(`글 생성 실패: ${error.message}`)
      setIsGeneratingPosts(false)
      return
    }

    setPostMessage('글 초안 3개를 posts 테이블에 저장했습니다.')
    setIsGeneratingPosts(false)

    const { data } = await supabase
      .from('posts')
      .select('id, hook, body, closing_line, hashtags, created_at')
      .eq('topic_id', selectedTopicId)
      .order('created_at', { ascending: false })
      .limit(6)

    const postList = data ?? []
    setPosts(postList)
    setSelectedPostId((current) => current || postList[0]?.id || '')
  }

  const handleCopyPost = async (post: Post) => {
    const textToCopy = [post.hook, '', post.body, '', post.closing_line || '', '', post.hashtags || '']
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedPostId(post.id)
      setPostMessage('선택한 글 초안을 클립보드에 복사했습니다.')
      window.setTimeout(() => {
        setCopiedPostId((current) => (current === post.id ? '' : current))
      }, 1500)
    } catch {
      setPostMessage('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  const handleSaveSchedule = async () => {
    if (!selectedPostId) {
      setScheduleMessage('먼저 예약할 글을 하나 선택해 주세요.')
      return
    }

    if (!scheduleDate || !scheduleTime) {
      setScheduleMessage('예약 날짜와 시간을 모두 입력해 주세요.')
      return
    }

    setIsSavingSchedule(true)
    setScheduleMessage('예약 저장 중...')

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00+09:00`).toISOString()

    const { error } = await supabase.from('schedules').insert({
      post_id: selectedPostId,
      scheduled_at: scheduledAt,
      status: 'scheduled',
      platform: 'threads',
    })

    if (error) {
      setScheduleMessage(`예약 저장 실패: ${error.message}`)
      setIsSavingSchedule(false)
      return
    }

    setScheduleMessage('예약이 저장되었습니다.')
    setIsSavingSchedule(false)
    setScheduledPostId(selectedPostId)
    setScheduleDate('')
    setScheduleTime('')
    window.setTimeout(() => {
      setScheduledPostId((current) => (current === selectedPostId ? '' : current))
    }, 1800)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#f8fafc)] px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
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
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              예약 목록 보기
            </Link>
          </div>
        </nav>

        <section className="rounded-[32px] border border-orange-100 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold tracking-[0.2em] text-orange-500 uppercase">
              Threads Writer
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950">
              계정 설정부터 시작하는 Threads 글 작성 도우미
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              아래 정보를 입력하면 첫 번째 단계인 계정 설정이 Supabase
              accounts 테이블에 저장됩니다. 저장이 되면 다음 단계로 주제 추천과
              글 생성 기능을 붙이면 됩니다.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-950">
                1. 계정 기본 정보 입력
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                계정명과 카테고리는 필수입니다. 브랜드 소개와 타깃 고객은
                자세히 적을수록 다음 단계에서 더 좋은 주제가 나옵니다.
              </p>
            </div>

            <div className="grid gap-5">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                계정명
                <input
                  required
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="@my_brand"
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                브랜드 소개
                <textarea
                  value={brandDescription}
                  onChange={(event) => setBrandDescription(event.target.value)}
                  placeholder="예: 소상공인을 위한 마케팅 정보와 실전 팁을 공유하는 계정"
                  rows={4}
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                카테고리
                <input
                  required
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="예: 마케팅"
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                타깃 고객
                <textarea
                  value={targetCustomer}
                  onChange={(event) => setTargetCustomer(event.target.value)}
                  placeholder="예: 온라인 판매를 시작한 30대 자영업자"
                  rows={4}
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  글 톤
                  <select
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="친근함">친근함</option>
                    <option value="전문가형">전문가형</option>
                    <option value="공감형">공감형</option>
                    <option value="정보형">정보형</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  CTA 스타일
                  <select
                    value={ctaStyle}
                    onChange={(event) => setCtaStyle(event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="댓글 유도">댓글 유도</option>
                    <option value="저장 유도">저장 유도</option>
                    <option value="프로필 방문 유도">프로필 방문 유도</option>
                    <option value="DM 유도">DM 유도</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSaving ? '저장 중...' : '계정 정보 저장하기'}
              </button>
              <p className="text-sm text-slate-600">{message}</p>
            </div>
          </form>

          <aside className="rounded-[32px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_20px_80px_rgba(15,23,42,0.16)]">
            <h2 className="text-2xl font-semibold">지금 화면에서 되는 일</h2>
            <div className="mt-6 grid gap-4 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                1. 입력한 값이 Supabase의 <strong>accounts</strong> 테이블에
                저장됩니다.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                2. 저장이 확인되면 다음 화면에서 계정 정보를 불러와 주제를
                추천할 수 있습니다.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                3. 그 다음에는 선택한 주제로 Threads 초안을 생성해
                <strong> posts</strong> 테이블에 저장하면 됩니다.
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold text-slate-950">
                2. 저장된 계정 불러오기
              </h2>
              <p className="text-sm leading-6 text-slate-500">
                저장된 계정 중 하나를 선택한 뒤 버튼을 누르면 해당 계정 기준으로
                추천 주제 3개를 topics 테이블에 저장합니다.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                계정 선택
                <select
                  value={selectedAccountId}
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">계정을 선택하세요</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} | {account.category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                추가 키워드
                <input
                  value={topicKeyword}
                  onChange={(event) => setTopicKeyword(event.target.value)}
                  placeholder="예: 쿠팡, 상세페이지, 자동 DM, 구매전환"
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
                <span className="text-xs leading-5 text-slate-500">
                  콤마로 여러 개 입력할 수 있고, 앞에 쓴 키워드일수록 더 중요하게 반영합니다.
                </span>
              </label>

              <p className="text-sm text-slate-600">{accountLoadMessage}</p>

              {selectedAccountId && (
                <div className="rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-slate-700">
                  {(() => {
                    const selectedAccount = accounts.find(
                      (account) => account.id === selectedAccountId,
                    )

                    if (!selectedAccount) return null

                    return (
                      <>
                        <p>
                          <strong>계정명:</strong> {selectedAccount.account_name}
                        </p>
                        <p>
                          <strong>카테고리:</strong> {selectedAccount.category}
                        </p>
                        <p>
                          <strong>타깃 고객:</strong>{' '}
                          {selectedAccount.target_customer || '미입력'}
                        </p>
                      </>
                    )
                  })()}
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleGenerateTopics}
                  disabled={isGeneratingTopics || !selectedAccountId}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-orange-500 px-6 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-200"
                >
                  {isGeneratingTopics ? '주제 생성 중...' : '주제 3개 생성하기'}
                </button>
                <p className="text-sm text-slate-600">{topicMessage}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  최근 생성된 주제
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  선택한 계정에 연결된 최신 주제를 최대 6개까지 보여줍니다.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {topics.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  아직 저장된 주제가 없습니다. 왼쪽에서 계정을 선택하고 주제 3개
                  생성하기 버튼을 눌러보세요.
                </div>
              ) : (
                topics.map((topic) => (
                  <article
                    key={topic.id}
                    className={`rounded-3xl border p-5 ${
                      selectedTopicId === topic.id
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="text-lg font-semibold text-slate-950">
                      {topic.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {topic.description}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-orange-700">
                      추천 이유: {topic.reason}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={`mt-4 inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                        selectedTopicId === topic.id
                          ? 'bg-slate-950 text-white'
                          : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {selectedTopicId === topic.id ? '선택된 주제' : '이 주제 선택'}
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold text-slate-950">
                3. 선택한 주제로 글 초안 생성
              </h2>
              <p className="text-sm leading-6 text-slate-500">
                위에서 선택한 주제를 바탕으로 posts 테이블에 글 초안 3개를
                저장합니다. 지금은 테스트용 템플릿 문장으로 먼저 연결해둔
                상태입니다.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <p>
                  <strong>선택된 주제:</strong>{' '}
                  {topics.find((topic) => topic.id === selectedTopicId)?.title ||
                    '아직 선택되지 않음'}
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleGeneratePosts}
                  disabled={isGeneratingPosts || !selectedTopicId}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isGeneratingPosts ? '글 생성 중...' : '글 3개 생성하기'}
                </button>
                <p className="text-sm text-slate-600">{postMessage}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">
                최근 생성된 글 초안
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                선택한 주제에 연결된 최신 초안입니다. Supabase의 posts 테이블에도
                함께 저장됩니다.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  아직 생성된 글 초안이 없습니다. 주제를 선택한 뒤 글 3개
                  생성하기 버튼을 눌러보세요.
                </div>
              ) : (
                posts.map((post) => (
                  <article
                    key={post.id}
                    className={`rounded-3xl border p-5 ${
                      selectedPostId === post.id
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="text-lg font-semibold text-slate-950">
                      {post.hook}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {post.body}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {post.closing_line}
                    </p>
                    <p className="mt-3 text-sm text-orange-700">
                      {post.hashtags}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyPost(post)}
                      className={`mt-4 inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold ring-1 transition active:scale-[0.98] ${
                        copiedPostId === post.id
                          ? 'bg-emerald-600 text-white ring-emerald-600'
                          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {copiedPostId === post.id ? '복사 완료' : '복사하기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPostId(post.id)}
                      className={`mt-4 ml-3 inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition active:scale-[0.98] ${
                        selectedPostId === post.id
                          ? 'bg-slate-950 text-white'
                          : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {selectedPostId === post.id ? '선택된 글' : '이 글 예약하기'}
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold text-slate-950">
                4. 예약 저장
              </h2>
              <p className="text-sm leading-6 text-slate-500">
                위에서 선택한 글을 날짜와 시간에 맞춰 schedules 테이블에 저장합니다.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <p>
                  <strong>선택된 글:</strong>{' '}
                  {posts.find((post) => post.id === selectedPostId)?.hook || '아직 선택되지 않음'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  예약 날짜
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  예약 시간
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(event) => setScheduleTime(event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={isSavingSchedule || !selectedPostId}
                  className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed ${
                    scheduledPostId && selectedPostId === scheduledPostId
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-orange-500 hover:bg-orange-400 disabled:bg-orange-200'
                  }`}
                >
                  {isSavingSchedule
                    ? '예약 저장 중...'
                    : scheduledPostId && selectedPostId === scheduledPostId
                      ? '예약 완료'
                      : '예약 저장하기'}
                </button>
                <Link
                  href="/schedules"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  예약 목록 보기
                </Link>
                <p className="text-sm text-slate-600">{scheduleMessage}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_20px_80px_rgba(15,23,42,0.16)]">
            <h2 className="text-2xl font-semibold">다음 단계</h2>
            <div className="mt-6 grid gap-4 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                예약 저장이 끝나면 별도 예약 목록 페이지에서 전체 예약 글을 확인할 수 있습니다.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                예약 목록 페이지에서는 저장된 포스트를 선택해서 전체 내용을 보고 바로 복사할 수 있습니다.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                다음에는 예약 수정, 삭제, 실제 자동 게시 기능을 차례대로 붙이면 됩니다.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
