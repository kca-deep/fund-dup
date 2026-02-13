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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";

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
    const matchesSearch = doc.filename
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = showReferenceOnly ? doc.isReference : true;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            대기중
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            처리중
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-safe text-safe-foreground hover:bg-safe/90 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            완료
          </Badge>
        );
      case "ERROR":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            오류
          </Badge>
        );
    }
  };

  const getGradeBadge = (grade?: string) => {
    if (!grade) return null;
    switch (grade) {
      case "DANGER":
        return <Badge variant="destructive">위험</Badge>;
      case "WARNING":
        return (
          <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">주의</Badge>
        );
      case "SAFE":
        return <Badge className="bg-safe text-safe-foreground hover:bg-safe/90">안전</Badge>;
      default:
        return null;
    }
  };

  const getFileTypeIcon = (fileType: FileType) => {
    const colors: Record<FileType, string> = {
      PDF: "text-danger",
      DOCX: "text-chart-2",
      HWP: "text-safe",
    };
    return <FileText className={cn("h-5 w-5", colors[fileType])} />;
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
      hour: "2-digit",
      minute: "2-digit",
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {showReferenceOnly ? "기존 문서 관리" : "검사 결과"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {showReferenceOnly ? "기존 문서 관리" : "검사 결과"}
              <Badge variant="outline" className="ml-2">
                {filteredDocuments.length}
              </Badge>
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="문서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>문서가 없습니다</p>
              {searchQuery && (
                <p className="text-sm mt-1">다른 검색어를 시도해보세요</p>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">파일명</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>유사도</TableHead>
                    <TableHead>등급</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="cursor-pointer"
                      onClick={() => onViewDocument?.(doc)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileTypeIcon(doc.fileType)}
                          <div>
                            <p className="font-medium truncate max-w-[200px]">
                              {doc.filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.fileSize)}
                              {doc.category && ` · ${doc.category}`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        {doc.overallSimilarity !== undefined
                          ? `${Math.round(doc.overallSimilarity * 100)}%`
                          : "-"}
                      </TableCell>
                      <TableCell>{getGradeBadge(doc.overallGrade)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(doc.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDocument?.(doc);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              상세 보기
                            </DropdownMenuItem>
                            {onDownloadDocument && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDownloadDocument(doc.id);
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                다운로드
                              </DropdownMenuItem>
                            )}
                            {onDeleteDocument && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete(doc);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
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
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
