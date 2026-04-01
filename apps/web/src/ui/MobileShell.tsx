"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { auth } from "@/lib/auth";
import { useAuth } from "@/lib/useAuth";
import { signOutSupabase } from "@/lib/supabase/auth";
import { PageTransition } from "./motion/PageTransition";
import { Modal } from "./motion/Modal";
import { ApiOfflineBanner } from "./ApiOfflineBanner";

function TopBar({
  locale,
  title
}: {
  locale: string;
  title?: string;
}) {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const a = useAuth();
  const isAuthed = !!a.user || !!a.accessToken;
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-brand-500/15 ring-1 ring-brand-500/40" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white/95">KPBF REC</div>
            <div className="text-[11px] text-white/60">{title ?? "Kazakhstan boxing"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/search`}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/90 ring-1 ring-white/10"
          >
            Search
          </Link>
          {isAuthed ? (
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/90 ring-1 ring-white/10"
            >
              Logout
            </button>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/90 ring-1 ring-white/10"
            >
              Login
            </Link>
          )}
        </div>
      </div>

      <Modal open={logoutOpen} title="Sign out?" onClose={() => setLogoutOpen(false)}>
        <div className="text-sm text-white/70">
          You will need to sign in again to access admin features.
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setLogoutOpen(false)}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 ring-1 ring-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              setLogoutOpen(false);
              await signOutSupabase();
              auth.clear();
              router.push(`/${locale}/login`);
            }}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-[#062034]"
          >
            Sign out
          </button>
        </div>
      </Modal>
    </header>
  );
}

function BottomNav({ locale }: { locale: string }) {
  const base = `/${locale}`;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0b1220]/90 backdrop-blur">
      <div className="flex items-center justify-around px-2 py-2">
        <Link href={`${base}`} className="text-[11px] text-white/75">
          Home
        </Link>
        <Link href={`${base}/fighters`} className="text-[11px] text-white/75">
          Fighters
        </Link>
        <Link href={`${base}/events`} className="text-[11px] text-white/75">
          Events
        </Link>
        <Link href={`${base}/fights`} className="text-[11px] text-white/75">
          Fights
        </Link>
        <Link href={`${base}/rankings`} className="text-[11px] text-white/75">
          Rank
        </Link>
        <Link
          href={`${base}/methodology`}
          className="text-[11px] text-white/75"
        >
          Method
        </Link>
        <Link href={`${base}/admin`} className="text-[11px] text-white/75">
          Admin
        </Link>
      </div>
    </nav>
  );
}

export function MobileShell({
  locale,
  children
}: {
  locale: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  return (
    <div className="min-h-screen pb-[72px]">
      <TopBar locale={locale} />
      <main className="mx-auto w-full max-w-2xl px-4 pt-4">
        <ApiOfflineBanner />
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition routeKey={pathname}>{children}</PageTransition>
        </AnimatePresence>
      </main>
      <BottomNav locale={locale} />
    </div>
  );
}

