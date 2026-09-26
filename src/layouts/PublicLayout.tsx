import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { PublicNavbar } from '../components/layout/PublicNavbar'
import { cn } from '../lib/cn'

export function PublicLayout() {
  const { pathname } = useLocation()

  // The landing hero renders behind its own navbar, so it needs no top offset.
  const onHero = pathname === '/'

  return (
    <div className="relative flex min-h-full flex-col bg-[#f8f9ff]">
      <PublicNavbar />
      <main className={cn('flex-1', !onHero && 'pt-20')}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
