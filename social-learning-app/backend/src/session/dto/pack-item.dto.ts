export type PackSource = 'research' | 'hackernews' | 'insight';

export interface PackItemDto {
  id: string | number;
  source: PackSource;
  title: string;
  tldr?: string;
  whyItMatters?: string;
  readingMinutes?: number;
  url?: string;
  domain?: string | null;
  author?: string | string[];
  publishedAt?: string;
  meta?: Record<string, any>;
}

export interface PackResponseDto {
  date: string; // YYYY-MM-DD
  topic: string;
  items: PackItemDto[];
}

