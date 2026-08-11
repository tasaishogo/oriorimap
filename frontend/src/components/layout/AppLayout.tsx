import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header role="banner" className="border-b border-primary-light bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-display text-xl font-bold text-primary-dark">
            OriOriMap
          </Link>
          <nav aria-label="メインナビゲーション" className="flex items-center gap-6 text-sm">
            <Link
              to="/"
              className="flex min-h-11 items-center px-3 text-foreground hover:text-primary"
            >
              検索
            </Link>
            <Link
              to="/maps/new/edit"
              className="flex min-h-11 items-center px-3 text-foreground hover:text-primary"
            >
              地図をつくる
            </Link>
            <Link
              to="/mypage"
              className="flex min-h-11 items-center px-3 text-foreground hover:text-primary"
            >
              マイページ
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
