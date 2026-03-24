"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSearch, Upload, FolderOpen, Settings, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

const navItems = [
  { href: "/", label: "유사도검증", icon: Upload },
  { href: "/result", label: "AI검증결과", icon: FileSearch },
  { href: "/docu", label: "문서관리", icon: FolderOpen },
] as const;

export function NavHeader() {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <nav className="glass-strong rounded-full px-2 py-1.5 flex items-center gap-1 shadow-lg shadow-black/10">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full hover:bg-foreground/5 transition-all duration-500"
          style={{ transitionTimingFunction: "var(--spring-ease)" }}
        >
          <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
            <FileSearch className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="hidden sm:block text-sm font-semibold text-foreground/90 tracking-tight">
            ICT 유사도검증
          </span>
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Nav Items */}
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-500",
                isActive
                  ? "bg-foreground/8 text-foreground shadow-inner shadow-foreground/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
              style={{ transitionTimingFunction: "var(--spring-ease)" }}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-500"
          style={{ transitionTimingFunction: "var(--spring-ease)" }}
          title={resolvedTheme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Settings */}
        <button
          className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-500"
          style={{ transitionTimingFunction: "var(--spring-ease)" }}
        >
          <Settings className="h-4 w-4" />
        </button>
      </nav>
    </header>
  );
}
