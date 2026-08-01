"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarNav({ liens }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {liens.map((lien) => {
        const actif = pathname === lien.href || pathname.startsWith(lien.href + "/");
        return (
          <Link
            key={lien.href}
            href={lien.href}
            className={
              "px-3 py-2.5 rounded-md text-sm font-semibold transition-colors " +
              (actif
                ? "bg-ink text-white"
                : "text-sub hover:bg-[#EFEBD8] hover:text-ink")
            }
          >
            {lien.label}
          </Link>
        );
      })}
    </nav>
  );
}
