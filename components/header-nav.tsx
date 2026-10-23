"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClass =
  "text-sm font-medium text-forest underline-offset-2 hover:underline";

export function HeaderNav() {
  const pathname = usePathname();

  if (pathname === "/onboarding") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Link href="/" className={linkClass}>
          Today
        </Link>
      </div>
    );
  }

  if (pathname === "/history") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Link href="/" className={linkClass}>
          Today
        </Link>
        <Link href="/onboarding" className={linkClass}>
          Edit targets
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 pt-1">
      <Link href="/onboarding" className={linkClass}>
        Edit targets
      </Link>
    </div>
  );
}
