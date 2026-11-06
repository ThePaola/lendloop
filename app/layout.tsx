import type { Metadata } from 'next'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Fraunces, Inter } from 'next/font/google'
import { Suspense } from 'react'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import { UserSync } from '@/components/UserSync'
import { Nav } from '@/components/Nav'
import './globals.css'

const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'] })
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LendLoop',
  description: "Borrow what you need. Lend what you don't.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ClerkProvider
          appearance={{
            variables: { colorPrimary: '#2f5d46', fontFamily: 'var(--font-inter)', borderRadius: '0.375rem' },
          }}
        >
          <ConvexClientProvider>
            <UserSync />
            <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
              <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-5">
                <Nav />
                <div className="ml-auto flex items-center gap-2">
                  <Suspense>
                    <Show when="signed-out">
                      <SignInButton mode="modal">
                        <button className="btn btn-ghost">Sign in</button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button className="btn btn-primary">Sign up</button>
                      </SignUpButton>
                    </Show>
                    <Show when="signed-in">
                      <UserButton />
                    </Show>
                  </Suspense>
                </div>
              </div>
            </header>
            <div className="flex-1">{children}</div>
            <footer className="border-t border-line py-6 text-center text-xs text-muted">
              LendLoop · a neighborhood tool library
            </footer>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
