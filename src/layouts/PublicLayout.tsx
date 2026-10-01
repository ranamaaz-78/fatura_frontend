import { Outlet } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { PublicNavbar } from '../components/layout/PublicNavbar'

/** The whole public site is one landing page, so the navbar always sits over its dark hero. */
export function PublicLayout() {
  return (
    <div id="top" className="relative flex min-h-full flex-col bg-[#f8f9ff]">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
