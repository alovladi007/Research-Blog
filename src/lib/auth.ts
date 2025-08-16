import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = '7d'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string): string {
  return jwt.sign(
    { userId, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch (error) {
    return null
  }
}

export function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function isAcademicEmail(email: string): boolean {
  const academicDomains = [
    '.edu',
    '.ac.uk',
    '.ac.jp',
    '.ac.in',
    '.edu.au',
    '.edu.cn',
    '.uni',
    '.university',
    '.college',
    '.institute',
    '.research',
  ]
  
  const researchInstitutions = [
    'cern.ch',
    'nasa.gov',
    'nih.gov',
    'ieee.org',
    'acm.org',
    'mit.edu',
    'stanford.edu',
    'harvard.edu',
    'oxford.ac.uk',
    'cambridge.ac.uk',
    'caltech.edu',
    'berkeley.edu',
    'yale.edu',
    'princeton.edu',
    'columbia.edu',
  ]
  
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  
  // Check academic domains
  for (const acadDomain of academicDomains) {
    if (domain.includes(acadDomain)) return true
  }
  
  // Check known research institutions
  for (const institution of researchInstitutions) {
    if (domain === institution || domain.endsWith('.' + institution)) return true
  }
  
  return false
}

export function sanitizeUser(user: Partial<User>): Partial<User> {
  const { password, ...sanitized } = user
  return sanitized
}