'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/login/actions'
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
  shortLabel: string
}

const directItems: NavItem[] = [
  { href: '/', label: '대시보드', shortLabel: '대시' },
  { href: '/inventory', label: '재고 운영', shortLabel: '재고' },
  { href: '/shipping', label: '운송장', shortLabel: '운송' },
  { href: '/analytics', label: '분석', shortLabel: '분석' },
  { href: '/integrations', label: '스토어 연결', shortLabel: '연결' },
  { href: '/settings', label: '설정', shortLabel: '설정' },
]

const sourcingItems: NavItem[] = [
  { href: '/sourcing/factories', label: '외부 공장', shortLabel: '공장' },
  { href: '/sourcing/arrivals', label: '입고 예정', shortLabel: '예정' },
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

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cx(
        compact ? ui.navSubItem : ui.navItem,
        isActive && ui.navItemActive,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold',
          isActive ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-200 bg-slate-50 text-slate-500',
        )}
      >
        {item.shortLabel}
      </span>
      <span>{item.label}</span>
    </Link>
  )
}

function SourcingSection({
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  pathname: string
  open: boolean
  onToggle: () => void
  onNavigate?: () => void
}) {
  const isSectionActive = pathname.startsWith('/sourcing')

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="sourcing-navigation-group"
        aria-label="소싱"
        onClick={onToggle}
        className={cx(ui.navSectionButton, isSectionActive && ui.navItemActive)}
      >
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cx(
              'inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold',
              isSectionActive ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-200 bg-slate-50 text-slate-500',
            )}
          >
            소싱
          </span>
          <span>소싱</span>
        </span>
        <span aria-hidden="true" className={cx('text-xs transition-transform', open && 'rotate-180')}>
          ▼
        </span>
      </button>

      {open ? (
        <div id="sourcing-navigation-group" className="space-y-1 border-l border-slate-200 pl-4">
          {sourcingItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} compact onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function NavigationContent({
  pathname,
  sourcingOpen,
  onToggleSourcing,
  user,
  onNavigate,
}: {
  pathname: string
  sourcingOpen: boolean
  onToggleSourcing: () => void
  user?: NavProps['user']
  onNavigate?: () => void
}) {
  const userInitial = (user?.name?.trim().charAt(0) || user?.email?.trim().charAt(0) || 'U').toUpperCase()

  return (
    <>
      <div className="border-b border-slate-200 px-5 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Warehouse Console</p>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">Seleccase Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">재고 운영 허브 중심의 운영 콘솔</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4" aria-label="주요 메뉴">
        {directItems.slice(0, 2).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
        <SourcingSection
          pathname={pathname}
          open={sourcingOpen}
          onToggle={onToggleSourcing}
          onNavigate={onNavigate}
        />
        {directItems.slice(2).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200 px-3 py-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-sm">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-950">{user?.name ?? '사용자'}</p>
            <p className="truncate text-xs text-slate-500">{user?.email ?? '로그인 정보 없음'}</p>
          </div>
        </div>

        <div className="mt-3">
          <form action={logout}>
            <button type="submit" className={cx(ui.buttonSecondary, 'w-full')}>
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
  const sourcingActive = pathname.startsWith('/sourcing')
  const [desktopSourcingOpen, setDesktopSourcingOpen] = useState(true)
  const [mobileSourcingOpen, setMobileSourcingOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-slate-200 bg-white/95 backdrop-blur md:flex md:flex-col">
        <NavigationContent
          pathname={pathname}
          sourcingOpen={sourcingActive || desktopSourcingOpen}
          onToggleSourcing={() => setDesktopSourcingOpen((current) => !current)}
          user={user}
        />
      </aside>

      <div className={ui.mobileTopbar}>
        <button
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className={cx(ui.buttonSecondary, 'h-11 min-w-11 px-3')}
        >
          메뉴
        </button>
        <div className="min-w-0 px-3 text-center">
          <p className="truncate text-sm font-semibold text-slate-950">Seleccase Inventory</p>
          <p className="truncate text-xs text-slate-500">운영 콘솔</p>
        </div>
        <Link href="/settings" aria-label="설정" className={cx(ui.buttonSecondary, 'h-11 min-w-11 px-3')}>
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
              <div>
                <p className="text-sm font-semibold text-slate-950">메뉴</p>
                <p className="text-xs text-slate-500">현재 운영 화면으로 이동</p>
              </div>
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
              sourcingOpen={sourcingActive || mobileSourcingOpen}
              onToggleSourcing={() => setMobileSourcingOpen((current) => !current)}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      ) : null}
    </>
  )
}
