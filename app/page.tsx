"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileUpload, type UploadedFile } from "@/components/file-upload";
import { ProcessLogViewer } from "@/components/process-log-viewer";
import type { ProcessLogEntry, LogEventPayload } from "@/lib/types/process-log";
import { Shield, Layers, Sparkles, ArrowRight } from "lucide-react";

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
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="animate-fade-in-up">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4">AI 문서 유사도 검증</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-foreground mb-4">
            사업계획서 유사도를
            <br />
            <span className="text-primary">3분 만에</span> 검증하세요
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
            ICT기금 중복수급 방지를 위한 AI 기반 문서 분석 시스템.
            6어절 규칙 매칭과 의미 유사도 분석을 통해 정확한 표절 여부를 판별합니다.
          </p>
        </div>
      </section>

      {/* Main Content: Upload + Log */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6 animate-fade-in-up stagger-1">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onLogEvent={addLogEntry}
          />

          {/* 3-Phase Bento Cards */}
          <div className="grid grid-cols-3 gap-3">
            <PhaseCard
              icon={<Layers className="h-5 w-5" />}
              phase="Phase 0"
              title="MinHash 사전필터"
              description="1,000+ 문서를 수 ms 내 ~50건으로 압축"
              color="primary"
              delay="stagger-2"
            />
            <PhaseCard
              icon={<Shield className="h-5 w-5" />}
              phase="Phase 1"
              title="6어절 규칙 매칭"
              description="연속 6어절 이상 일치 시 물리적 복사 판정"
              color="danger"
              delay="stagger-3"
            />
            <PhaseCard
              icon={<Sparkles className="h-5 w-5" />}
              phase="Phase 2"
              title="AI 의미 유사도"
              description="BGE-M3 하이브리드 벡터 검색 기반 분석"
              color="warning"
              delay="stagger-4"
            />
          </div>

          {/* Plagiarism Criteria */}
          <div className="scroll-reveal glass-card rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              표절 판정 기준
            </h4>
            <div className="space-y-2.5">
              <CriteriaItem
                color="bg-danger"
                glow="shadow-[0_0_12px_oklch(0.65_0.25_25/30%)]"
                label="위험 (DANGER)"
                desc="6어절 이상 직접 복사 → 유사도 100%"
              />
              <CriteriaItem
                color="bg-warning"
                glow="shadow-[0_0_12px_oklch(0.75_0.18_70/30%)]"
                label="주의 (WARNING)"
                desc="70% 이상 의미 유사 → 말 바꾸기 의심"
              />
              <CriteriaItem
                color="bg-safe"
                glow="shadow-[0_0_12px_oklch(0.72_0.2_155/30%)]"
                label="안전 (SAFE)"
                desc="50% 미만 유사도 → 독창적 작성"
              />
            </div>
          </div>
        </div>

        <div className="animate-fade-in-up stagger-2">
          <ProcessLogViewer entries={logEntries} />
        </div>
      </div>
    </div>
  );
}

function PhaseCard({
  icon,
  phase,
  title,
  description,
  color,
  delay,
}: {
  icon: React.ReactNode;
  phase: string;
  title: string;
  description: string;
  color: "primary" | "danger" | "warning";
  delay: string;
}) {
  const colorMap = {
    primary: "text-primary border-primary/20 bg-primary/5",
    danger: "text-danger border-danger/20 bg-danger/5",
    warning: "text-warning border-warning/20 bg-warning/5",
  };

  return (
    <div className={`scroll-reveal ${delay} glass-card rounded-2xl p-4 hover-lift`}>
      <div className={`inline-flex p-2 rounded-xl border mb-3 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
        {phase}
      </div>
      <h5 className="text-sm font-semibold text-foreground mb-1">{title}</h5>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function CriteriaItem({
  color,
  glow,
  label,
  desc,
}: {
  color: string;
  glow: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color} ${glow} shrink-0`} />
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground ml-2">{desc}</span>
      </div>
    </div>
  );
}
