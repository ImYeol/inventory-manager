'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from './ui'
import { logout } from '@/app/login/actions'

const navItems = [
  { href: '/', label: '대시보드', icon: '🏠' },
  { href: '/inventory', label: '재고현황', icon: '📦' },
  { href: '/history', label: '이력조회', icon: '🧾' },
  { href: '/master-data', label: '기준 데이터', icon: '🏷️' },
  { href: '/analytics', label: '분석', icon: '📈' },
  { href: '/shipping', label: '운송장', icon: '🚚' },
]

const settingsItem = { href: '/settings', label: '설정', icon: '⚙️' }

type NavProps = {
  user?: {
    name: string
    email: string
  }
}

export default function Nav({ user }: NavProps) {
  const pathname = usePathname()
  const isSettingsActive = pathname.startsWith(settingsItem.href)
  const userInitial = (user?.name?.trim().charAt(0) || user?.email?.trim().charAt(0) || 'U').toUpperCase()

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 border-r border-slate-200 bg-white/95 backdrop-blur md:flex md:flex-col">
        <div className="border-b border-slate-200 px-5 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Inventory Manager
          </p>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
            재고관리 시스템
          </h1>
          <p className="mt-1 text-sm text-slate-500">사용자별 인벤토리 관리</p>
        </div>

        <nav className="flex-1 px-3 py-4" aria-label="주요 메뉴">
          <div className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

                    return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cx(
                    'group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                    isActive
                      ? 'border-slate-200 bg-slate-50 text-slate-950 shadow-[0_1px_1px_rgba(15,23,42,0.03)]'
                      : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx('text-lg transition-colors', isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="mt-auto border-t border-slate-200 px-3 py-4">
          <div className="flex items-center gap-3 px-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-sm">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-950">{user?.name ?? '사용자'}</p>
              <p className="truncate text-xs text-slate-500">{user?.email ?? '로그인 정보 없음'}</p>
            </div>
            <Link
              href={settingsItem.href}
              aria-label={settingsItem.label}
              aria-current={isSettingsActive ? 'page' : undefined}
              className={cx(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                isSettingsActive
                  ? 'border-slate-200 text-slate-950 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-950',
              )}
            >
              <span aria-hidden="true">{settingsItem.icon}</span>
            </Link>
          </div>

          <div className="mt-3 px-3">
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
        <div className="border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="border-b border-slate-200 px-3 py-3">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{user?.name ?? '사용자'}</p>
                <p className="truncate text-xs text-slate-500">{user?.email ?? '로그인 정보 없음'}</p>
              </div>
              <Link
                href={settingsItem.href}
                aria-label={settingsItem.label}
                aria-current={isSettingsActive ? 'page' : undefined}
                className={cx(
                  'inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                  isSettingsActive ? 'border-slate-200 text-slate-950' : 'border-slate-200 text-slate-600',
                )}
              >
                <span aria-hidden="true">{settingsItem.icon}</span>
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>

          <nav className="safe-area-bottom" aria-label="모바일 주요 메뉴">
            <div className="grid grid-cols-6 gap-1 px-2 py-2">
              {navItems.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cx(
                      'flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                      isActive
                        ? 'bg-slate-100 text-slate-950'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx('text-lg transition-colors', isActive ? 'opacity-100' : 'opacity-70')}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
