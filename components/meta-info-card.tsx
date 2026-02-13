"use client";

import { useState } from "react";
import {
  Building2,
  User,
  Calendar,
  Coins,
  Tag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  type BusinessMetaInfo,
  type MetaExtractionStatus,
  formatBudget,
} from "@/lib/types/meta-info";

interface MetaInfoCardProps {
  metaInfo: Partial<BusinessMetaInfo>;
  extractionStatus?: MetaExtractionStatus;
  confidence?: number;
  editable?: boolean;
  onMetaInfoChange?: (metaInfo: Partial<BusinessMetaInfo>) => void;
}

export function MetaInfoCard({
  metaInfo,
  extractionStatus = { status: "idle", progress: 0 },
  confidence,
  editable = false,
  onMetaInfoChange,
}: MetaInfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetaInfo, setEditedMetaInfo] = useState<Partial<BusinessMetaInfo>>(metaInfo);

  const handleSave = () => {
    onMetaInfoChange?.(editedMetaInfo);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedMetaInfo(metaInfo);
    setIsEditing(false);
  };

  const updateField = <K extends keyof BusinessMetaInfo>(
    field: K,
    value: BusinessMetaInfo[K]
  ) => {
    setEditedMetaInfo((prev) => ({ ...prev, [field]: value }));
  };

  // Extracting state
  if (extractionStatus.status === "extracting") {
    return (
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {extractionStatus.message || "메타정보 추출 중..."}
                </span>
                <span className="text-muted-foreground">{extractionStatus.progress}%</span>
              </div>
              <Progress value={extractionStatus.progress} className="h-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (extractionStatus.status === "error") {
    return (
      <Card className="border-danger/30">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-danger text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{extractionStatus.message || "메타정보 추출 실패"}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact summary view (default)
  return (
    <Card>
      <CardContent className="py-3">
        {/* Compact Header Row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />

            {/* Project Name */}
            <span className="text-sm font-medium truncate">
              {metaInfo.projectName || "사업명 없음"}
            </span>

            {/* Status Badge */}
            {extractionStatus.status === "completed" && (
              <Badge className="bg-safe/10 text-safe border-safe/20 text-[10px] px-1.5 py-0 shrink-0">
                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                OCR
              </Badge>
            )}

            {/* Key Info Chips - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <span className="text-muted-foreground/50">|</span>
              {metaInfo.hostOrganization && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {metaInfo.hostOrganization}
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
                  {metaInfo.projectPeriod.start.slice(0, 7)} ~ {metaInfo.projectPeriod.end?.slice(0, 7)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {editable && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setIsExpanded(true);
                  setIsEditing(true);
                }}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Key Info */}
        <div className="flex md:hidden items-center gap-3 mt-2 text-xs text-muted-foreground">
          {metaInfo.hostOrganization && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {metaInfo.hostOrganization}
            </span>
          )}
          {metaInfo.budget && metaInfo.budget > 0 && (
            <span className="flex items-center gap-1 text-primary font-medium">
              <Coins className="h-3 w-3" />
              {formatBudget(metaInfo.budget)}
            </span>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t">
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">사업명</label>
                    <Input
                      value={editedMetaInfo.projectName || ""}
                      onChange={(e) => updateField("projectName", e.target.value)}
                      placeholder="사업명"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">주관기관</label>
                    <Input
                      value={editedMetaInfo.hostOrganization || ""}
                      onChange={(e) => updateField("hostOrganization", e.target.value)}
                      placeholder="주관기관"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">총괄책임자</label>
                    <Input
                      value={editedMetaInfo.projectManager || ""}
                      onChange={(e) => updateField("projectManager", e.target.value)}
                      placeholder="책임자명"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">총 예산 (원)</label>
                    <Input
                      type="number"
                      value={editedMetaInfo.budget || ""}
                      onChange={(e) => updateField("budget", parseInt(e.target.value) || 0)}
                      placeholder="예산"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">시작일</label>
                    <Input
                      type="date"
                      value={editedMetaInfo.projectPeriod?.start || ""}
                      onChange={(e) =>
                        updateField("projectPeriod", {
                          start: e.target.value,
                          end: editedMetaInfo.projectPeriod?.end || "",
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">종료일</label>
                    <Input
                      type="date"
                      value={editedMetaInfo.projectPeriod?.end || ""}
                      onChange={(e) =>
                        updateField("projectPeriod", {
                          start: editedMetaInfo.projectPeriod?.start || "",
                          end: e.target.value,
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">사업유형</label>
                    <Input
                      value={editedMetaInfo.businessType || ""}
                      onChange={(e) => updateField("businessType", e.target.value)}
                      placeholder="사업유형"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">기술분야</label>
                    <Input
                      value={editedMetaInfo.technologyField || ""}
                      onChange={(e) => updateField("technologyField", e.target.value)}
                      placeholder="기술분야"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">키워드 (쉼표 구분)</label>
                    <Input
                      value={editedMetaInfo.keywords?.join(", ") || ""}
                      onChange={(e) =>
                        updateField(
                          "keywords",
                          e.target.value.split(",").map((k) => k.trim()).filter(Boolean)
                        )
                      }
                      placeholder="키워드1, 키워드2, ..."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="h-3 w-3 mr-1" />
                    취소
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-3 w-3 mr-1" />
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              /* View Mode - Compact Grid */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                <InfoItem label="주관기관" value={metaInfo.hostOrganization} />
                <InfoItem label="총괄책임자" value={metaInfo.projectManager} />
                <InfoItem
                  label="총 예산"
                  value={metaInfo.budget ? formatBudget(metaInfo.budget) : undefined}
                  highlight
                />
                <InfoItem
                  label="사업기간"
                  value={
                    metaInfo.projectPeriod?.start && metaInfo.projectPeriod?.end
                      ? `${metaInfo.projectPeriod.start} ~ ${metaInfo.projectPeriod.end}`
                      : undefined
                  }
                />
                {metaInfo.govFunding && (
                  <InfoItem label="정부지원금" value={formatBudget(metaInfo.govFunding)} />
                )}
                {metaInfo.selfFunding && (
                  <InfoItem label="자부담금" value={formatBudget(metaInfo.selfFunding)} />
                )}
                {metaInfo.businessType && (
                  <InfoItem label="사업유형" value={metaInfo.businessType} />
                )}
                {metaInfo.technologyField && (
                  <InfoItem label="기술분야" value={metaInfo.technologyField} />
                )}

                {/* Keywords */}
                {metaInfo.keywords && metaInfo.keywords.length > 0 && (
                  <div className="col-span-2 md:col-span-4 mt-1">
                    <span className="text-muted-foreground">키워드: </span>
                    <span className="text-foreground">
                      {metaInfo.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-[10px] mr-1 px-1.5 py-0">
                          {keyword}
                        </Badge>
                      ))}
                    </span>
                  </div>
                )}

                {/* Confidence */}
                {confidence !== undefined && (
                  <div className="col-span-2 md:col-span-4 mt-1 text-muted-foreground">
                    OCR 신뢰도: {Math.round(confidence * 100)}%
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper component for info items
function InfoItem({
  label,
  value,
  highlight = false
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className={cn("text-foreground", highlight && "font-medium text-primary")}>
        {value}
      </span>
    </div>
  );
}

// Extraction status indicator for file upload
interface ExtractionStatusIndicatorProps {
  status: MetaExtractionStatus;
}

export function ExtractionStatusIndicator({ status }: ExtractionStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {status.status === "extracting" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-muted-foreground">메타정보 추출 중... {status.progress}%</span>
        </>
      )}
      {status.status === "completed" && (
        <>
          <CheckCircle2 className="h-3 w-3 text-safe" />
          <span className="text-safe">메타정보 추출 완료</span>
        </>
      )}
      {status.status === "error" && (
        <>
          <AlertCircle className="h-3 w-3 text-danger" />
          <span className="text-danger">메타정보 추출 실패</span>
        </>
      )}
    </div>
  );
}
