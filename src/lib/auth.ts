import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '@prisma/client'

// -----------------------------------------------------------------------------
// Authentication & Verification Helpers
//
// This module centralises authentication helpers such as password hashing,
// JWT creation/verification, email domain checks and user sanitisation.  The
// original project only included basic academic email verification; this
// version extends support to corporate research organisations and exposes
// convenience helpers for checking access level.

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = '7d'

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Compare a plaintext password with a hashed password.
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Generate a signed JSON Web Token for a user ID.
 */
export function generateToken(userId: string): string {
  return jwt.sign(
    { userId, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * Verify a JSON Web Token and return the payload if valid.
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Generate a random token string used for email verification.
 */
export function generateVerificationToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  )
}

/**
 * Determine whether an email belongs to an academic institution.
 *
 * Academic emails usually end in domains such as `.edu`, `.ac.uk`,
 * `.uni`, etc. We also include a handful of specific research
 * institutions.
 */
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

  // Check academic TLDs
  for (const acadDomain of academicDomains) {
    if (domain.endsWith(acadDomain)) return true
  }

  // Check known research institutions
  for (const institution of researchInstitutions) {
    if (domain === institution || domain.endsWith(`.${institution}`)) return true
  }

  return false
}

/**
 * Determine whether an email belongs to a corporate research organisation.
 *
 * Corporate research emails typically come from major R&D departments in
 * large technology companies. This list should be kept up‑to‑date as
 * new research labs emerge.
 */
export function isCorporateEmail(email: string): boolean {
  const corporateDomains = [
    'google.com',
    'alphabet.com',
    'deepmind.com',
    'openai.com',
    'microsoft.com',
    'ibm.com',
    'apple.com',
    'amazon.com',
    'facebook.com',
    'meta.com',
    'baidu.com',
    'tencent.com',
    'alibaba-inc.com',
    'nvidia.com',
    'qualcomm.com',
    'intel.com',
    'tesla.com',
    'huawei.com',
    'samsung.com',
  ]
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return corporateDomains.some((corp) => domain === corp || domain.endsWith(`.${corp}`))
}

/**
 * Determine whether a given email should be granted full access.
 * Full access is granted to academic and corporate research emails.
 */
export function hasFullAccess(email: string): boolean {
  return isAcademicEmail(email) || isCorporateEmail(email)
}

/**
 * Utility to remove sensitive information from a user object.
 */
export function sanitizeUser<T extends Partial<User>>(user: T): Omit<T, 'password'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...sanitized } = user as any
  return sanitized
}