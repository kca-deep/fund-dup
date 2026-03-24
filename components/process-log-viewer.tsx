"use client";

import { useRef, useEffect } from "react";
import { Terminal } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProcessLogEntry } from "@/lib/types/process-log";

const levelColors: Record<string, string> = {
  info: "text-primary",
  success: "text-safe",
  warning: "text-warning",
  error: "text-danger",
};

const levelLabels: Record<string, string> = {
  info: "INFO",
  success: " OK ",
  warning: "WARN",
  error: " ERR",
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface ProcessLogViewerProps {
  entries: ProcessLogEntry[];
}

export function ProcessLogViewer({ entries }: ProcessLogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="double-bezel h-full">
      <div className="bezel-inner flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 pb-3 border-b border-border/50">
          <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center">
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">처리 로그</h3>
            <p className="text-xs text-muted-foreground">실시간 처리 상태</p>
          </div>
          {entries.length > 0 && (
            <div className="ml-auto">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {entries.length}건
              </span>
            </div>
          )}
        </div>

        {/* Terminal Body */}
        <div className="flex-1 min-h-0 p-3">
          <div
            className="rounded-xl p-4 h-full min-h-[550px] border border-border/30"
            style={{ background: "var(--terminal-bg)" }}
          >
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-16 h-16 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.06] flex items-center justify-center">
                  <Terminal className="h-7 w-7 text-foreground/15" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--terminal-text-dim)" }}>대기 중</p>
                  <p className="text-xs mt-1" style={{ color: "var(--terminal-text-dim)", opacity: 0.6 }}>
                    파일을 업로드하면 처리 로그가 표시됩니다
                  </p>
                </div>
                {/* Decorative blinking cursor */}
                <div className="flex items-center gap-1" style={{ color: "var(--terminal-text-dim)" }}>
                  <span className="text-xs font-mono">$</span>
                  <div className="w-2 h-4 bg-primary/40 animate-pulse rounded-sm" />
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full max-h-[calc(100vh-380px)]">
                <div className="space-y-0.5 font-mono">
                  {entries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="text-xs leading-relaxed animate-fade-in-up"
                      style={{
                        animationDelay: `${Math.min(index * 30, 200)}ms`,
                        animationDuration: "0.3s",
                      }}
                    >
                      <span style={{ color: "var(--terminal-text-dim)" }}>
                        {formatTime(entry.timestamp)}
                      </span>{" "}
                      <span className={levelColors[entry.level]}>
                        [{levelLabels[entry.level]}]
                      </span>{" "}
                      <span style={{ color: "var(--terminal-text)" }}>{entry.message}</span>
                      {entry.detail && (
                        <span style={{ color: "var(--terminal-text-dim)" }}> {entry.detail}</span>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
