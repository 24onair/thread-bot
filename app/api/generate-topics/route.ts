import { NextResponse } from 'next/server'

type GenerateTopicsRequest = {
  account: {
    id: string
    account_name: string
    brand_description: string | null
    category: string
    target_customer: string | null
    tone: string | null
    cta_style: string | null
  }
  existingTitles: string[]
}

type GeneratedTopic = {
  title: string
  description: string
  reason: string
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

  const body = (await request.json()) as GenerateTopicsRequest
  const { account, existingTitles } = body

  if (!account) {
    return NextResponse.json({ error: '계정 정보가 필요합니다.' }, { status: 400 })
  }

  const prompt = [
    '너는 한국어 Threads 콘텐츠 전략가다.',
    '아래 계정 정보를 바탕으로 관심을 끌 수 있는 새로운 주제 3개를 만든다.',
    '이미 생성된 주제와 겹치거나 표현만 살짝 바꾼 비슷한 주제는 절대 만들지 않는다.',
    '',
    `[계정명] ${account.account_name}`,
    `[브랜드 소개] ${account.brand_description || '정보 없음'}`,
    `[카테고리] ${account.category}`,
    `[타깃 고객] ${account.target_customer || '정보 없음'}`,
    `[톤] ${account.tone || '친근함'}`,
    `[CTA 스타일] ${account.cta_style || '댓글 유도'}`,
    '',
    `[이미 만든 주제 목록] ${
      existingTitles.length > 0 ? existingTitles.join(' | ') : '없음'
    }`,
    '',
    '작성 규칙:',
    '1. 결과는 정확히 3개의 주제여야 한다.',
    '2. 각 주제는 title, description, reason 필드를 가져야 한다.',
    '3. title은 Threads에서 바로 훅으로 활용할 수 있을 만큼 구체적이어야 한다.',
    '4. description은 어떤 내용으로 풀면 되는지 짧게 설명한다.',
    '5. reason은 왜 이 주제가 타깃 고객의 관심을 끄는지 설명한다.',
    '6. 기존 주제와 중복되거나 매우 유사한 표현은 금지한다.',
    '7. 추상적인 자기계발식 문장보다 업종과 고객 상황이 드러나는 주제를 우선한다.',
    '8. 결과는 반드시 JSON만 출력한다.',
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
      max_output_tokens: 1200,
      text: {
        format: {
          type: 'json_schema',
          name: 'threads_topic_variations',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              topics: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['title', 'description', 'reason'],
                },
              },
            },
            required: ['topics'],
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

  let parsed: { topics: GeneratedTopic[] }

  try {
    parsed = JSON.parse(text)
  } catch {
    return NextResponse.json(
      { error: 'OpenAI 응답 JSON 파싱에 실패했습니다.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ topics: parsed.topics })
}
