import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type GalleryItem = {
  id: string
  path: string
  alt: string
  visible: boolean
  focal: boolean
  createdAt: string
}

type GalleryManifest = {
  items: GalleryItem[]
  downloadUrl: string
}

const bucketName = 'the-moments-gallery'
const manifestPath = 'manifest/gallery.json'
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/json']
const maxGalleryItems = 30

const defaultItems: GalleryItem[] = [
  {
    id: 'default-6',
    path: '/the-moments/assets/tmom-6.jpg',
    alt: '선반 위에 놓인 The Moments 블럭 액자',
    visible: true,
    focal: true,
    createdAt: '2026-05-12T00:00:00.000Z',
  },
  {
    id: 'default-2',
    path: '/the-moments/assets/tmom-2.jpg',
    alt: '가족 사진으로 구성된 The Moments 블럭 액자',
    visible: true,
    focal: false,
    createdAt: '2026-05-12T00:00:00.000Z',
  },
  {
    id: 'default-0',
    path: '/the-moments/assets/tmom-0.jpg',
    alt: '반려견 사진으로 구성된 The Moments 블럭 액자',
    visible: true,
    focal: false,
    createdAt: '2026-05-12T00:00:00.000Z',
  },
]

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  })
}

function isAuthorized(request: Request) {
  const adminPin = process.env.THE_MOMENTS_ADMIN_PIN

  if (!adminPin) {
    return false
  }

  return request.headers.get('x-gallery-admin-pin') === adminPin
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: '관리자 PIN이 필요하거나 올바르지 않습니다.' },
    { status: 401 },
  )
}

function missingConfigResponse() {
  return NextResponse.json(
    {
      error:
        'Supabase Storage 설정이 필요합니다. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, THE_MOMENTS_ADMIN_PIN을 확인해 주세요.',
    },
    { status: 500 },
  )
}

async function ensureBucket() {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    throw new Error('missing_config')
  }

  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    throw listError
  }

  const hasBucket = buckets.some((bucket) => bucket.name === bucketName)

  if (!hasBucket) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 3 * 1024 * 1024,
      allowedMimeTypes,
    })

    if (createError) {
      throw createError
    }

    return
  }

  const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
    public: true,
    fileSizeLimit: 3 * 1024 * 1024,
    allowedMimeTypes,
  })

  if (updateError) {
    throw updateError
  }
}

async function readManifest() {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    throw new Error('missing_config')
  }

  await ensureBucket()

  const { data, error } = await supabase.storage.from(bucketName).download(manifestPath)

  if (error) {
    return {
      items: defaultItems,
      downloadUrl: '',
    }
  }

  const text = await data.text()
  const parsed = JSON.parse(text) as GalleryItem[] | Partial<GalleryManifest>

  if (!Array.isArray(parsed)) {
    return {
      items: Array.isArray(parsed.items) ? parsed.items.slice(0, maxGalleryItems) : defaultItems,
      downloadUrl: typeof parsed.downloadUrl === 'string' ? parsed.downloadUrl : '',
    }
  }

  return {
    items: parsed.slice(0, maxGalleryItems),
    downloadUrl: '',
  }
}

async function writeManifest(manifest: GalleryManifest) {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    throw new Error('missing_config')
  }

  await ensureBucket()

  const normalizedItems = manifest.items.slice(0, maxGalleryItems)
  const hasFocal = normalizedItems.some((item) => item.focal)

  if (!hasFocal && normalizedItems[0]) {
    normalizedItems[0].focal = true
  }

  const body = JSON.stringify(
    {
      items: normalizedItems,
      downloadUrl: manifest.downloadUrl,
    },
    null,
    2,
  )
  const { error } = await supabase.storage.from(bucketName).upload(manifestPath, body, {
    contentType: 'application/json',
    upsert: true,
  })

  if (error) {
    throw error
  }

  return {
    items: normalizedItems,
    downloadUrl: manifest.downloadUrl,
  }
}

function itemToClient(item: GalleryItem) {
  if (item.path.startsWith('/')) {
    return {
      ...item,
      src: item.path,
    }
  }

  const supabase = getSupabaseAdmin()
  const { data } = supabase!.storage.from(bucketName).getPublicUrl(item.path)

  return {
    ...item,
    src: data.publicUrl,
  }
}

export async function GET() {
  try {
    const manifest = await readManifest()

    return NextResponse.json({
      items: manifest.items.map(itemToClient),
      downloadUrl: manifest.downloadUrl,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'missing_config') {
      return NextResponse.json({
        items: defaultItems.map((item) => ({ ...item, src: item.path })),
        downloadUrl: '',
        warning:
          'Supabase Storage 설정이 없어 기본 갤러리를 표시합니다. 업로드 관리는 환경변수 설정 후 사용할 수 있습니다.',
      })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '갤러리를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse()
  }

  const supabase = getSupabaseAdmin()

  if (!supabase) {
    return missingConfigResponse()
  }

  try {
    const manifest = await readManifest()

    if (manifest.items.length >= maxGalleryItems) {
      return NextResponse.json({ error: '최대 30장까지 업로드할 수 있습니다.' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('image')
    const alt = String(formData.get('alt') || 'The Moments 갤러리 이미지')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '이미지 파일이 필요합니다.' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const extension = file.type === 'image/png' ? 'png' : 'jpg'
    const storagePath = `images/${id}.${extension}`
    const arrayBuffer = await file.arrayBuffer()

    await ensureBucket()

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      throw uploadError
    }

    const nextItems = [
      ...manifest.items,
      {
        id,
        path: storagePath,
        alt,
        visible: true,
        focal: manifest.items.length === 0,
        createdAt: new Date().toISOString(),
      },
    ]

    const savedManifest = await writeManifest({
      ...manifest,
      items: nextItems,
    })

    return NextResponse.json({
      items: savedManifest.items.map(itemToClient),
      downloadUrl: savedManifest.downloadUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '이미지를 업로드하지 못했습니다.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse()
  }

  if (!getSupabaseAdmin()) {
    return missingConfigResponse()
  }

  try {
    const body = (await request.json()) as {
      id?: string
      visible?: boolean
      focal?: boolean
      alt?: string
      downloadUrl?: string
    }
    const manifest = await readManifest()

    if (typeof body.downloadUrl === 'string' && !body.id) {
      const savedManifest = await writeManifest({
        ...manifest,
        downloadUrl: body.downloadUrl.trim(),
      })

      return NextResponse.json({
        items: savedManifest.items.map(itemToClient),
        downloadUrl: savedManifest.downloadUrl,
      })
    }

    const targetIndex = manifest.items.findIndex((item) => item.id === body.id)

    if (targetIndex === -1) {
      return NextResponse.json({ error: '갤러리 이미지를 찾지 못했습니다.' }, { status: 404 })
    }

    const nextItems = manifest.items.map((item, index) => {
      if (index !== targetIndex) {
        return body.focal ? { ...item, focal: false } : item
      }

      return {
        ...item,
        visible: typeof body.visible === 'boolean' ? body.visible : item.visible,
        focal: typeof body.focal === 'boolean' ? body.focal : item.focal,
        alt: typeof body.alt === 'string' ? body.alt : item.alt,
      }
    })

    const savedManifest = await writeManifest({
      ...manifest,
      items: nextItems,
    })

    return NextResponse.json({
      items: savedManifest.items.map(itemToClient),
      downloadUrl: savedManifest.downloadUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '갤러리 정보를 수정하지 못했습니다.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse()
  }

  const supabase = getSupabaseAdmin()

  if (!supabase) {
    return missingConfigResponse()
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const manifest = await readManifest()
    const targetItem = manifest.items.find((item) => item.id === id)

    if (!targetItem) {
      return NextResponse.json({ error: '갤러리 이미지를 찾지 못했습니다.' }, { status: 404 })
    }

    if (!targetItem.path.startsWith('/')) {
      await supabase.storage.from(bucketName).remove([targetItem.path])
    }

    const savedManifest = await writeManifest({
      ...manifest,
      items: manifest.items.filter((item) => item.id !== id),
    })

    return NextResponse.json({
      items: savedManifest.items.map(itemToClient),
      downloadUrl: savedManifest.downloadUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '갤러리 이미지를 삭제하지 못했습니다.' },
      { status: 500 },
    )
  }
}
