import type { Metadata, Viewport } from "next"
import { Epilogue, Manrope } from "next/font/google"
import "./globals.css"
import Providers from "./providers"
import ThemeProvider from "@/components/layout/ThemeProvider"

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-epilogue",
})

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "MoeGami | Your Anime Library, Finally Organised",
  description:
    "Group hundreds of anime entries into clean franchise timelines. Track your main story progress automatically.",
  openGraph: {
    title: "MoeGami",
    description:
      "Group hundreds of anime entries into clean franchise timelines.",
    type: "website",
  },
}

// FIX: viewport separated from metadata — avoids Next.js deprecation warning
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#080808" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${epilogue.variable} ${manrope.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <ThemeProvider>{children}</ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}