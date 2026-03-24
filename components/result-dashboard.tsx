"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  BarChart3,
  Copy,
  ArrowLeftRight,
  Layers,
  Building2,
  Coins,
  Calendar,
  User,
  Sparkles,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { type PlagiarismType } from "@/components/similarity-viewer";
import { FullDocumentViewer, type ChunkResult } from "@/components/full-document-viewer";
import { type BusinessMetaInfo, formatBudget } from "@/lib/types/meta-info";

export type { ChunkResult };

export interface CheckResultData {
  documentId: string;
  filename: string;
  overallSimilarity: number;
  overallGrade: "DANGER" | "WARNING" | "SAFE";
  metaInfo?: Partial<BusinessMetaInfo>;
  statistics: {
    totalChunks: number;
    exactCopyCount: number;
    semanticCount: number;
    cleanCount: number;
  };
  chunks: ChunkResult[];
}

interface ResultDashboardProps {
  result: CheckResultData | null;
  isLoading?: boolean;
}

interface ReferenceDocument {
  documentId: string;
  filename: string;
  highestScore: number;
  plagiarismType: PlagiarismType;
  matchedChunkCount: number;
  firstChunkIndex: number;
  metaInfo?: Partial<BusinessMetaInfo>;
}

function extractReferenceDocuments(chunks: ChunkResult[]): ReferenceDocument[] {
  const docMap = new Map<string, ReferenceDocument>();

  for (const chunk of chunks) {
    for (const match of chunk.matches) {
      const existing = docMap.get(match.documentId);
      if (existing) {
        existing.matchedChunkCount++;
        if (match.finalScore > existing.highestScore) {
          existing.highestScore = match.finalScore;
          existing.plagiarismType = match.finalType;
        }
      } else {
        docMap.set(match.documentId, {
          documentId: match.documentId,
          filename: match.filename,
          highestScore: match.finalScore,
          plagiarismType: match.finalType,
          matchedChunkCount: 1,
          firstChunkIndex: chunk.chunkIndex,
          metaInfo: match.metaInfo,
        });
      }
    }
  }

  return Array.from(docMap.values()).sort((a, b) => b.highestScore - a.highestScore);
}

export function ResultDashboard({ result, isLoading }: ResultDashboardProps) {
  const [selectedRefChunkIndex, setSelectedRefChunkIndex] = useState<number | undefined>(undefined);

  const referenceDocuments = useMemo(
    () => (result ? extractReferenceDocuments(result.chunks) : []),
    [result]
  );

  if (isLoading) {
    return (
      <div className="double-bezel">
        <div className="bezel-inner py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 animate-pulse">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <p className="text-foreground font-medium">문서를 분석하고 있습니다...</p>
            <p className="text-sm text-muted-foreground mt-1">잠시만 기다려주세요</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="double-bezel">
        <div className="bezel-inner py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.06] flex items-center justify-center mb-4">
              <BarChart3 className="h-7 w-7 text-foreground/15" />
            </div>
            <p className="text-foreground/60 font-medium">분석 결과가 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">문서를 업로드하여 유사도 검사를 시작하세요</p>
          </div>
        </div>
      </div>
    );
  }

  const getGradeInfo = (grade: string) => {
    switch (grade) {
      case "DANGER":
        return { icon: XCircle, color: "text-danger", glowClass: "glow-danger", label: "위험", bgClass: "bg-danger/10 border-danger/20" };
      case "WARNING":
        return { icon: AlertTriangle, color: "text-warning", glowClass: "glow-warning", label: "주의", bgClass: "bg-warning/10 border-warning/20" };
      default:
        return { icon: CheckCircle2, color: "text-safe", glowClass: "glow-safe", label: "안전", bgClass: "bg-safe/10 border-safe/20" };
    }
  };

  const gradeInfo = getGradeInfo(result.overallGrade);
  const GradeIcon = gradeInfo.icon;
  const metaInfo = result.metaInfo || {};

  return (
    <div className="space-y-4">
      {/* Summary Header — Full-bleed glass card with ambient glow */}
      <div className={cn("double-bezel animate-fade-in-up", gradeInfo.glowClass)}>
        <div className="bezel-inner p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Left: Grade + Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={cn("p-3 rounded-2xl border shrink-0", gradeInfo.bgClass)}>
                <GradeIcon className={cn("h-6 w-6", gradeInfo.color)} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-foreground truncate">
                    {metaInfo.projectName || result.filename}
                  </h2>
                  <Badge className="bg-muted border border-border text-foreground/60 text-[10px] px-2 py-0 shrink-0">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                    OCR
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {metaInfo.hostOrganization && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {metaInfo.hostOrganization}
                    </span>
                  )}
                  {metaInfo.projectManager && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {metaInfo.projectManager}
                    </span>
                  )}
                  {metaInfo.budget && metaInfo.budget > 0 && (
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Coins className="h-3 w-3" />
                      {formatBudget(metaInfo.budget)}
                    </span>
                  )}
                  {metaInfo.projectPeriod?.start && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {metaInfo.projectPeriod.start.slice(0, 7)}~{metaInfo.projectPeriod.end?.slice(0, 7)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Score + Stats */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Grade badge + Similarity */}
              <div className="text-right">
                <Badge className={cn(
                  "text-xs px-3 py-1 mb-1",
                  result.overallGrade === "DANGER" && "bg-danger text-danger-foreground",
                  result.overallGrade === "WARNING" && "bg-warning text-warning-foreground",
                  result.overallGrade === "SAFE" && "bg-safe text-safe-foreground"
                )}>
                  {gradeInfo.label}
                </Badge>
                <div className={cn("text-3xl font-bold tabular-nums animate-count-up", gradeInfo.color)}>
                  {Math.round(result.overallSimilarity * 100)}%
                </div>
              </div>

              {/* Stats mini cards */}
              <div className="hidden sm:grid grid-cols-2 gap-2">
                <StatMini icon={Layers} value={result.statistics.totalChunks} label="전체" color="text-foreground" />
                <StatMini icon={Copy} value={result.statistics.exactCopyCount} label="복사" color="text-danger" />
                <StatMini icon={ArrowLeftRight} value={result.statistics.semanticCount} label="유사" color="text-warning" />
                <StatMini icon={CheckCircle2} value={result.statistics.cleanCount} label="정상" color="text-safe" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Document List — Horizontal glass pills */}
      {referenceDocuments.length > 0 && (
        <div className="animate-fade-in-up stagger-1 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5 mr-1">
            <Library className="h-3.5 w-3.5" />
            유사문서
          </span>
          {referenceDocuments.map((doc) => {
            const isDanger = doc.plagiarismType === "EXACT_COPY";
            const isWarning = doc.plagiarismType === "SEMANTIC";
            return (
              <HoverCard key={doc.documentId}>
                <HoverCardTrigger
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs shrink-0 transition-all duration-500 cursor-pointer glass-card hover-lift",
                    isDanger && "border-danger/20 shadow-[0_0_12px_oklch(0.65_0.25_25/10%)]",
                    isWarning && "border-warning/20 shadow-[0_0_12px_oklch(0.75_0.18_70/10%)]",
                    !isDanger && !isWarning && "border-safe/20",
                  )}
                  style={{ transitionTimingFunction: "var(--spring-ease)" }}
                  onClick={() => {
                    const idx = result.chunks.findIndex(c => c.chunkIndex === doc.firstChunkIndex);
                    setSelectedRefChunkIndex(idx >= 0 ? idx : 0);
                  }}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isDanger && "bg-danger shadow-[0_0_6px_oklch(0.65_0.25_25/50%)]",
                    isWarning && "bg-warning shadow-[0_0_6px_oklch(0.75_0.18_70/50%)]",
                    !isDanger && !isWarning && "bg-safe shadow-[0_0_6px_oklch(0.72_0.2_155/50%)]",
                  )} />
                  <span className="truncate max-w-[180px] text-foreground/80">{doc.metaInfo?.projectName || doc.filename}</span>
                  <span className={cn(
                    "font-bold tabular-nums",
                    isDanger && "text-danger",
                    isWarning && "text-warning",
                    !isDanger && !isWarning && "text-safe",
                  )}>
                    {Math.round(doc.highestScore * 100)}%
                  </span>
                  <span className="text-muted-foreground">{doc.matchedChunkCount}건</span>
                </HoverCardTrigger>
                {doc.metaInfo && (
                  <HoverCardContent className="w-72 glass-strong border-border" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{doc.filename}</span>
                      </div>
                      {doc.metaInfo.projectName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {doc.metaInfo.projectName}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {doc.metaInfo.hostOrganization && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="h-3 w-3" />{doc.metaInfo.hostOrganization}
                          </span>
                        )}
                        {doc.metaInfo.projectManager && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />{doc.metaInfo.projectManager}
                          </span>
                        )}
                        {doc.metaInfo.budget && (
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <Coins className="h-3 w-3" />{formatBudget(doc.metaInfo.budget)}
                          </span>
                        )}
                        {doc.metaInfo.projectPeriod?.start && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {doc.metaInfo.projectPeriod.start.slice(0, 7)} ~ {doc.metaInfo.projectPeriod.end?.slice(0, 7)}
                          </span>
                        )}
                      </div>
                    </div>
                  </HoverCardContent>
                )}
              </HoverCard>
            );
          })}
        </div>
      )}

      {/* Full Document Viewer */}
      <div className="animate-fade-in-up stagger-2">
        <FullDocumentViewer
          sourceFilename={result.filename}
          chunks={result.chunks}
          initialChunkIndex={selectedRefChunkIndex}
        />
      </div>
    </div>
  );
}

function StatMini({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06]">
      <Icon className={cn("h-3 w-3", color)} />
      <span className={cn("text-sm font-bold tabular-nums", color)}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
