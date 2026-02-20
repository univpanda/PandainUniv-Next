/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../index.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PandaInUniv — Bringing Transparency to Academia',
  description:
    'Explore PhD placement data, connect with academics, and participate in transparent university discussions. Find placement insights and engage with the academic community.',
  keywords:
    'PhD placements, academic jobs, university rankings, graduate school, academic community, research positions',
  authors: [{ name: 'PandaInUniv' }],
  icons: {
    icon: '/pandalogo-nobg.png',
    apple: '/pandalogo-nobg.png',
  },
  openGraph: {
    title: 'PandaInUniv — Bringing Transparency to Academia',
    description:
      'Explore PhD placement data, connect with academics, and participate in transparent university discussions.',
    url: 'https://pandainuniv.com',
    type: 'website',
    siteName: 'PandaInUniv',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PandaInUniv — Bringing Transparency to Academia',
    description:
      'Explore PhD placement data, connect with academics, and participate in transparent university discussions.',
    site: '@PandaInUniv',
    creator: '@PandaInUniv',
  },
  other: {
    'theme-color': '#3b82f6',
    'msapplication-navbutton-color': '#3b82f6',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
