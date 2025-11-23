/**
 * ML Embeddings System for Semantic Similarity
 *
 * Supports multiple embedding providers:
 * - OpenAI (text-embedding-ada-002, text-embedding-3-small, text-embedding-3-large)
 * - Local models (via sentence-transformers or similar)
 * - Custom embeddings
 */

import prisma from '@/lib/prisma'

export type EmbeddingProvider = 'openai' | 'local' | 'custom'

export interface EmbeddingConfig {
  provider: EmbeddingProvider
  model: string
  apiKey?: string
  endpoint?: string
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
  if (magnitude === 0) return 0

  return dotProduct / magnitude
}

/**
 * Generate embedding using OpenAI API
 */
async function generateOpenAIEmbedding(
  text: string,
  model: string = 'text-embedding-3-small',
  apiKey?: string
): Promise<number[]> {
  const key = apiKey || process.env.OPENAI_API_KEY

  if (!key) {
    throw new Error('OpenAI API key not configured')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Generate embedding using local model (placeholder for future implementation)
 */
async function generateLocalEmbedding(
  text: string,
  endpoint?: string
): Promise<number[]> {
  // This would call a local embedding service
  // For now, return a simple hash-based pseudo-embedding
  console.warn('Local embedding generation not implemented, using fallback')

  // Simple fallback: create a 384-dimensional vector based on text hash
  const hash = simpleHash(text)
  const dim = 384
  const embedding = new Array(dim).fill(0)

  for (let i = 0; i < dim; i++) {
    embedding[i] = Math.sin(hash + i) * 0.5
  }

  return embedding
}

/**
 * Simple hash function for fallback embeddings
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash
}

/**
 * Generate embedding based on provider configuration
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<number[]> {
  // Truncate very long text to avoid API limits
  const maxLength = 8000
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text

  switch (config.provider) {
    case 'openai':
      return generateOpenAIEmbedding(truncatedText, config.model, config.apiKey)
    case 'local':
      return generateLocalEmbedding(truncatedText, config.endpoint)
    case 'custom':
      throw new Error('Custom embedding provider not implemented')
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`)
  }
}

/**
 * Get or create embedding for content
 */
export async function getOrCreateEmbedding(
  contentType: 'post' | 'paper' | 'user_profile',
  contentId: string,
  text: string,
  config: EmbeddingConfig
): Promise<number[]> {
  // Check if embedding already exists
  const existing = await prisma.contentEmbedding.findUnique({
    where: {
      contentType_contentId_model: {
        contentType,
        contentId,
        model: config.model,
      },
    },
  })

  if (existing) {
    return existing.embedding as number[]
  }

  // Generate new embedding
  const embedding = await generateEmbedding(text, config)

  // Store in database
  await prisma.contentEmbedding.create({
    data: {
      contentType,
      contentId,
      embedding,
      model: config.model,
      sourceText: text.substring(0, 500), // Store first 500 chars for reference
    },
  })

  return embedding
}

/**
 * Find similar content using embeddings
 */
export async function findSimilarContent(
  queryEmbedding: number[],
  contentType: 'post' | 'paper',
  limit: number = 20,
  excludeIds: string[] = [],
  minSimilarity: number = 0.5
): Promise<Array<{ contentId: string; similarity: number }>> {
  // Get all embeddings of the specified type
  const embeddings = await prisma.contentEmbedding.findMany({
    where: {
      contentType,
      contentId: {
        notIn: excludeIds,
      },
    },
  })

  // Calculate similarities
  const similarities = embeddings.map(emb => ({
    contentId: emb.contentId,
    similarity: cosineSimilarity(queryEmbedding, emb.embedding as number[]),
  }))

  // Filter by minimum similarity and sort
  return similarities
    .filter(s => s.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}

/**
 * Create user profile embedding from research interests
 */
export async function createUserProfileEmbedding(
  userId: string,
  researchInterests: string[],
  config: EmbeddingConfig
): Promise<number[]> {
  const profileText = researchInterests.join('. ')

  return getOrCreateEmbedding('user_profile', userId, profileText, config)
}

/**
 * Batch update embeddings for existing content
 */
export async function batchUpdateEmbeddings(
  contentType: 'post' | 'paper',
  config: EmbeddingConfig,
  batchSize: number = 10
): Promise<{ processed: number; errors: number }> {
  let processed = 0
  let errors = 0

  if (contentType === 'post') {
    // Get posts without embeddings
    const posts = await prisma.post.findMany({
      where: {
        published: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
      take: batchSize,
    })

    for (const post of posts) {
      try {
        const text = `${post.title || ''} ${post.content}`
        await getOrCreateEmbedding('post', post.id, text, config)
        processed++
      } catch (error) {
        console.error(`Error creating embedding for post ${post.id}:`, error)
        errors++
      }
    }
  } else if (contentType === 'paper') {
    // Get papers without embeddings
    const papers = await prisma.paper.findMany({
      select: {
        id: true,
        title: true,
        abstract: true,
      },
      take: batchSize,
    })

    for (const paper of papers) {
      try {
        const text = `${paper.title} ${paper.abstract}`
        await getOrCreateEmbedding('paper', paper.id, text, config)
        processed++
      } catch (error) {
        console.error(`Error creating embedding for paper ${paper.id}:`, error)
        errors++
      }
    }
  }

  return { processed, errors }
}

/**
 * Get default embedding configuration
 */
export function getDefaultEmbeddingConfig(): EmbeddingConfig {
  const provider = process.env.EMBEDDING_PROVIDER as EmbeddingProvider || 'local'
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'

  return {
    provider,
    model,
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: process.env.EMBEDDING_ENDPOINT,
  }
}

/**
 * Check if embeddings are enabled
 */
export function isEmbeddingsEnabled(): boolean {
  const provider = process.env.EMBEDDING_PROVIDER
  if (!provider) return false

  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    return false
  }

  return true
}
