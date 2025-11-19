/**
 * Environment Variable Validation
 *
 * This file validates that all required environment variables are set
 * and provides helpful error messages if they're missing.
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string

  // Authentication
  JWT_SECRET: string
  NEXTAUTH_URL?: string
  NEXTAUTH_SECRET?: string

  // Email (optional but recommended)
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_USER?: string
  SMTP_PASS?: string
  SMTP_FROM?: string

  // AWS S3 (optional)
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
  AWS_REGION?: string
  AWS_S3_BUCKET?: string

  // Redis (optional)
  REDIS_URL?: string

  // Node environment
  NODE_ENV?: string
}

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvironmentError'
  }
}

function validateRequiredEnv(key: keyof EnvConfig, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new EnvironmentError(
      `Missing required environment variable: ${key}\n` +
      `Please add it to your .env file. See .env.example for reference.`
    )
  }
  return value
}

function validateOptionalEnv(key: keyof EnvConfig, value: string | undefined): string | undefined {
  return value && value.trim() !== '' ? value : undefined
}

/**
 * Validate all required environment variables
 * Throws EnvironmentError if any required variable is missing
 */
export function validateEnv(): EnvConfig {
  const requiredVars = {
    DATABASE_URL: validateRequiredEnv('DATABASE_URL', process.env.DATABASE_URL),
    JWT_SECRET: validateRequiredEnv('JWT_SECRET', process.env.JWT_SECRET),
  }

  const optionalVars = {
    NEXTAUTH_URL: validateOptionalEnv('NEXTAUTH_URL', process.env.NEXTAUTH_URL),
    NEXTAUTH_SECRET: validateOptionalEnv('NEXTAUTH_SECRET', process.env.NEXTAUTH_SECRET),
    SMTP_HOST: validateOptionalEnv('SMTP_HOST', process.env.SMTP_HOST),
    SMTP_PORT: validateOptionalEnv('SMTP_PORT', process.env.SMTP_PORT),
    SMTP_USER: validateOptionalEnv('SMTP_USER', process.env.SMTP_USER),
    SMTP_PASS: validateOptionalEnv('SMTP_PASS', process.env.SMTP_PASS),
    SMTP_FROM: validateOptionalEnv('SMTP_FROM', process.env.SMTP_FROM),
    AWS_ACCESS_KEY_ID: validateOptionalEnv('AWS_ACCESS_KEY_ID', process.env.AWS_ACCESS_KEY_ID),
    AWS_SECRET_ACCESS_KEY: validateOptionalEnv('AWS_SECRET_ACCESS_KEY', process.env.AWS_SECRET_ACCESS_KEY),
    AWS_REGION: validateOptionalEnv('AWS_REGION', process.env.AWS_REGION),
    AWS_S3_BUCKET: validateOptionalEnv('AWS_S3_BUCKET', process.env.AWS_S3_BUCKET),
    REDIS_URL: validateOptionalEnv('REDIS_URL', process.env.REDIS_URL),
    NODE_ENV: process.env.NODE_ENV || 'development',
  }

  // Warning for missing optional but important variables
  const warnings: string[] = []

  if (!optionalVars.SMTP_HOST || !optionalVars.SMTP_USER || !optionalVars.SMTP_PASS) {
    warnings.push('⚠️  Email configuration incomplete. Email verification will not work.')
  }

  if (!optionalVars.AWS_ACCESS_KEY_ID || !optionalVars.AWS_S3_BUCKET) {
    warnings.push('⚠️  AWS S3 configuration incomplete. File uploads will not work.')
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('\n' + warnings.join('\n') + '\n')
  }

  return {
    ...requiredVars,
    ...optionalVars,
  }
}

/**
 * Check if email configuration is complete
 */
export function hasEmailConfig(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

/**
 * Check if S3 configuration is complete
 */
export function hasS3Config(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  )
}

/**
 * Check if Redis is configured
 */
export function hasRedisConfig(): boolean {
  return Boolean(process.env.REDIS_URL)
}

/**
 * Get environment-specific configuration
 */
export function getEnvConfig() {
  const env = validateEnv()

  return {
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    features: {
      email: hasEmailConfig(),
      fileUpload: hasS3Config(),
      redis: hasRedisConfig(),
    },
  }
}

// Validate on import (only in Node.js environment)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    validateEnv()
  } catch (error) {
    if (error instanceof EnvironmentError) {
      console.error('\n❌ Environment Configuration Error:\n')
      console.error(error.message)
      console.error('\n')
      process.exit(1)
    }
    throw error
  }
}
