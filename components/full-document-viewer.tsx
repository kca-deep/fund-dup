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

// Utility: highlight matchText within content
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

  // Auto-select first chunk with matches (or initialChunkIndex)
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

  // Scroll left panel to the selected chunk
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

  // Navigate to a specific chunk (used by external reference list)
  const scrollToChunk = (index: number) => {
    setSelectedChunkIndex(index);
    const el = chunkRefs.current.get(index);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const getTypeStyles = (type: PlagiarismType) => {
    switch (type) {
      case "EXACT_COPY":
        return {
          bg: "hover:bg-danger-muted/30",
          selectedBg: "bg-danger-muted/60",
          borderLeft: "border-l-danger",
          badgeClass: "bg-danger text-danger-foreground font-bold",
          icon: Copy,
          label: "복사",
        };
      case "SEMANTIC":
        return {
          bg: "hover:bg-warning-muted/30",
          selectedBg: "bg-warning-muted/60",
          borderLeft: "border-l-warning",
          badgeClass: "bg-warning text-warning-foreground font-bold",
          icon: ArrowLeftRight,
          label: "유사",
        };
      default:
        return {
          bg: "hover:bg-muted/50",
          selectedBg: "bg-muted/40",
          borderLeft: "border-l-safe",
          badgeClass: "bg-safe text-safe-foreground",
          icon: CheckCircle2,
          label: "정상",
        };
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header: File names */}
      <div className="grid grid-cols-1 lg:grid-cols-2 border-b bg-muted/30">
        <div className="p-3 border-b lg:border-b-0 lg:border-r flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">검사 문서</span>
          <span className="text-xs text-muted-foreground truncate">
            {sourceFilename}
          </span>
        </div>
        <div className="p-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">유사 문서</span>
          {selectedMatch ? (
            <DocumentMetaHoverCard
              filename={selectedMatch.filename}
              metaInfo={selectedMatch.metaInfo}
            />
          ) : (
            <span className="text-xs text-muted-foreground">선택된 매칭 없음</span>
          )}
        </div>
      </div>

      {/* Content: Two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px] max-h-[70vh]">
        {/* Left Panel: Source Document Chunks */}
        <div className="border-b lg:border-b-0 lg:border-r">
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
                    ref={(el) => {
                      if (el) chunkRefs.current.set(index, el);
                    }}
                    onClick={() => handleChunkClick(index)}
                    className={cn(
                      "border-l-4 rounded-r-lg p-3 cursor-pointer transition-all",
                      styles.borderLeft,
                      isSelected ? styles.selectedBg : styles.bg,
                      isSelected && "ring-2 ring-primary/30 shadow-sm",
                    )}
                  >
                    {/* Chunk Header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
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
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isSelected && "text-primary rotate-90"
                          )}
                        />
                      )}
                    </div>

                    {/* Content - full text when selected, clamped otherwise */}
                    <p
                      className={cn(
                        "text-sm text-foreground/90 leading-relaxed",
                        !isSelected && "line-clamp-3"
                      )}
                    >
                      {isSelected && matchText
                        ? highlightText(
                            chunk.content,
                            matchText,
                            "bg-danger/20 text-danger rounded px-0.5 no-underline"
                          )
                        : chunk.content}
                    </p>

                    {/* Match filename */}
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

        {/* Right Panel: Matched Document Chunk */}
        <div ref={rightPanelRef}>
          <ScrollArea className="h-[500px] lg:h-[70vh]">
            <div className="p-3">
              {selectedMatch ? (
                <MatchedChunkDetail
                  sourceChunk={selectedChunk}
                  match={selectedMatch}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground py-20">
                  <div className="text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">매칭된 문서가 없습니다</p>
                    <p className="text-xs mt-1">이 문단은 유사도가 낮습니다</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

// Document Meta Info HoverCard
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
          "cursor-pointer hover:underline",
          compact
            ? "text-[10px] text-muted-foreground flex items-center gap-1"
            : "text-xs text-muted-foreground truncate"
        )}
      >
        {compact && <ArrowLeftRight className="h-2.5 w-2.5" />}
        {filename}
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
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
                  <span>
                    {metaInfo.projectPeriod.start.slice(0, 7)} ~ {metaInfo.projectPeriod.end?.slice(0, 7)}
                  </span>
                </div>
              )}
            </div>
          )}
          {!metaInfo && (
            <p className="text-xs text-muted-foreground">메타정보가 없습니다</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// Sub-component: Matched Chunk Detail (simplified)
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
          color: "text-danger",
          bgColor: "bg-danger-muted",
          borderColor: "border-danger/30",
          highlightClass: "bg-danger/25 text-danger rounded px-0.5 no-underline",
          icon: Copy,
          label: "물리적 복사",
          shortDesc: "6어절 이상 연속 일치",
        };
      case "SEMANTIC":
        return {
          color: "text-warning",
          bgColor: "bg-warning-muted",
          borderColor: "border-warning/30",
          highlightClass: "",
          icon: AlertTriangle,
          label: "의미적 유사",
          shortDesc: "말 바꾸기 의심",
        };
      default:
        return {
          color: "text-safe",
          bgColor: "bg-safe-muted",
          borderColor: "border-safe/30",
          highlightClass: "",
          icon: CheckCircle2,
          label: "정상",
          shortDesc: "유사도 낮음",
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
    <div className="space-y-3">
      {/* Compact header: 1 line with type + score + word count */}
      <div className={cn("flex items-center gap-2 p-3 rounded-lg", typeInfo.bgColor)}>
        <TypeIcon className={cn("h-4 w-4 shrink-0", typeInfo.color)} />
        <span className={cn("text-sm font-semibold", typeInfo.color)}>
          {typeInfo.label}
        </span>
        <span className="text-xs text-muted-foreground">{typeInfo.shortDesc}</span>
        <div className="ml-auto flex items-center gap-2">
          {match.sixWordMatch.wordCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {match.sixWordMatch.wordCount}어절
            </Badge>
          )}
          <Badge className={cn("text-xs font-bold px-2 py-0.5", typeInfo.color === "text-danger" ? "bg-danger text-danger-foreground" : typeInfo.color === "text-warning" ? "bg-warning text-warning-foreground" : "bg-safe text-safe-foreground")}>
            {Math.round(match.semanticScore * 100)}%
          </Badge>
        </div>
      </div>

      {/* Source text with inline highlighting */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            검사 문서 (문단 {sourceChunk.chunkIndex + 1})
          </span>
        </div>
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm leading-relaxed">
            {matchText
              ? highlightText(sourceChunk.content, matchText, typeInfo.highlightClass)
              : sourceChunk.content}
          </p>
        </div>
      </div>

      {/* Arrow separator */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 text-muted-foreground/50">
          <div className="h-px w-8 bg-border" />
          <ArrowDown className="h-4 w-4" />
          <div className="h-px w-8 bg-border" />
        </div>
      </div>

      {/* Target text with inline highlighting */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", typeInfo.color.replace("text-", "bg-"))} />
          <span className="text-xs font-medium text-muted-foreground truncate">
            유사 문서: {match.filename}
          </span>
        </div>
        <div className={cn("p-3 border rounded-lg", typeInfo.bgColor, typeInfo.borderColor)}>
          <p className="text-sm leading-relaxed">
            {matchText
              ? highlightText(match.content, matchText, typeInfo.highlightClass)
              : match.content}
          </p>
        </div>
      </div>

      {/* Meta info - collapsible 1-line summary */}
      {match.metaInfo && (
        <Collapsible open={metaOpen} onOpenChange={setMetaOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            <Sparkles className="h-3 w-3" />
            <span className="truncate">
              {match.metaInfo.projectName || match.filename}
            </span>
            {match.metaInfo.hostOrganization && (
              <span className="hidden sm:inline">· {match.metaInfo.hostOrganization}</span>
            )}
            {match.metaInfo.budget && (
              <span className="hidden sm:inline text-primary font-medium">
                · {formatBudget(match.metaInfo.budget)}
              </span>
            )}
            <ChevronDown className={cn("h-3 w-3 ml-auto shrink-0 transition-transform", metaOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 bg-muted/50 rounded-lg mt-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {match.metaInfo.hostOrganization && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {match.metaInfo.hostOrganization}
                  </span>
                )}
                {match.metaInfo.projectManager && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {match.metaInfo.projectManager}
                  </span>
                )}
                {match.metaInfo.budget && (
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <Coins className="h-3 w-3" />
                    {formatBudget(match.metaInfo.budget)}
                  </span>
                )}
                {match.metaInfo.projectPeriod?.start && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {match.metaInfo.projectPeriod.start.slice(0, 7)} ~ {match.metaInfo.projectPeriod.end?.slice(0, 7)}
                  </span>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Additional Matches */}
      {sourceChunk.matches.length > 1 && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            다른 유사 문서 ({sourceChunk.matches.length - 1}건)
          </p>
          <div className="space-y-1">
            {sourceChunk.matches.slice(1).map((m, idx) => (
              <div
                key={idx}
                className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between"
              >
                <DocumentMetaHoverCard
                  filename={m.filename}
                  metaInfo={m.metaInfo}
                  compact
                />
                <Badge variant="outline" className="text-[10px]">
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
