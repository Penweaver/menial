import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'menial — Nigeria\'s On-Demand Worker Marketplace',
  description:
    'Connect with NIN-verified workers near you for cleaning, moving, construction, events, and more. Funds held in escrow. Instant bank payout to workers.',
  keywords: [
    'on-demand workers Nigeria',
    'hire cleaners Lagos',
    'NIN verified workers',
    'escrow payment Nigeria',
    'menial marketplace',
    'find work Nigeria',
  ],
  openGraph: {
    title: 'menial — Hire Trusted Help. Pay Safely. Get It Done.',
    description:
      'NIN-verified workers. Escrow-protected payments. Instant payouts. Nigeria\'s most trusted on-demand work marketplace.',
    type: 'website',
    locale: 'en_NG',
    siteName: 'menial',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'menial — Nigeria\'s On-Demand Worker Marketplace',
    description:
      'NIN-verified workers. Escrow-protected payments. Instant payouts.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-NG" className={plusJakartaSans.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="font-sans antialiased bg-canvas text-text-primary">
        {children}
      </body>
    </html>
  )
}
