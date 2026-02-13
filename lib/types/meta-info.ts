// Business proposal meta information types

export interface BusinessMetaInfo {
  projectName: string;           // 사업명
  hostOrganization: string;      // 주관기관
  participatingOrgs?: string[];  // 참여기관
  projectManager: string;        // 총괄책임자
  managerContact?: string;       // 연락처
  managerEmail?: string;         // 이메일
  budget: number;                // 총 예산 (원)
  govFunding?: number;           // 정부지원금
  selfFunding?: number;          // 자부담금
  projectPeriod: {
    start: string;               // 사업시작일 (YYYY-MM-DD)
    end: string;                 // 사업종료일 (YYYY-MM-DD)
  };
  projectYear?: number;          // 사업연차
  totalYears?: number;           // 총 사업기간 (년)
  businessType?: string;         // 사업유형
  technologyField?: string;      // 기술분야
  keywords?: string[];           // 핵심 키워드
}

export interface MetaExtractionStatus {
  status: "idle" | "extracting" | "completed" | "error";
  progress: number;
  message?: string;
}

export interface MetaExtractionResult {
  metaInfo: Partial<BusinessMetaInfo>;
  confidence: number;            // OCR 신뢰도 (0-1)
  extractedFields: string[];     // 추출 성공한 필드 목록
  missingFields: string[];       // 추출 실패한 필드 목록
}

// Default empty meta info
export const emptyMetaInfo: BusinessMetaInfo = {
  projectName: "",
  hostOrganization: "",
  participatingOrgs: [],
  projectManager: "",
  managerContact: "",
  managerEmail: "",
  budget: 0,
  govFunding: 0,
  selfFunding: 0,
  projectPeriod: {
    start: "",
    end: "",
  },
  projectYear: 1,
  totalYears: 1,
  businessType: "",
  technologyField: "",
  keywords: [],
};

// Format budget to Korean currency style
export function formatBudget(amount: number): string {
  if (amount >= 100000000) {
    const billions = Math.floor(amount / 100000000);
    const millions = Math.floor((amount % 100000000) / 10000);
    if (millions > 0) {
      return `${billions}억 ${millions.toLocaleString()}만원`;
    }
    return `${billions}억원`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

// Parse Korean currency string to number
export function parseBudget(str: string): number {
  const cleanStr = str.replace(/[,\s원]/g, "");

  let total = 0;
  const billionMatch = cleanStr.match(/(\d+)억/);
  const millionMatch = cleanStr.match(/(\d+)만/);

  if (billionMatch) {
    total += parseInt(billionMatch[1]) * 100000000;
  }
  if (millionMatch) {
    total += parseInt(millionMatch[1]) * 10000;
  }

  // If no Korean units found, try parsing as plain number
  if (!billionMatch && !millionMatch) {
    const num = parseInt(cleanStr);
    if (!isNaN(num)) {
      return num;
    }
  }

  return total;
}
