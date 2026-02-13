"use client";

import dynamic from "next/dynamic";
import { AlertTriangle, Copy, FileText, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type BusinessMetaInfo } from "@/lib/types/meta-info";

// Dynamic import for react-diff-viewer to avoid SSR issues
const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4 p-8">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-5/6" />
    </div>
  ),
});

export type PlagiarismType = "EXACT_COPY" | "SEMANTIC" | "CLEAN";
export type SimilarityGrade = "very_high" | "high" | "medium" | "low";

export interface MatchDetail {
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  semanticScore: number;
  sixWordMatch: {
    isPlagiarism: boolean;
    matchText: string;
    wordCount: number;
  };
  finalType: PlagiarismType;
  finalScore: number;
  metaInfo?: Partial<BusinessMetaInfo>;
}

interface SimilarityViewerProps {
  sourceText: string;
  sourceFilename?: string;
  targetText: string;
  targetFilename?: string;
  similarity: number;
  type: PlagiarismType;
  matchedWords?: string;
  wordCount?: number;
}

export function SimilarityViewer({
  sourceText,
  sourceFilename = "검사 문서",
  targetText,
  targetFilename = "유사 문서",
  similarity,
  type,
  matchedWords,
  wordCount,
}: SimilarityViewerProps) {
  const getTypeStyles = () => {
    switch (type) {
      case "EXACT_COPY":
        return {
          border: "border-l-danger",
          bg: "bg-danger-muted",
          badgeBg: "bg-danger text-danger-foreground hover:bg-danger/90",
          icon: Copy,
        };
      case "SEMANTIC":
        return {
          border: "border-l-warning",
          bg: "bg-warning-muted",
          badgeBg: "bg-warning text-warning-foreground hover:bg-warning/90",
          icon: AlertTriangle,
        };
      default:
        return {
          border: "border-l-safe",
          bg: "bg-safe-muted",
          badgeBg: "bg-safe text-safe-foreground hover:bg-safe/90",
          icon: FileText,
        };
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case "EXACT_COPY":
        return "물리적 복사 (6어절 이상 일치)";
      case "SEMANTIC":
        return "의미적 유사 (말 바꾸기 의심)";
      default:
        return "유사도 낮음";
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  return (
    <div className={cn("border-l-4 rounded-lg overflow-hidden", styles.border)}>
      {/* Header */}
      <div className={cn("p-4", styles.bg)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconComponent className="h-6 w-6 shrink-0" />
            <span className="text-base font-semibold">{getTypeLabel()}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-sm px-3 py-1", styles.badgeBg)}>
              유사도 {Math.round(similarity * 100)}%
            </Badge>
            {type === "EXACT_COPY" && wordCount && wordCount > 0 && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                {wordCount}어절 일치
              </Badge>
            )}
          </div>
        </div>
        {matchedWords && matchedWords.length > 0 && (
          <div className="mt-3 p-3 bg-background/60 rounded-md">
            <span className="font-medium text-danger text-sm">일치 문구: </span>
            <span className="text-sm text-foreground/80">&quot;{matchedWords}&quot;</span>
          </div>
        )}
      </div>

      {/* File Labels */}
      <div className="grid grid-cols-2 border-y border-border">
        <div className="p-3 text-center border-r border-border bg-muted/30">
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{sourceFilename}</span>
          </div>
          <span className="text-xs text-muted-foreground">검사 문서</span>
        </div>
        <div className="p-3 text-center bg-muted/30">
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{targetFilename}</span>
          </div>
          <span className="text-xs text-muted-foreground">유사 문서</span>
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="diff-viewer-container">
        <ReactDiffViewer
          oldValue={sourceText}
          newValue={targetText}
          splitView={true}
          showDiffOnly={false}
          hideLineNumbers={false}
          useDarkTheme={false}
          styles={{
            variables: {
              light: {
                diffViewerBackground: "var(--background)",
                diffViewerColor: "var(--foreground)",
                addedBackground: "var(--diff-added)",
                addedColor: "var(--foreground)",
                removedBackground: "var(--diff-removed)",
                removedColor: "var(--foreground)",
                wordAddedBackground: "var(--diff-added-highlight)",
                wordRemovedBackground: "var(--diff-removed-highlight)",
                addedGutterBackground: "var(--diff-added)",
                removedGutterBackground: "var(--diff-removed)",
                gutterBackground: "var(--diff-gutter)",
                gutterColor: "var(--muted-foreground)",
                emptyLineBackground: "var(--muted)",
                codeFoldBackground: "var(--muted)",
              },
            },
            contentText: {
              fontSize: "14px",
              lineHeight: "1.6",
              fontFamily: "inherit",
              padding: "8px 12px",
            },
            line: {
              padding: "4px 0",
            },
            gutter: {
              minWidth: "40px",
              padding: "0 8px",
            },
            diffContainer: {
              borderRadius: "0",
            },
          }}
        />
      </div>
    </div>
  );
}

// Compact version for list view
interface SimilarityItemProps {
  chunkIndex: number;
  content: string;
  similarity: number;
  type: PlagiarismType;
  matchFilename?: string;
  onClick?: () => void;
}

export function SimilarityItem({
  chunkIndex,
  content,
  similarity,
  type,
  matchFilename,
  onClick,
}: SimilarityItemProps) {
  const getTypeColor = () => {
    switch (type) {
      case "EXACT_COPY":
        return "border-l-danger hover:bg-danger-muted";
      case "SEMANTIC":
        return "border-l-warning hover:bg-warning-muted";
      default:
        return "border-l-safe hover:bg-safe-muted";
    }
  };

  const getBadgeStyle = () => {
    switch (type) {
      case "EXACT_COPY":
        return "bg-danger text-danger-foreground";
      case "SEMANTIC":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-safe text-safe-foreground";
    }
  };

  return (
    <div
      className={cn(
        "border-l-4 p-4 cursor-pointer transition-colors rounded-r-md",
        getTypeColor()
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              문단 {chunkIndex + 1}
            </span>
            <Badge className={cn("text-xs", getBadgeStyle())}>
              {Math.round(similarity * 100)}%
            </Badge>
          </div>
          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
            {content}
          </p>
          {matchFilename && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <ArrowLeftRight className="h-3 w-3" />
              {matchFilename}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
