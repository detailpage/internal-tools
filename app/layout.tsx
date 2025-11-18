import type { Metadata } from 'next'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Client Tools - DetailPage',
  description: 'DetailPage Client Tools Suite',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.13.0/css/all.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}
