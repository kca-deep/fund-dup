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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

// Deduplicated reference document info
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
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
            <p className="text-muted-foreground">문서를 분석하고 있습니다...</p>
            <p className="text-sm text-muted-foreground mt-1">
              잠시만 기다려주세요
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
            <p>분석 결과가 없습니다</p>
            <p className="text-sm mt-1">문서를 업로드하여 유사도 검사를 시작하세요</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getGradeInfo = (grade: string) => {
    switch (grade) {
      case "DANGER":
        return {
          icon: XCircle,
          color: "text-danger",
          bgColor: "bg-danger-muted",
          label: "위험",
        };
      case "WARNING":
        return {
          icon: AlertTriangle,
          color: "text-warning",
          bgColor: "bg-warning-muted",
          label: "주의",
        };
      default:
        return {
          icon: CheckCircle2,
          color: "text-safe",
          bgColor: "bg-safe-muted",
          label: "안전",
        };
    }
  };

  const gradeInfo = getGradeInfo(result.overallGrade);
  const GradeIcon = gradeInfo.icon;
  const metaInfo = result.metaInfo || {};

  return (
    <div className="space-y-2">
      {/* Summary Card - single row */}
      <Card>
        <CardContent className="py-2">
          <div className="flex items-center gap-2">
            {/* Left: Grade + Project Name + Meta */}
            <div className={cn("p-1 rounded shrink-0", gradeInfo.bgColor)}>
              <GradeIcon className={cn("h-3.5 w-3.5", gradeInfo.color)} />
            </div>
            <span className="text-sm font-semibold truncate min-w-0">
              {metaInfo.projectName || result.filename}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
              OCR
            </Badge>
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground min-w-0">
              {metaInfo.hostOrganization && (
                <span className="flex items-center gap-1 shrink-0">
                  <Building2 className="h-3 w-3" />
                  {metaInfo.hostOrganization}
                </span>
              )}
              {metaInfo.projectManager && (
                <span className="flex items-center gap-1 shrink-0">
                  <User className="h-3 w-3" />
                  {metaInfo.projectManager}
                </span>
              )}
              {metaInfo.budget && metaInfo.budget > 0 && (
                <span className="flex items-center gap-1 text-primary font-medium shrink-0">
                  <Coins className="h-3 w-3" />
                  {formatBudget(metaInfo.budget)}
                </span>
              )}
              {metaInfo.projectPeriod?.start && (
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="h-3 w-3" />
                  {metaInfo.projectPeriod.start.slice(0, 7)}~{metaInfo.projectPeriod.end?.slice(0, 7)}
                </span>
              )}
            </div>
            <div className="flex-1" />
            {/* Right: Similarity + Stats */}
            <div className="flex items-center gap-2 shrink-0 text-xs">
              <Badge className={cn(
                "text-[11px] px-1.5",
                result.overallGrade === "DANGER" && "bg-danger text-danger-foreground",
                result.overallGrade === "WARNING" && "bg-warning text-warning-foreground",
                result.overallGrade === "SAFE" && "bg-safe text-safe-foreground"
              )}>
                {gradeInfo.label}
              </Badge>
              <span className={cn("text-base font-bold tabular-nums", gradeInfo.color)}>
                {Math.round(result.overallSimilarity * 100)}%
              </span>
              <Separator orientation="vertical" className="h-3.5" />
              <span className="text-muted-foreground"><Layers className="h-3 w-3 inline mr-0.5" /><b className="text-foreground">{result.statistics.totalChunks}</b></span>
              <span><Copy className="h-3 w-3 inline mr-0.5 text-danger" /><b className="text-danger">{result.statistics.exactCopyCount}</b></span>
              <span><ArrowLeftRight className="h-3 w-3 inline mr-0.5 text-warning" /><b className="text-warning">{result.statistics.semanticCount}</b></span>
              <span><CheckCircle2 className="h-3 w-3 inline mr-0.5 text-safe" /><b className="text-safe">{result.statistics.cleanCount}</b></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reference Document List - compact horizontal strip */}
      {referenceDocuments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
            <Library className="h-3 w-3" />
            유사문서
          </span>
          {referenceDocuments.map((doc) => {
            const isDanger = doc.plagiarismType === "EXACT_COPY";
            const isWarning = doc.plagiarismType === "SEMANTIC";
            return (
              <HoverCard key={doc.documentId}>
                <HoverCardTrigger
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs shrink-0 transition-colors cursor-pointer",
                    isDanger && "border-danger/30 bg-danger-muted/40 hover:bg-danger-muted/70",
                    isWarning && "border-warning/30 bg-warning-muted/40 hover:bg-warning-muted/70",
                    !isDanger && !isWarning && "border-border bg-muted/40 hover:bg-muted/70",
                  )}
                  onClick={() => {
                    const idx = result.chunks.findIndex(c => c.chunkIndex === doc.firstChunkIndex);
                    setSelectedRefChunkIndex(idx >= 0 ? idx : 0);
                  }}
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    isDanger && "bg-danger",
                    isWarning && "bg-warning",
                    !isDanger && !isWarning && "bg-safe",
                  )} />
                  <span className="truncate max-w-[180px]">{doc.metaInfo?.projectName || doc.filename}</span>
                  <span className={cn(
                    "font-bold",
                    isDanger && "text-danger",
                    isWarning && "text-warning",
                    !isDanger && !isWarning && "text-safe",
                  )}>
                    {Math.round(doc.highestScore * 100)}%
                  </span>
                  <span className="text-muted-foreground">{doc.matchedChunkCount}건</span>
                </HoverCardTrigger>
                {doc.metaInfo && (
                  <HoverCardContent className="w-72" align="start">
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

      {/* Full Document Viewer - Side by Side */}
      <FullDocumentViewer
        sourceFilename={result.filename}
        chunks={result.chunks}
        initialChunkIndex={selectedRefChunkIndex}
      />
    </div>
  );
}
