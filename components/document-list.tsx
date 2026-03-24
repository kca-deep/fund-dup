"use client";

import { useState } from "react";
import {
  FileText,
  Trash2,
  Search,
  MoreVertical,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export type DocumentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "ERROR";
export type FileType = "PDF" | "DOCX" | "HWP";

export interface Document {
  id: string;
  filename: string;
  fileType: FileType;
  fileSize?: number;
  status: DocumentStatus;
  isReference: boolean;
  category?: string;
  createdAt: string;
  overallSimilarity?: number;
  overallGrade?: string;
}

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  onViewDocument?: (doc: Document) => void;
  onDeleteDocument?: (id: string) => Promise<void>;
  onDownloadDocument?: (id: string) => void;
  showReferenceOnly?: boolean;
}

export function DocumentList({
  documents,
  isLoading = false,
  onViewDocument,
  onDeleteDocument,
  onDownloadDocument,
  showReferenceOnly = false,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = showReferenceOnly ? doc.isReference : true;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-foreground/5 border border-border text-muted-foreground gap-1">
            <Clock className="h-3 w-3" />대기중
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-primary/10 border border-primary/20 text-primary gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />처리중
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-safe/10 border border-safe/20 text-safe gap-1">
            <CheckCircle2 className="h-3 w-3" />완료
          </Badge>
        );
      case "ERROR":
        return (
          <Badge className="bg-danger/10 border border-danger/20 text-danger gap-1">
            <XCircle className="h-3 w-3" />오류
          </Badge>
        );
    }
  };

  const getGradeBadge = (grade?: string) => {
    if (!grade) return null;
    switch (grade) {
      case "DANGER":
        return <Badge className="bg-danger text-danger-foreground">위험</Badge>;
      case "WARNING":
        return <Badge className="bg-warning text-warning-foreground">주의</Badge>;
      case "SAFE":
        return <Badge className="bg-safe text-safe-foreground">안전</Badge>;
      default:
        return null;
    }
  };

  const getFileTypeColor = (fileType: FileType) => {
    const colors: Record<FileType, string> = {
      PDF: "text-danger bg-danger/10 border-danger/20",
      DOCX: "text-primary bg-primary/10 border-primary/20",
      HWP: "text-safe bg-safe/10 border-safe/20",
    };
    return colors[fileType];
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDelete = async () => {
    if (!documentToDelete || !onDeleteDocument) return;
    setIsDeleting(true);
    try {
      await onDeleteDocument(documentToDelete.id);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const confirmDelete = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-5 animate-shimmer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-foreground/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-foreground/5 rounded" />
                <div className="h-3 w-1/4 bg-foreground/[0.03] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Search Bar — Glass style */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="문서 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl glass-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300"
          style={{ transitionTimingFunction: "var(--spring-ease)" }}
        />
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="double-bezel">
          <div className="bezel-inner py-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.06] flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="h-7 w-7 text-foreground/15" />
              </div>
              <p className="text-foreground/60 font-medium">문서가 없습니다</p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-1">다른 검색어를 시도해보세요</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-2">
            {filteredDocuments.map((doc, index) => (
              <div
                key={doc.id}
                onClick={() => onViewDocument?.(doc)}
                className="glass-card rounded-2xl p-4 cursor-pointer hover-lift group"
                style={{
                  animationDelay: `${index * 60}ms`,
                }}
              >
                <div className="flex items-center gap-4">
                  {/* File type icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
                    getFileTypeColor(doc.fileType)
                  )}>
                    <FileText className="h-5 w-5" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate text-foreground">
                        {doc.filename}
                      </p>
                      {getGradeBadge(doc.overallGrade)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      {doc.category && <span>· {doc.category}</span>}
                      <span>· {formatDate(doc.createdAt)}</span>
                    </div>
                  </div>

                  {/* Status + Similarity + Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {doc.overallSimilarity !== undefined && (
                      <span className={cn(
                        "text-sm font-bold tabular-nums",
                        doc.overallGrade === "DANGER" && "text-danger",
                        doc.overallGrade === "WARNING" && "text-warning",
                        doc.overallGrade === "SAFE" && "text-safe",
                        !doc.overallGrade && "text-muted-foreground",
                      )}>
                        {Math.round(doc.overallSimilarity * 100)}%
                      </span>
                    )}
                    {getStatusBadge(doc.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="p-2 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-strong border-border">
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); onViewDocument?.(doc); }}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />상세 보기
                        </DropdownMenuItem>
                        {onDownloadDocument && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onDownloadDocument(doc.id); }}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />다운로드
                          </DropdownMenuItem>
                        )}
                        {onDeleteDocument && (
                          <DropdownMenuItem
                            className="text-danger gap-2"
                            onClick={(e) => { e.stopPropagation(); confirmDelete(doc); }}
                          >
                            <Trash2 className="h-4 w-4" />삭제
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Delete Dialog — Glass style */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-strong border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle>문서 삭제</DialogTitle>
            <DialogDescription>
              &quot;{documentToDelete?.filename}&quot; 문서를 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="rounded-full border-border"
            >
              취소
            </Button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="cta-primary bg-danger text-danger-foreground px-6 py-2.5 text-sm disabled:opacity-50"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />}
              삭제
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
