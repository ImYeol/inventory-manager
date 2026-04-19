'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import {
  Boxes,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Settings2,
  Truck,
} from 'lucide-react'
import { logout } from '@/app/login/actions'
import { MenuLink } from '@/components/ui/menu'
import { cx, ui } from './ui'

type NavProps = {
  user?: {
    name: string
    email: string
  }
}

type NavItem = {
  href: string
  label: string
  icon: ReactNode
}

const directItems: NavItem[] = [
  { href: '/', label: '대시보드', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/inventory', label: '재고 운영', icon: <Boxes className="h-4 w-4" /> },
  { href: '/products', label: '상품 관리', icon: <Database className="h-4 w-4" /> },
  { href: '/sourcing', label: '소싱', icon: <PackageSearch className="h-4 w-4" /> },
  { href: '/shipping', label: '운송장', icon: <Truck className="h-4 w-4" /> },
  { href: '/settings', label: '설정', icon: <Settings2 className="h-4 w-4" /> },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({
  item,
  pathname,
  compact = false,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  compact?: boolean
  onNavigate?: () => void
}) {
  const isActive = isActivePath(pathname, item.href)

  return <MenuLink href={item.href} label={item.label} icon={item.icon} active={isActive} compact={compact} onClick={onNavigate} />
}

function NavigationContent({
  pathname,
  user,
  onNavigate,
}: {
  pathname: string
  user?: NavProps['user']
  onNavigate?: () => void
}) {
  const userInitial = (user?.name?.trim().charAt(0) || user?.email?.trim().charAt(0) || 'U').toUpperCase()

  return (
    <>
      <div className="border-b border-slate-200 px-4 py-4">
        <h1 className="text-sm font-semibold tracking-tight text-slate-950">Seleccase Inventory</h1>
        <p className="mt-0.5 text-xs text-slate-500">운영 콘솔</p>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3.5" aria-label="주요 메뉴">
        {directItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-950">{user?.name ?? '사용자'}</p>
            <p className="truncate text-xs text-slate-500">{user?.email ?? '로그인 정보 없음'}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
            {userInitial}
          </div>
        </div>

        <div className="mt-3">
          <form action={logout}>
            <button type="submit" className={cx(ui.buttonSecondary, 'h-10 w-full gap-2')}>
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export default function Nav({ user }: NavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <aside className={ui.desktopSidebar}>
        <NavigationContent pathname={pathname} user={user} />
      </aside>

      <div className={ui.mobileTopbar}>
        <button
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className={cx(ui.buttonSecondary, 'h-11 min-w-11 gap-2 px-3')}
        >
          <Menu className="h-4 w-4" />
          메뉴
        </button>
        <div className="min-w-0 px-3 text-center">
          <p className="truncate text-sm font-semibold text-slate-950">Seleccase Inventory</p>
        </div>
        <Link href="/settings" aria-label="설정" className={cx(ui.buttonSecondary, 'h-11 min-w-11 gap-2 px-3')}>
          <Settings2 className="h-4 w-4" />
          설정
        </Link>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="모바일 메뉴 닫기"
            onClick={() => setMobileOpen(false)}
            className={ui.mobileDrawerScrim}
          />
          <div role="dialog" aria-modal="true" aria-label="모바일 메뉴" className={ui.mobileDrawer}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">메뉴</p>
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={() => setMobileOpen(false)}
                className={cx(ui.buttonGhost, 'h-10 min-w-10 px-3')}
              >
                닫기
              </button>
            </div>
            <NavigationContent
              pathname={pathname}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      ) : null}
    </>
  )
}
