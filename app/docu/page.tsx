"use client";

import { useState, useCallback } from "react";
import { DocumentList, type Document } from "@/components/document-list";
import { mockDocuments } from "@/lib/mock-data";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);

  const handleViewDocument = useCallback((doc: Document) => {
    console.log("View document:", doc.id);
  }, []);

  const handleDeleteDocument = useCallback(async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <DocumentList
        documents={documents.filter((d) => d.isReference)}
        onViewDocument={handleViewDocument}
        onDeleteDocument={handleDeleteDocument}
        showReferenceOnly={true}
      />
      <DocumentList
        documents={documents.filter((d) => !d.isReference)}
        onViewDocument={handleViewDocument}
        onDeleteDocument={handleDeleteDocument}
      />
    </div>
  );
}
