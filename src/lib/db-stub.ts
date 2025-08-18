// Stub for Prisma Client during build time
// This prevents build errors when DATABASE_URL is not available

export const prisma = new Proxy({} as any, {
  get: () => {
    return () => Promise.resolve(null)
  }
})

export default prisma