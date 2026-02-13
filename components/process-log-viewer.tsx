"use client";

import { useRef, useEffect } from "react";
import { Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProcessLogEntry } from "@/lib/types/process-log";

const levelColors: Record<string, string> = {
  info: "text-primary",
  success: "text-safe",
  warning: "text-warning",
  error: "text-destructive",
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
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          처리 로그
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="bg-neutral-950 rounded-lg p-3 h-full min-h-[600px]">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-500">
              <Terminal className="h-10 w-10" />
              <p className="text-sm">
                파일을 업로드하면 처리 로그가 표시됩니다
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full max-h-[calc(100vh-320px)]">
              <div className="space-y-0.5 font-mono">
                {entries.map((entry) => (
                  <div key={entry.id} className="text-xs leading-relaxed">
                    <span className="text-neutral-500">
                      {formatTime(entry.timestamp)}
                    </span>{" "}
                    <span className={levelColors[entry.level]}>
                      [{levelLabels[entry.level]}]
                    </span>{" "}
                    <span className="text-neutral-200">{entry.message}</span>
                    {entry.detail && (
                      <span className="text-neutral-500"> {entry.detail}</span>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
