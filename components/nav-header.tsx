"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSearch, Upload, FolderOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "유사도검증", shortLabel: "검증", icon: Upload },
  { href: "/result", label: "AI검증결과", shortLabel: "검증결과", icon: FileSearch },
  { href: "/docu", label: "문서관리", shortLabel: "문서", icon: FolderOpen },
] as const;

export function NavHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 items-center px-4">
        <Link href="/" className="flex items-center gap-2 mr-6">
          <FileSearch className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline leading-tight">
            <span className="font-semibold text-base block">ICT기금 중복수급</span>
            <span className="text-[10px] text-muted-foreground block">AI기반 유사도검증</span>
          </span>
        </Link>

        <nav className="flex-1 flex justify-center gap-0 h-12">
          {navItems.map(({ href, label, shortLabel, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 h-12 text-xs font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <button className="p-2 rounded-lg hover:bg-muted transition-colors">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
