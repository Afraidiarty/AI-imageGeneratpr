export interface UploadedImage {
  src: string;
  mimeType: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalImage: UploadedImage;
  analysisResult: string;
  generatedImages: string[];
}

export type Angle =
  | 'eye-level'
  | 'left-45'
  | 'right-45'
  | 'high-angle'
  | 'low-angle'
  | 'dutch-angle'
  | 'macro-shot'
  | 'fish-eye';

export type AspectRatio = '1:1' | '2:3' | '3:2' | '4:5' | '5:4' | '16:9' | '9:16';

export interface AuthUser {
  id: number;
  email: string;
  stripeCustomerId?: string | null;
  name?: string;
  avatarUrl?: string;
}

export interface SubscriptionInfo {
  planId: string;
  status: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  stripeSubscriptionId?: string | null;
}

export type CreditAction =
  | 'analyze_image'
  | 'generate_ideas'
  | 'generate_scene'
  | 'edit_image'
  | 'variation';

export interface CreditTransaction {
  id: number;
  delta: number;
  reason: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  includedCredits: number;
  priceId?: string;
  price: number;
}

export interface CreditPack {
  id: string;
  name: string;
  description: string;
  credits: number;
  priceId?: string;
  price: number;
}
