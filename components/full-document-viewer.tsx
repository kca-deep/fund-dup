"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  FileText,
  Copy,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ArrowDown,
  Building2,
  User,
  Coins,
  Calendar,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { type PlagiarismType, type MatchDetail } from "@/components/similarity-viewer";
import { type BusinessMetaInfo, formatBudget } from "@/lib/types/meta-info";

export interface ChunkResult {
  chunkIndex: number;
  content: string;
  highestScore: number;
  grade: "very_high" | "high" | "medium" | "low";
  plagiarismType: PlagiarismType;
  matches: MatchDetail[];
}

interface FullDocumentViewerProps {
  sourceFilename: string;
  chunks: ChunkResult[];
  initialChunkIndex?: number;
}

function highlightText(
  content: string,
  matchText: string | undefined,
  highlightClass: string
): ReactNode {
  if (!matchText || matchText.length === 0) return content;
  const index = content.indexOf(matchText);
  if (index === -1) return content;
  return (
    <>
      {content.slice(0, index)}
      <mark className={highlightClass}>{matchText}</mark>
      {content.slice(index + matchText.length)}
    </>
  );
}

export function FullDocumentViewer({
  sourceFilename,
  chunks,
  initialChunkIndex,
}: FullDocumentViewerProps) {
  const [selectedChunkIndex, setSelectedChunkIndex] = useState<number>(0);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const chunkRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const selectedChunk = chunks[selectedChunkIndex];
  const selectedMatch = selectedChunk?.matches[0];

  useEffect(() => {
    if (initialChunkIndex !== undefined) {
      setSelectedChunkIndex(initialChunkIndex);
      return;
    }
    const firstMatchIndex = chunks.findIndex((c) => c.matches.length > 0);
    if (firstMatchIndex >= 0) {
      setSelectedChunkIndex(firstMatchIndex);
    }
  }, [chunks, initialChunkIndex]);

  useEffect(() => {
    const el = chunkRefs.current.get(selectedChunkIndex);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedChunkIndex]);

  const handleChunkClick = (index: number) => {
    setSelectedChunkIndex(index);
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getTypeStyles = (type: PlagiarismType) => {
    switch (type) {
      case "EXACT_COPY":
        return {
          bg: "hover:bg-danger/5",
          selectedBg: "bg-danger/10",
          borderLeft: "border-l-danger",
          badgeClass: "bg-danger text-danger-foreground font-bold",
          glowSelected: "shadow-[inset_0_0_20px_oklch(0.65_0.25_25/8%)]",
          icon: Copy,
          label: "복사",
        };
      case "SEMANTIC":
        return {
          bg: "hover:bg-warning/5",
          selectedBg: "bg-warning/10",
          borderLeft: "border-l-warning",
          badgeClass: "bg-warning text-warning-foreground font-bold",
          glowSelected: "shadow-[inset_0_0_20px_oklch(0.75_0.18_70/8%)]",
          icon: ArrowLeftRight,
          label: "유사",
        };
      default:
        return {
          bg: "hover:bg-foreground/[0.02]",
          selectedBg: "bg-foreground/[0.03]",
          borderLeft: "border-l-safe",
          badgeClass: "bg-safe text-safe-foreground",
          glowSelected: "",
          icon: CheckCircle2,
          label: "정상",
        };
    }
  };

  return (
    <div className="double-bezel">
      <div className="bezel-inner overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-border/50">
          <div className="p-4 border-b lg:border-b-0 lg:border-r border-border/50 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">검사 문서</span>
              <span className="text-xs text-muted-foreground ml-2 truncate">{sourceFilename}</span>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">유사 문서</span>
              {selectedMatch ? (
                <DocumentMetaHoverCard filename={selectedMatch.filename} metaInfo={selectedMatch.metaInfo} />
              ) : (
                <span className="text-xs text-muted-foreground ml-2">선택된 매칭 없음</span>
              )}
            </div>
          </div>
        </div>

        {/* Two panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px] max-h-[70vh]">
          {/* Left: Source chunks */}
          <div className="border-b lg:border-b-0 lg:border-r border-border/50">
            <ScrollArea className="h-[500px] lg:h-[70vh]">
              <div className="p-2 space-y-1">
                {chunks.map((chunk, index) => {
                  const styles = getTypeStyles(chunk.plagiarismType);
                  const isSelected = index === selectedChunkIndex;
                  const Icon = styles.icon;
                  const matchText =
                    chunk.plagiarismType === "EXACT_COPY"
                      ? chunk.matches[0]?.sixWordMatch.matchText
                      : undefined;

                  return (
                    <div
                      key={chunk.chunkIndex}
                      ref={(el) => { if (el) chunkRefs.current.set(index, el); }}
                      onClick={() => handleChunkClick(index)}
                      className={cn(
                        "border-l-4 rounded-r-xl p-3 cursor-pointer transition-all duration-500",
                        styles.borderLeft,
                        isSelected ? cn(styles.selectedBg, styles.glowSelected, "ring-1 ring-border") : styles.bg,
                      )}
                      style={{ transitionTimingFunction: "var(--spring-ease)" }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                            {chunk.chunkIndex + 1}
                          </span>
                          <Badge className={cn("text-[10px] px-1.5 py-0", styles.badgeClass)}>
                            <Icon className="h-2.5 w-2.5 mr-0.5" />
                            {Math.round(chunk.highestScore * 100)}%
                          </Badge>
                          {chunk.plagiarismType === "EXACT_COPY" &&
                            chunk.matches[0]?.sixWordMatch.wordCount > 0 && (
                              <span className="text-[10px] text-danger font-medium">
                                {chunk.matches[0].sixWordMatch.wordCount}어절
                              </span>
                            )}
                        </div>
                        {chunk.matches.length > 0 && (
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform duration-300",
                              isSelected && "text-primary rotate-90"
                            )}
                          />
                        )}
                      </div>

                      <p className={cn(
                        "text-sm text-foreground/80 leading-relaxed",
                        !isSelected && "line-clamp-3"
                      )}>
                        {isSelected && matchText
                          ? highlightText(chunk.content, matchText, "bg-danger/20 text-danger rounded px-0.5 no-underline")
                          : chunk.content}
                      </p>

                      {chunk.matches.length > 0 && (
                        <div className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                          <ArrowLeftRight className="h-2.5 w-2.5 shrink-0" />
                          {chunk.matches[0].filename}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Match detail */}
          <div ref={rightPanelRef}>
            <ScrollArea className="h-[500px] lg:h-[70vh]">
              <div className="p-4">
                {selectedMatch ? (
                  <MatchedChunkDetail sourceChunk={selectedChunk} match={selectedMatch} />
                ) : (
                  <div className="h-full flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.06] flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-7 w-7 text-foreground/15" />
                      </div>
                      <p className="text-sm text-foreground/40 font-medium">매칭된 문서가 없습니다</p>
                      <p className="text-xs text-muted-foreground mt-1">이 문단은 유사도가 낮습니다</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

// Document Meta HoverCard
interface DocumentMetaHoverCardProps {
  filename: string;
  metaInfo?: Partial<BusinessMetaInfo>;
  compact?: boolean;
}

function DocumentMetaHoverCard({ filename, metaInfo, compact }: DocumentMetaHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger
        className={cn(
          "cursor-pointer hover:underline decoration-foreground/20",
          compact
            ? "text-[10px] text-muted-foreground flex items-center gap-1"
            : "text-xs text-muted-foreground truncate ml-2"
        )}
      >
        {compact && <ArrowLeftRight className="h-2.5 w-2.5" />}
        {filename}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 glass-strong border-border" align="start">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-xl border border-border">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{filename}</p>
              {metaInfo?.projectName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Sparkles className="h-3 w-3" />
                  {metaInfo.projectName}
                </p>
              )}
            </div>
          </div>
          {metaInfo && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {metaInfo.hostOrganization && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{metaInfo.hostOrganization}</span>
                </div>
              )}
              {metaInfo.projectManager && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>{metaInfo.projectManager}</span>
                </div>
              )}
              {metaInfo.budget && (
                <div className="flex items-center gap-1.5">
                  <Coins className="h-3 w-3 text-muted-foreground" />
                  <span className="text-primary font-medium">{formatBudget(metaInfo.budget)}</span>
                </div>
              )}
              {metaInfo.projectPeriod?.start && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>{metaInfo.projectPeriod.start.slice(0, 7)} ~ {metaInfo.projectPeriod.end?.slice(0, 7)}</span>
                </div>
              )}
            </div>
          )}
          {!metaInfo && <p className="text-xs text-muted-foreground">메타정보가 없습니다</p>}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// Matched Chunk Detail
interface MatchedChunkDetailProps {
  sourceChunk: ChunkResult;
  match: MatchDetail;
}

function MatchedChunkDetail({ sourceChunk, match }: MatchedChunkDetailProps) {
  const [metaOpen, setMetaOpen] = useState(false);

  const getTypeInfo = (type: PlagiarismType) => {
    switch (type) {
      case "EXACT_COPY":
        return {
          color: "text-danger", bgColor: "bg-danger/10 border border-danger/20",
          highlightClass: "bg-danger/25 text-danger rounded px-0.5 no-underline",
          icon: Copy, label: "물리적 복사", shortDesc: "6어절 이상 연속 일치",
        };
      case "SEMANTIC":
        return {
          color: "text-warning", bgColor: "bg-warning/10 border border-warning/20",
          highlightClass: "",
          icon: AlertTriangle, label: "의미적 유사", shortDesc: "말 바꾸기 의심",
        };
      default:
        return {
          color: "text-safe", bgColor: "bg-safe/10 border border-safe/20",
          highlightClass: "",
          icon: CheckCircle2, label: "정상", shortDesc: "유사도 낮음",
        };
    }
  };

  const typeInfo = getTypeInfo(sourceChunk.plagiarismType);
  const TypeIcon = typeInfo.icon;
  const matchText =
    sourceChunk.plagiarismType === "EXACT_COPY"
      ? match.sixWordMatch.matchText
      : undefined;

  return (
    <div className="space-y-4">
      {/* Type header */}
      <div className={cn("flex items-center gap-3 p-4 rounded-2xl", typeInfo.bgColor)}>
        <TypeIcon className={cn("h-5 w-5 shrink-0", typeInfo.color)} />
        <div>
          <span className={cn("text-sm font-semibold", typeInfo.color)}>{typeInfo.label}</span>
          <span className="text-xs text-muted-foreground ml-2">{typeInfo.shortDesc}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {match.sixWordMatch.wordCount > 0 && (
            <Badge className="bg-muted border border-border text-foreground/70 text-[10px] px-2 py-0">
              {match.sixWordMatch.wordCount}어절
            </Badge>
          )}
          <Badge className={cn(
            "text-xs font-bold px-2.5 py-0.5",
            typeInfo.color === "text-danger" ? "bg-danger text-danger-foreground" :
            typeInfo.color === "text-warning" ? "bg-warning text-warning-foreground" :
            "bg-safe text-safe-foreground"
          )}>
            {Math.round(match.semanticScore * 100)}%
          </Badge>
        </div>
      </div>

      {/* Source text */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-medium text-muted-foreground">검사 문서 (문단 {sourceChunk.chunkIndex + 1})</span>
        </div>
        <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
          <p className="text-sm leading-relaxed text-foreground/85">
            {matchText ? highlightText(sourceChunk.content, matchText, typeInfo.highlightClass) : sourceChunk.content}
          </p>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 text-foreground/10">
          <div className="h-px w-10 bg-border" />
          <ArrowDown className="h-4 w-4" />
          <div className="h-px w-10 bg-border" />
        </div>
      </div>

      {/* Target text */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", typeInfo.color.replace("text-", "bg-"))} />
          <span className="text-xs font-medium text-muted-foreground truncate">유사 문서: {match.filename}</span>
        </div>
        <div className={cn("p-4 rounded-2xl", typeInfo.bgColor)}>
          <p className="text-sm leading-relaxed text-foreground/85">
            {matchText ? highlightText(match.content, matchText, typeInfo.highlightClass) : match.content}
          </p>
        </div>
      </div>

      {/* Meta info collapsible */}
      {match.metaInfo && (
        <Collapsible open={metaOpen} onOpenChange={setMetaOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-all py-2 px-3 rounded-xl hover:bg-foreground/[0.03]">
            <Sparkles className="h-3 w-3" />
            <span className="truncate">{match.metaInfo.projectName || match.filename}</span>
            {match.metaInfo.hostOrganization && (
              <span className="hidden sm:inline text-muted-foreground/40">· {match.metaInfo.hostOrganization}</span>
            )}
            {match.metaInfo.budget && (
              <span className="hidden sm:inline text-primary font-medium">· {formatBudget(match.metaInfo.budget)}</span>
            )}
            <ChevronDown className={cn("h-3 w-3 ml-auto shrink-0 transition-transform duration-300", metaOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 bg-foreground/[0.02] border border-border/50 rounded-xl mt-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {match.metaInfo.hostOrganization && (
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{match.metaInfo.hostOrganization}</span>
                )}
                {match.metaInfo.projectManager && (
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{match.metaInfo.projectManager}</span>
                )}
                {match.metaInfo.budget && (
                  <span className="flex items-center gap-1 text-primary font-medium"><Coins className="h-3 w-3" />{formatBudget(match.metaInfo.budget)}</span>
                )}
                {match.metaInfo.projectPeriod?.start && (
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{match.metaInfo.projectPeriod.start.slice(0, 7)} ~ {match.metaInfo.projectPeriod.end?.slice(0, 7)}</span>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Additional Matches */}
      {sourceChunk.matches.length > 1 && (
        <div className="pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">다른 유사 문서 ({sourceChunk.matches.length - 1}건)</p>
          <div className="space-y-1">
            {sourceChunk.matches.slice(1).map((m, idx) => (
              <div key={idx} className="text-xs p-3 bg-foreground/[0.02] border border-border/50 rounded-xl flex items-center justify-between">
                <DocumentMetaHoverCard filename={m.filename} metaInfo={m.metaInfo} compact />
                <Badge className="bg-muted border border-border text-foreground/70 text-[10px]">
                  {Math.round(m.semanticScore * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
