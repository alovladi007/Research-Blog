let prisma: any

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  // During build time, use a stub
  prisma = new Proxy({} as any, {
    get: () => {
      return () => Promise.resolve(null)
    }
  })
} else {
  // At runtime, use the real Prisma client
  try {
    const { PrismaClient } = require('@prisma/client')
    const globalForPrisma = globalThis as unknown as {
      prisma: any
    }
    
    prisma = globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
    
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
  } catch (e) {
    // If Prisma client is not generated yet, use stub
    prisma = new Proxy({} as any, {
      get: () => {
        return () => Promise.resolve(null)
      }
    })
  }
}

export { prisma }
export default prisma