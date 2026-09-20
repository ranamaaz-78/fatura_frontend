import { Outlet } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { PublicNavbar } from '../components/layout/PublicNavbar'

export function PublicLayout() {
  return (
    <div className="min-h-full flex flex-col bg-[#f8f9ff]">
      <PublicNavbar />
      <main className="pt-20 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
