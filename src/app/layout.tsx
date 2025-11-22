import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import Navigation from '@/components/layout/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ScholarHub - Academic Collaboration Platform',
  description: 'Connect, collaborate, and share research with academics worldwide',
  keywords: ['academic', 'research', 'collaboration', 'science', 'university'],
  authors: [{ name: 'ScholarHub Team' }],
  openGraph: {
    title: 'ScholarHub - Academic Collaboration Platform',
    description: 'Connect, collaborate, and share research with academics worldwide',
    url: 'https://scholarhub.com',
    siteName: 'ScholarHub',
    images: [
      {
        url: 'https://scholarhub.com/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScholarHub - Academic Collaboration Platform',
    description: 'Connect, collaborate, and share research with academics worldwide',
    images: ['https://scholarhub.com/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Navigation />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}