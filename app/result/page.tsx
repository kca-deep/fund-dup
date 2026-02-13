"use client";

import { useState } from "react";
import { ResultDashboard } from "@/components/result-dashboard";
import { mockCheckResult } from "@/lib/mock-data";

export default function ResultPage() {
  const [checkResult] = useState(mockCheckResult);
  const [isAnalyzing] = useState(false);

  return <ResultDashboard result={checkResult} isLoading={isAnalyzing} />;
}
