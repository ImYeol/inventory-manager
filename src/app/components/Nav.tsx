'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from './ui'

const navItems = [
  { href: '/', label: '재고현황' },
  { href: '/inout', label: '입출고' },
  { href: '/adjust', label: '재고조정' },
  { href: '/history', label: '이력' },
  { href: '/shipping', label: '운송장' },
  { href: '/analytics', label: '분석' },
]

export default function Nav() {
  const pathname = usePathname()

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
                    className={cx(
                      'h-2 w-2 rounded-full transition-colors',
                      isActive ? 'bg-slate-900' : 'bg-slate-300 group-hover:bg-slate-500',
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </aside>

      <nav
        className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
        aria-label="모바일 주요 메뉴"
      >
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
                  isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx('h-1.5 w-1.5 rounded-full', isActive ? 'bg-slate-900' : 'bg-slate-300')}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
