import type { CheckResultData } from "@/components/result-dashboard";
import type { Document } from "@/components/document-list";

export const mockCheckResult: CheckResultData = {
  documentId: "check-001",
  filename: "2024_혁신성장_사업계획서_테스트.pdf",
  overallSimilarity: 0.68,
  overallGrade: "DANGER",
  metaInfo: {
    projectName: "AI 기반 문서 분석 시스템 개발",
    hostOrganization: "주식회사 혁신테크",
    participatingOrgs: ["서울대학교 AI연구소", "한국전자통신연구원"],
    projectManager: "김철수",
    managerContact: "02-1234-5678",
    managerEmail: "kim@innovtech.co.kr",
    budget: 500000000,
    govFunding: 350000000,
    selfFunding: 150000000,
    projectPeriod: {
      start: "2024-03-01",
      end: "2026-02-28",
    },
    projectYear: 1,
    totalYears: 2,
    businessType: "중소기업 기술혁신 개발사업",
    technologyField: "인공지능/빅데이터",
    keywords: ["AI", "문서분석", "자연어처리", "딥러닝", "한국어NLP"],
  },
  statistics: {
    totalChunks: 12,
    exactCopyCount: 2,
    semanticCount: 4,
    cleanCount: 6,
  },
  chunks: [
    {
      chunkIndex: 0,
      content:
        "본 사업은 인공지능 기반의 문서 분석 시스템을 개발하여 기업의 업무 효율성을 향상시키는 것을 목표로 합니다. 특히, 자연어 처리 기술을 활용하여 대량의 문서를 신속하게 분석하고, 핵심 정보를 자동으로 추출하는 기능을 구현할 예정입니다.",
      highestScore: 1.0,
      grade: "very_high",
      plagiarismType: "EXACT_COPY",
      matches: [
        {
          documentId: "doc-ref-001",
          filename: "2023_AI문서분석_사업계획서.pdf",
          chunkIndex: 3,
          content:
            "본 사업은 인공지능 기반의 문서 분석 시스템을 개발하여 기업의 업무 효율성을 향상시키는 것을 목표로 합니다. 특히, 자연어 처리 기술을 활용하여 대량의 문서를 신속하게 분석하고, 핵심 정보를 자동으로 추출하는 기능을 구현할 예정입니다.",
          semanticScore: 0.98,
          sixWordMatch: {
            isPlagiarism: true,
            matchText:
              "인공지능 기반의 문서 분석 시스템을 개발하여 기업의 업무 효율성을",
            wordCount: 11,
          },
          finalType: "EXACT_COPY",
          finalScore: 1.0,
          metaInfo: {
            projectName: "AI 기반 스마트 문서 처리 시스템",
            hostOrganization: "주식회사 데이터랩",
            projectManager: "박영희",
            budget: 320000000,
            projectPeriod: { start: "2023-01-01", end: "2024-12-31" },
          },
        },
      ],
    },
    {
      chunkIndex: 1,
      content:
        "시장 분석 결과, 국내 AI 문서 분석 시장은 연평균 25% 성장이 예상되며, 2025년까지 약 5,000억원 규모로 확대될 전망입니다. 주요 경쟁사로는 A사, B사, C사가 있으며, 당사는 한국어 특화 기술력으로 차별화할 계획입니다.",
      highestScore: 0.82,
      grade: "high",
      plagiarismType: "SEMANTIC",
      matches: [
        {
          documentId: "doc-ref-002",
          filename: "시장분석_보고서_2023.docx",
          chunkIndex: 7,
          content:
            "시장 조사에 따르면, 한국 AI 문서 처리 시장은 매년 20% 이상 성장하고 있으며, 2025년 약 4,500억원 규모가 될 것으로 예측됩니다. 주요 플레이어로는 A사, B사가 시장을 선도하고 있습니다.",
          semanticScore: 0.82,
          sixWordMatch: {
            isPlagiarism: false,
            matchText: "",
            wordCount: 0,
          },
          finalType: "SEMANTIC",
          finalScore: 0.82,
          metaInfo: {
            projectName: "국내 AI 시장 동향 분석 연구",
            hostOrganization: "한국정보통신연구원",
            projectManager: "이준호",
            budget: 150000000,
            projectPeriod: { start: "2023-03-01", end: "2023-12-31" },
          },
        },
      ],
    },
    {
      chunkIndex: 2,
      content:
        "핵심 기술로는 자연어 처리(NLP), 기계 학습, 딥러닝 기술을 활용하며, 특히 한국어 특화 모델을 개발할 예정입니다. BERT 기반의 사전학습 모델을 파인튜닝하여 도메인 특화 성능을 확보하겠습니다.",
      highestScore: 1.0,
      grade: "very_high",
      plagiarismType: "EXACT_COPY",
      matches: [
        {
          documentId: "doc-ref-003",
          filename: "기술개발_계획서_2023.pdf",
          chunkIndex: 5,
          content:
            "핵심 기술로는 자연어 처리(NLP), 기계 학습, 딥러닝 기술을 활용하며, 특히 한국어 특화 모델을 개발할 예정입니다. Transformer 아키텍처를 기반으로 한 모델을 학습시킬 계획입니다.",
          semanticScore: 0.95,
          sixWordMatch: {
            isPlagiarism: true,
            matchText:
              "핵심 기술로는 자연어 처리(NLP), 기계 학습, 딥러닝 기술을 활용하며",
            wordCount: 9,
          },
          finalType: "EXACT_COPY",
          finalScore: 1.0,
          metaInfo: {
            projectName: "한국어 자연어처리 핵심기술 개발",
            hostOrganization: "서울대학교 AI연구원",
            projectManager: "김민수",
            budget: 480000000,
            projectPeriod: { start: "2023-04-01", end: "2025-03-31" },
          },
        },
      ],
    },
    {
      chunkIndex: 3,
      content:
        "사업화 전략으로는 SaaS 형태의 구독 모델과 기업 맞춤형 온프레미스 솔루션을 병행하여 제공할 계획입니다. 초기에는 중소기업 시장을 타깃으로 하여 빠른 시장 진입을 목표로 합니다.",
      highestScore: 0.73,
      grade: "high",
      plagiarismType: "SEMANTIC",
      matches: [
        {
          documentId: "doc-ref-004",
          filename: "비즈니스모델_제안서.pdf",
          chunkIndex: 2,
          content:
            "비즈니스 모델은 클라우드 기반 SaaS 서비스와 대기업을 위한 커스텀 설치형 솔루션 두 가지로 구성됩니다. 우선 스타트업과 중소기업을 대상으로 서비스를 런칭합니다.",
          semanticScore: 0.73,
          sixWordMatch: {
            isPlagiarism: false,
            matchText: "",
            wordCount: 0,
          },
          finalType: "SEMANTIC",
          finalScore: 0.73,
          metaInfo: {
            projectName: "클라우드 서비스 사업화 전략 수립",
            hostOrganization: "클라우드벤처스",
            projectManager: "정수연",
            budget: 200000000,
            projectPeriod: { start: "2023-06-01", end: "2024-05-31" },
          },
        },
      ],
    },
    {
      chunkIndex: 4,
      content:
        "개발팀은 AI 전문가 5명, 백엔드 개발자 3명, 프론트엔드 개발자 2명, PM 1명으로 구성되어 있습니다. 팀원 모두 관련 분야에서 5년 이상의 경력을 보유하고 있습니다.",
      highestScore: 0.28,
      grade: "low",
      plagiarismType: "CLEAN",
      matches: [],
    },
    {
      chunkIndex: 5,
      content:
        "1차년도에는 프로토타입 개발 및 베타 테스트를 진행하고, 2차년도에 정식 서비스를 런칭할 예정입니다. 3차년도에는 해외 시장 진출을 목표로 하고 있습니다.",
      highestScore: 0.76,
      grade: "high",
      plagiarismType: "SEMANTIC",
      matches: [
        {
          documentId: "doc-ref-005",
          filename: "개발일정_계획서.docx",
          chunkIndex: 1,
          content:
            "첫 해에 프로토타입과 베타 버전을 만들고, 두 번째 해에 공식 출시를 목표로 합니다. 세 번째 해부터는 글로벌 확장을 추진합니다.",
          semanticScore: 0.76,
          sixWordMatch: {
            isPlagiarism: false,
            matchText: "",
            wordCount: 0,
          },
          finalType: "SEMANTIC",
          finalScore: 0.76,
          metaInfo: {
            projectName: "스마트 솔루션 글로벌 진출 사업",
            hostOrganization: "글로벌테크",
            projectManager: "최동훈",
            budget: 280000000,
            projectPeriod: { start: "2023-02-01", end: "2025-01-31" },
          },
        },
      ],
    },
    {
      chunkIndex: 6,
      content:
        "예상 매출은 1차년도 5억원, 2차년도 15억원, 3차년도 40억원으로 계획하고 있습니다. 손익분기점은 2차년도 말에 달성할 것으로 예상됩니다.",
      highestScore: 0.65,
      grade: "medium",
      plagiarismType: "SEMANTIC",
      matches: [
        {
          documentId: "doc-ref-006",
          filename: "재무계획서.pdf",
          chunkIndex: 4,
          content:
            "매출 목표는 첫해 3억원, 둘째해 10억원, 셋째해 30억원입니다. 2년차 말에 흑자 전환을 예상합니다.",
          semanticScore: 0.65,
          sixWordMatch: {
            isPlagiarism: false,
            matchText: "",
            wordCount: 0,
          },
          finalType: "SEMANTIC",
          finalScore: 0.65,
          metaInfo: {
            projectName: "AI 스타트업 재무 전략 컨설팅",
            hostOrganization: "한국벤처투자",
            projectManager: "윤서영",
            budget: 100000000,
            projectPeriod: { start: "2023-07-01", end: "2024-06-30" },
          },
        },
      ],
    },
    {
      chunkIndex: 7,
      content:
        "본 사업의 핵심 경쟁력은 독자적인 한국어 형태소 분석 엔진과 도메인 특화 언어 모델입니다. 이를 통해 기존 해외 솔루션 대비 30% 이상의 정확도 향상을 달성할 수 있습니다.",
      highestScore: 0.35,
      grade: "low",
      plagiarismType: "CLEAN",
      matches: [],
    },
    {
      chunkIndex: 8,
      content:
        "리스크 관리 방안으로는 기술 리스크, 시장 리스크, 인력 리스크에 대한 대응 전략을 수립하였습니다. 각 리스크별 모니터링 지표를 설정하고 분기별로 점검할 예정입니다.",
      highestScore: 0.42,
      grade: "low",
      plagiarismType: "CLEAN",
      matches: [],
    },
    {
      chunkIndex: 9,
      content:
        "정부 지원금 사용 계획은 인건비 60%, 연구개발비 25%, 기타 운영비 15%로 구성됩니다. 모든 집행은 관련 규정에 따라 투명하게 진행할 것입니다.",
      highestScore: 0.38,
      grade: "low",
      plagiarismType: "CLEAN",
      matches: [],
    },
    {
      chunkIndex: 10,
      content:
        "기대 효과로는 국내 AI 문서 분석 기술 경쟁력 강화, 관련 산업 생태계 활성화, 신규 일자리 창출 등이 있습니다. 사업 완료 후 3년 내 100개 이상의 기업 고객 확보를 목표로 합니다.",
      highestScore: 0.31,
      grade: "low",
      plagiarismType: "CLEAN",
      matches: [],
    },
    {
      chunkIndex: 11,
      content:
        "결론적으로, 본 사업은 AI 기술을 활용한 혁신적인 문서 분석 솔루션을 개발하여 국내 기업의 디지털 전환을 가속화하고, 글로벌 시장에서 경쟁력 있는 K-AI 제품을 선보이고자 합니다.",
      highestScore: 0.29,
      grade: "low",
      plagiarismType: "CLEAN",
      matches: [],
    },
  ],
};

export const mockDocuments: Document[] = [
  {
    id: "1",
    filename: "2024_사업계획서_A기업.pdf",
    fileType: "PDF",
    fileSize: 2456789,
    status: "COMPLETED",
    isReference: true,
    category: "IT/소프트웨어",
    createdAt: "2024-01-15T09:30:00Z",
    overallSimilarity: 0.12,
    overallGrade: "SAFE",
  },
  {
    id: "2",
    filename: "혁신성장_계획서_B사.docx",
    fileType: "DOCX",
    fileSize: 1834567,
    status: "COMPLETED",
    isReference: true,
    category: "제조업",
    createdAt: "2024-01-10T14:20:00Z",
    overallSimilarity: 0.35,
    overallGrade: "SAFE",
  },
  {
    id: "3",
    filename: "스타트업_지원사업_C.pdf",
    fileType: "PDF",
    fileSize: 3456789,
    status: "COMPLETED",
    isReference: false,
    category: "스타트업",
    createdAt: "2024-01-20T11:45:00Z",
    overallSimilarity: 0.72,
    overallGrade: "WARNING",
  },
];
