export interface MetricWithChange {
  value: number;
  display: string;
  changePercent: number | null;
  direction: "up" | "down" | "flat";
}

export interface ContentGapPrompt {
  query: string;
  count: number;
  avgResultCount: number;
  zeroResultRate: number;
  resultQuality: "none" | "poor" | "weak" | "good";
  opportunity: "critical" | "high" | "medium" | "low";
  trendPercent: number | null;
}

export interface PromptAnalytics {
  days: number;
  totalPrompts: MetricWithChange;
  uniquePrompts: MetricWithChange;
  searchesPerVisitor: MetricWithChange;
  searchesPerSession: MetricWithChange;
  newVsReturning: {
    newCount: number;
    returningCount: number;
    newPercent: number;
    returningPercent: number;
  };
  volumeOverTime: { date: string; count: number }[];
  statSparklines: Record<string, { date: string; count: number }[]>;
  volumeInsight: string;
  contentGaps: ContentGapPrompt[];
  contentGapsSummary: {
    gapPromptCount: number;
    unansweredSearchCount: number;
    criticalCount: number;
    searchVolumeByQuality: Record<string, number>;
  };
  contentGapsInsight: string;
  popularPrompts: {
    query: string;
    count: number;
    percentOfTotal: number;
    trendPercent: number | null;
  }[];
  trendingPrompts: {
    query: string;
    currentCount: number;
    growthPercent: number;
  }[];
  total: number;
  recentQueries: {
    query: string;
    resultCount: number;
    createdAt: string;
  }[];
}

export interface MeResponse {
  authenticated: boolean;
  email?: string;
  connected?: boolean;
  siteId?: string;
  siteName?: string;
  searchToken?: string;
  lastIndexedAt?: string | null;
  searchEndpoint?: string;
  scriptUrl?: string;
  sites?: { id: string; name: string }[];
}

export interface CollectionField {
  slug: string;
  displayName?: string;
}

export interface CollectionMapping {
  title?: string;
  body?: string;
  excerpt?: string;
  slug?: string;
  image?: string;
  date?: string;
}

export interface Collection {
  collectionId: string;
  name: string;
  enabled: boolean;
  contentType?: string;
  urlPattern?: string;
  fields: CollectionField[];
  mapping: CollectionMapping;
}

export interface ContentInsightsResponse {
  summary?: string;
  eventsAnalyzed: number;
  uniqueQueries: number;
  analyzedAt: string;
  trends: {
    topic: string;
    volume: string;
    description: string;
    exampleQueries?: string[];
  }[];
  contentGaps: { query: string; searches?: number; note: string }[];
  marketingSuggestions: {
    title: string;
    format: string;
    rationale: string;
    targetQueries?: string[];
  }[];
}
