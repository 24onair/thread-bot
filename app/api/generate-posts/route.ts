import { NextResponse } from 'next/server'

type GeneratePostsRequest = {
  account: {
    id: string
    account_name: string
    brand_description: string | null
    category: string
    target_customer: string | null
    tone: string | null
    cta_style: string | null
  }
  topic: {
    id: string
    title: string
    description: string | null
    reason: string | null
  }
}

type GeneratedPost = {
  hook: string
  body: string
  closing_line: string
  hashtags: string
}

type ResponseContent = {
  type?: string
  text?: string
}

type ResponseOutputItem = {
  content?: ResponseContent[]
}

type OpenAIResponse = {
  output_text?: string
  output?: ResponseOutputItem[]
}

function extractTextFromResponse(data: OpenAIResponse) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text
  }

  const messageText = data.output
    ?.flatMap((item) => item.content ?? [])
    ?.filter((content) => content.type === 'output_text')
    ?.map((content) => content.text ?? '')
    ?.join('\n')

  return typeof messageText === 'string' ? messageText : ''
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'OPENAI_API_KEY가 비어 있습니다. .env.local 파일에 OpenAI API 키를 추가해 주세요.',
      },
      { status: 500 },
    )
  }

  const body = (await request.json()) as GeneratePostsRequest
  const { account, topic } = body

  if (!account || !topic) {
    return NextResponse.json(
      { error: '계정 정보와 주제 정보가 모두 필요합니다.' },
      { status: 400 },
    )
  }

  const prompt = [
    '너는 한국어 Threads 콘텐츠 전문 카피라이터다.',
    '아래 정보를 바탕으로 한국어 Threads 초안 3개를 만든다.',
    '각 초안은 실제 타깃 고객이 공감할 만한 맥락과 상황을 가져야 한다.',
    '',
    `[계정명] ${account.account_name}`,
    `[브랜드 소개] ${account.brand_description || '정보 없음'}`,
    `[카테고리] ${account.category}`,
    `[타깃 고객] ${account.target_customer || '정보 없음'}`,
    `[톤] ${account.tone || '친근함'}`,
    `[CTA 스타일] ${account.cta_style || '댓글 유도'}`,
    '',
    `[선택 주제] ${topic.title}`,
    `[주제 설명] ${topic.description || '정보 없음'}`,
    `[추천 이유] ${topic.reason || '정보 없음'}`,
    '',
    '작성 규칙:',
    '1. 결과는 정확히 3개의 게시글 초안이어야 한다.',
    '2. 각 초안은 hook, body, closing_line, hashtags 필드를 가져야 한다.',
    '3. hook은 첫 줄에서 시선을 끄는 문장으로 쓴다.',
    '4. body는 3~5문장 정도로 구체적인 상황과 해결 포인트를 담는다.',
    '5. closing_line은 CTA 스타일에 맞게 마무리한다.',
    '6. hashtags는 한국어 또는 영어 해시태그 3~5개를 한 줄 문자열로 만든다.',
    '7. 너무 추상적인 표현, 뜬구름 잡는 표현, 업종과 무관한 문장은 피한다.',
    '8. 결과는 반드시 JSON 스키마에 맞는 JSON만 출력한다.',
  ].join('\n')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      input: prompt,
      max_output_tokens: 1400,
      text: {
        format: {
          type: 'json_schema',
          name: 'threads_post_variations',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              posts: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    hook: { type: 'string' },
                    body: { type: 'string' },
                    closing_line: { type: 'string' },
                    hashtags: { type: 'string' },
                  },
                  required: ['hook', 'body', 'closing_line', 'hashtags'],
                },
              },
            },
            required: ['posts'],
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()

    return NextResponse.json(
      { error: `OpenAI 호출 실패: ${response.status} ${errorText}` },
      { status: 500 },
    )
  }

  const data = (await response.json()) as OpenAIResponse
  const text = extractTextFromResponse(data)

  if (!text) {
    return NextResponse.json(
      { error: 'OpenAI 응답에서 텍스트를 찾지 못했습니다.' },
      { status: 500 },
    )
  }

  let parsed: { posts: GeneratedPost[] }

  try {
    parsed = JSON.parse(text)
  } catch {
    return NextResponse.json(
      { error: 'OpenAI 응답 JSON 파싱에 실패했습니다.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ posts: parsed.posts })
}
