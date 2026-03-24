"use client";

import { useState, useCallback } from "react";
import { DocumentList, type Document } from "@/components/document-list";
import { mockDocuments } from "@/lib/mock-data";
import { FolderOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "reference", label: "기존 문서", icon: FolderOpen },
  { id: "submission", label: "검사 결과", icon: FileText },
] as const;

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [activeTab, setActiveTab] = useState<"reference" | "submission">("reference");

  const handleViewDocument = useCallback((doc: Document) => {
    console.log("View document:", doc.id);
  }, []);

  const handleDeleteDocument = useCallback(async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const filteredDocuments = activeTab === "reference"
    ? documents.filter((d) => d.isReference)
    : documents.filter((d) => !d.isReference);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="eyebrow mb-3">문서 관리</div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          등록된 문서 관리
        </h1>
        <p className="text-muted-foreground mt-1">
          기존 참고 문서와 검사 결과를 관리합니다
        </p>
      </div>

      {/* Pill Tab Navigation */}
      <div className="animate-fade-in-up stagger-1">
        <div className="inline-flex p-1 rounded-full glass-strong gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-500",
                activeTab === id
                  ? "bg-foreground/8 text-foreground shadow-inner shadow-foreground/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
              style={{ transitionTimingFunction: "var(--spring-ease)" }}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full tabular-nums",
                activeTab === id ? "bg-foreground/8" : "bg-foreground/5"
              )}>
                {id === "reference"
                  ? documents.filter(d => d.isReference).length
                  : documents.filter(d => !d.isReference).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Document List */}
      <div className="animate-fade-in-up stagger-2">
        <DocumentList
          documents={filteredDocuments}
          onViewDocument={handleViewDocument}
          onDeleteDocument={handleDeleteDocument}
          showReferenceOnly={activeTab === "reference"}
        />
      </div>
    </div>
  );
}
