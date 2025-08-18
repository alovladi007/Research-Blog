import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma

// Helper functions for common database operations
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      bio: true,
      avatar: true,
      role: true,
      institution: true,
      department: true,
      researchInterests: true,
      orcid: true,
      googleScholarId: true,
      linkedinUrl: true,
      websiteUrl: true,
      verificationStatus: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          followers: true,
          following: true,
          papers: true,
        },
      },
    },
  })
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  })
}

export async function createUser(data: {
  email: string
  password: string
  name: string
  role?: 'STUDENT' | 'RESEARCHER' | 'PROFESSOR' | 'ADMIN'
  institution?: string
  department?: string
}) {
  return prisma.user.create({
    data,
  })
}

export async function updateUser(id: string, data: any) {
  return prisma.user.update({
    where: { id },
    data,
  })
}