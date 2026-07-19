'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import {
  Boxes,
  ChevronsUpDown,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  KeyRound,
  ClipboardList,
  FileCode2,
} from 'lucide-react'
import { logout } from '@/app/login/actions'
import { MenuLink, MenuSection } from '@/components/ui/menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  { href: '/orders', label: '주문', icon: <ClipboardList className="h-4 w-4" /> },
  { href: '/products', label: '상품 관리', icon: <Database className="h-4 w-4" /> },
  { href: '/inventory', label: '재고 운영', icon: <Boxes className="h-4 w-4" /> },
]

const sourcingItems: NavItem[] = [
  { href: '/sourcing/factories', label: '외부 공장', icon: <span className="h-1.5 w-1.5 rounded-full bg-current" /> },
  { href: '/sourcing/arrivals', label: '입고 예정', icon: <span className="h-1.5 w-1.5 rounded-full bg-current" /> },
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
  const [sourcingOpen, setSourcingOpen] = useState(true)

  return (
    <>
      <div className="border-b border-[color:var(--border)] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent)] text-base font-bold text-white shadow-[var(--elevation-1)]"
          >
            S
          </span>
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-base font-semibold tracking-tight text-[color:var(--foreground)]">Seleccase Inventory</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="주요 메뉴">
        {directItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
        <MenuSection
          title="소싱"
          icon={<PackageSearch className="h-4 w-4" />}
          open={sourcingOpen}
          onToggle={() => setSourcingOpen((open) => !open)}
        >
          {sourcingItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} compact onNavigate={onNavigate} />
          ))}
        </MenuSection>
      </nav>

      <div className="mt-auto border-t border-[color:var(--border)] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[color:var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,white)] text-sm font-semibold text-[color:var(--accent)]">
                {userInitial}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium text-[color:var(--foreground)]">{user?.name ?? '사용자'}</p>
                <p className="truncate text-xs text-[color:var(--muted-foreground)]">{user?.email ?? '로그인 정보 없음'}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-[color:var(--muted-foreground)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[15.5rem]">
            <div className="min-w-0 px-2 py-1.5">
              <p className="truncate text-sm font-medium text-[color:var(--foreground)]">{user?.name ?? '사용자'}</p>
              <p className="truncate text-xs text-[color:var(--muted-foreground)]">{user?.email ?? '로그인 정보 없음'}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2">
              <Link href="/settings?section=store-connections" onClick={onNavigate}>
                <KeyRound className="h-4 w-4" />
                API 설정
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2">
              <Link href="/settings/parse-templates" onClick={onNavigate}>
                <FileCode2 className="h-4 w-4" />
                파싱 템플릿
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void logout()
              }}
              className="gap-2 text-[color:var(--danger-foreground)] focus:text-[color:var(--danger-foreground)]"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
          <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">Seleccase Inventory</p>
        </div>
        <span aria-hidden="true" className="h-11 min-w-11" />
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
            <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-4">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">메뉴</p>
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
