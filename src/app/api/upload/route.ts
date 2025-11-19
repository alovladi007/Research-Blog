import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import {
  uploadToS3,
  generateFileKey,
  ALLOWED_MIME_TYPES,
} from '@/lib/upload'

const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024, // 10MB
  pdf: 50 * 1024 * 1024, // 50MB
  document: 20 * 1024 * 1024, // 20MB
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'avatar', 'paper', 'attachment'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!type || !['avatar', 'paper', 'attachment'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      )
    }

    // Validate file type
    let allowedTypes: string[] = []
    let maxSize: number = MAX_FILE_SIZE.document

    switch (type) {
      case 'avatar':
        allowedTypes = ALLOWED_MIME_TYPES.images
        maxSize = MAX_FILE_SIZE.image
        break
      case 'paper':
        allowedTypes = ALLOWED_MIME_TYPES.pdfs
        maxSize = MAX_FILE_SIZE.pdf
        break
      case 'attachment':
        allowedTypes = ALLOWED_MIME_TYPES.documents
        maxSize = MAX_FILE_SIZE.document
        break
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
        },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique key
    const key = generateFileKey(
      payload.userId,
      type as 'avatar' | 'paper' | 'attachment',
      file.name
    )

    // Upload to S3
    const url = await uploadToS3(buffer, key, file.type)

    return NextResponse.json(
      {
        url,
        key,
        size: file.size,
        mimeType: file.type,
        filename: file.name,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// Optional: Handle file deletion
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'No file key provided' },
        { status: 400 }
      )
    }

    // Verify the file belongs to the user
    if (!key.includes(payload.userId)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { deleteFromS3 } = await import('@/lib/upload')
    await deleteFromS3(key)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
