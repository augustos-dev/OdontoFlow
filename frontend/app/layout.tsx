// app/layout.tsx

import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next' 
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OdontoFlow — Gestão Clínica',
  description: 'Plataforma de gerenciamento clínico odontológico',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}

        {/* 🟢 Monitoramento de Visitas e Saúde Web */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}