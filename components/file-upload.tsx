"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, AlertCircle, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { type BusinessMetaInfo, type MetaExtractionStatus } from "@/lib/types/meta-info";
import type { LogEventPayload } from "@/lib/types/process-log";

export interface UploadedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "extracting" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
  metaExtraction?: MetaExtractionStatus;
  metaInfo?: Partial<BusinessMetaInfo>;
  result?: {
    documentId: string;
    overallSimilarity: number;
    overallGrade: string;
  };
}

interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void;
  onUploadComplete?: (result: UploadedFile) => void;
  onLogEvent?: (entry: LogEventPayload) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedFormats?: string[];
}

export function FileUpload({
  onFilesSelected,
  onUploadComplete,
  onLogEvent,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedFormats = [".pdf", ".docx"],
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: "pending" as const,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));
      onFilesSelected?.(acceptedFiles);

      // Log: files added
      for (const f of acceptedFiles) {
        onLogEvent?.({
          level: "info",
          message: `파일 추가됨: ${f.name}`,
          detail: `(${formatFileSize(f.size)})`,
          fileName: f.name,
        });
      }
    },
    [maxFiles, onFilesSelected, onLogEvent]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "application/pdf": [".pdf"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          [".docx"],
      },
      maxFiles,
      maxSize,
    });

  // Log: file rejections (point 2)
  useEffect(() => {
    if (fileRejections.length > 0) {
      for (const rejection of fileRejections) {
        onLogEvent?.({
          level: "warning",
          message: `파일 거부됨: ${rejection.file.name}`,
          detail: rejection.errors.map((e) => e.message).join(", "),
          fileName: rejection.file.name,
        });
      }
    }
  }, [fileRejections, onLogEvent]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFile = async (uploadedFile: UploadedFile) => {
    const formData = new FormData();
    formData.append("file", uploadedFile.file);

    // Step 1: Start uploading
    // Log: upload start (point 3)
    onLogEvent?.({
      level: "info",
      message: `파일 업로드 시작`,
      fileId: uploadedFile.id,
      fileName: uploadedFile.file.name,
    });

    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadedFile.id
          ? {
              ...f,
              status: "uploading" as const,
              metaExtraction: { status: "idle", progress: 0 },
            }
          : f
      )
    );

    try {
      // Simulate upload progress
      let uploadProgress = 0;
      const uploadInterval = setInterval(() => {
        uploadProgress += 15;
        if (uploadProgress <= 40) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, progress: uploadProgress } : f
            )
          );
        }
      }, 150);

      // Simulate reaching 40% (upload complete)
      await new Promise((resolve) => setTimeout(resolve, 600));
      clearInterval(uploadInterval);

      // Step 2: Start OCR meta extraction
      // Log: extracting start (point 4)
      onLogEvent?.({
        level: "info",
        message: "OCR 텍스트 인식 시작",
        fileId: uploadedFile.id,
        fileName: uploadedFile.file.name,
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: "extracting" as const,
                progress: 45,
                metaExtraction: {
                  status: "extracting",
                  progress: 0,
                  message: "문서에서 메타정보 추출 중...",
                },
              }
            : f
        )
      );

      // Simulate meta extraction progress
      let extractProgress = 0;
      let metaParsingLogged = false;
      const extractInterval = setInterval(() => {
        extractProgress += 20;
        if (extractProgress <= 100) {
          // Log: meta parsing (point 5) - fire once at >= 50
          if (extractProgress >= 50 && !metaParsingLogged) {
            metaParsingLogged = true;
            onLogEvent?.({
              level: "info",
              message: "메타정보 파싱 중",
              fileId: uploadedFile.id,
              fileName: uploadedFile.file.name,
            });
          }
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? {
                    ...f,
                    progress: 45 + Math.floor(extractProgress * 0.25),
                    metaExtraction: {
                      status: "extracting" as const,
                      progress: extractProgress,
                      message:
                        extractProgress < 50
                          ? "OCR 텍스트 인식 중..."
                          : "메타정보 파싱 중...",
                    },
                  }
                : f
            )
          );
        }
      }, 200);

      await new Promise((resolve) => setTimeout(resolve, 1200));
      clearInterval(extractInterval);

      // Mock extracted meta info
      const mockMetaInfo: Partial<BusinessMetaInfo> = {
        projectName: "AI 기반 문서 분석 시스템 개발",
        hostOrganization: "주식회사 테스트기업",
        projectManager: "홍길동",
        budget: 500000000,
        govFunding: 350000000,
        selfFunding: 150000000,
        projectPeriod: {
          start: "2024-03-01",
          end: "2025-02-28",
        },
        projectYear: 1,
        totalYears: 2,
        businessType: "연구개발사업",
        technologyField: "인공지능/빅데이터",
        keywords: ["AI", "문서분석", "자연어처리", "딥러닝"],
      };

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                progress: 70,
                metaExtraction: { status: "completed" as const, progress: 100 },
                metaInfo: mockMetaInfo,
              }
            : f
        )
      );

      // Log: meta extraction complete (point 6)
      onLogEvent?.({
        level: "success",
        message: "메타정보 추출 완료",
        detail: mockMetaInfo.projectName
          ? `사업명: ${mockMetaInfo.projectName}`
          : undefined,
        fileId: uploadedFile.id,
        fileName: uploadedFile.file.name,
      });

      // Step 3: Process similarity check
      // Log: processing start (point 7)
      onLogEvent?.({
        level: "info",
        message: "유사도 검사 중",
        detail: "6어절 규칙 + 의미 유사도 분석",
        fileId: uploadedFile.id,
        fileName: uploadedFile.file.name,
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, status: "processing" as const, progress: 75 }
            : f
        )
      );

      // Simulate processing progress
      const processInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id && f.progress < 95
              ? { ...f, progress: f.progress + 5 }
              : f
          )
        );
      }, 200);

      const response = await fetch("/api/similarity/check", {
        method: "POST",
        body: formData,
      });

      clearInterval(processInterval);

      if (!response.ok) {
        throw new Error("유사도 검사 실패");
      }

      const result = await response.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: "completed" as const,
                progress: 100,
                result: result.data,
              }
            : f
        )
      );

      // Log: completed (point 8)
      onLogEvent?.({
        level: "success",
        message: "검사 완료",
        detail: `유사도: ${Math.round((result.data?.overallSimilarity ?? 0) * 100)}% / 판정: ${result.data?.overallGrade ?? "N/A"}`,
        fileId: uploadedFile.id,
        fileName: uploadedFile.file.name,
      });

      onUploadComplete?.({
        ...uploadedFile,
        status: "completed",
        progress: 100,
        metaInfo: mockMetaInfo,
        result: result.data,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "처리 실패";

      // Log: error (point 9)
      onLogEvent?.({
        level: "error",
        message: "처리 실패",
        detail: errorMessage,
        fileId: uploadedFile.id,
        fileName: uploadedFile.file.name,
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: "error" as const,
                error: errorMessage,
                metaExtraction: { status: "error" as const, progress: 0 },
              }
            : f
        )
      );
    }
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "DANGER":
        return <Badge variant="destructive">위험</Badge>;
      case "WARNING":
        return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">주의</Badge>;
      case "SAFE":
        return <Badge className="bg-safe text-safe-foreground hover:bg-safe/90">안전</Badge>;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          문서 업로드
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-primary font-medium">파일을 여기에 놓으세요</p>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                파일을 드래그하거나 클릭하여 선택하세요
              </p>
              <p className="text-xs text-muted-foreground">
                지원 형식: {acceptedFormats.join(", ")} (최대{" "}
                {formatFileSize(maxSize)})
              </p>
            </div>
          )}
        </div>

        {/* File Rejections */}
        {fileRejections.length > 0 && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>일부 파일이 거부되었습니다. 지원되는 형식을 확인하세요.</span>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            {files.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="p-3 border rounded-lg space-y-2"
              >
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {uploadedFile.file.name}
                      </p>
                      {uploadedFile.status === "completed" &&
                        uploadedFile.result &&
                        getGradeBadge(uploadedFile.result.overallGrade)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.file.size)}
                      {uploadedFile.status === "completed" &&
                        uploadedFile.result && (
                          <span className="ml-2">
                            유사도:{" "}
                            {Math.round(
                              uploadedFile.result.overallSimilarity * 100
                            )}
                            %
                          </span>
                        )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {uploadedFile.status === "completed" && (
                      <CheckCircle2 className="h-5 w-5 text-safe" />
                    )}
                    {uploadedFile.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadedFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress with status labels */}
                {(uploadedFile.status === "uploading" ||
                  uploadedFile.status === "extracting" ||
                  uploadedFile.status === "processing") && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {uploadedFile.status === "uploading" && (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-muted-foreground">파일 업로드 중...</span>
                          </>
                        )}
                        {uploadedFile.status === "extracting" && (
                          <>
                            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                            <span className="text-primary font-medium">
                              {uploadedFile.metaExtraction?.message || "메타정보 추출 중..."}
                            </span>
                          </>
                        )}
                        {uploadedFile.status === "processing" && (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-muted-foreground">유사도 검사 중...</span>
                          </>
                        )}
                      </div>
                      <span className="text-muted-foreground">{uploadedFile.progress}%</span>
                    </div>
                    <Progress value={uploadedFile.progress} className="h-1.5" />
                  </div>
                )}

                {/* Meta info extraction complete indicator */}
                {uploadedFile.metaExtraction?.status === "completed" &&
                  uploadedFile.metaInfo && (
                    <div className="flex items-center gap-2 text-xs bg-safe/10 text-safe px-2 py-1 rounded">
                      <Sparkles className="h-3 w-3" />
                      <span>메타정보 추출 완료: {uploadedFile.metaInfo.projectName}</span>
                    </div>
                  )}

                {uploadedFile.status === "error" && (
                  <p className="text-xs text-destructive">
                    {uploadedFile.error}
                  </p>
                )}
              </div>
            ))}

            {/* Upload Button */}
            {files.some((f) => f.status === "pending") && (
              <Button onClick={uploadAll} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                유사도 검사 시작 ({files.filter((f) => f.status === "pending").length}개
                파일)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
