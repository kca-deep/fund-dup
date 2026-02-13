"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileUpload, type UploadedFile } from "@/components/file-upload";
import { ProcessLogViewer } from "@/components/process-log-viewer";
import type { CheckResultData } from "@/components/result-dashboard";
import type { ProcessLogEntry, LogEventPayload } from "@/lib/types/process-log";

export default function CheckPage() {
  const router = useRouter();
  const [logEntries, setLogEntries] = useState<ProcessLogEntry[]>([]);

  const addLogEntry = useCallback((payload: LogEventPayload) => {
    const entry: ProcessLogEntry = {
      ...payload,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setLogEntries((prev) => [...prev, entry]);
  }, []);

  const handleUploadComplete = useCallback(
    (uploadedFile: UploadedFile) => {
      if (uploadedFile.result) {
        router.push("/result");
      }
    },
    [router]
  );

  return (
    <div className="space-y-3">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onLogEvent={addLogEntry}
          />
          <div className="p-3 border rounded-lg bg-muted/30">
            <h4 className="text-sm font-medium mb-2">검사 안내</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">1.</span>
                PDF 또는 DOCX 파일을 업로드하세요
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">2.</span>
                시스템이 기존 문서들과 비교 분석합니다
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">3.</span>
                6어절 연속 일치 및 의미 유사도를 검사합니다
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">4.</span>
                상세 결과를 Side-by-Side 뷰어로 확인하세요
              </li>
            </ul>
          </div>
          <div className="p-3 border rounded-lg">
            <h4 className="text-sm font-medium mb-2">표절 판정 기준</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded bg-danger" />
                <span>위험 (DANGER): 6어절 이상 직접 복사</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded bg-warning" />
                <span>주의 (WARNING): 70% 이상 의미 유사</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded bg-safe" />
                <span>안전 (SAFE): 낮은 유사도</span>
              </div>
            </div>
          </div>
        </div>
        <ProcessLogViewer entries={logEntries} />
      </div>
    </div>
  );
}
