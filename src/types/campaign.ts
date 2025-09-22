export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  template_id: string;
  template?: {
    _id: string;
    name: string;
    category: string;
  };
  organization_id: string;
  organization?: {
    _id: string;
    name: string;
  };
  status: 'draft' | 'PENDING' | 'APPROVED' | 'RUNNING' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_by: string;
  created_by_user?: {
    _id: string;
    first_name: string;
    last_name: string;
  };
  approved_by?: string;
  approved_by_user?: {
    _id: string;
    first_name: string;
    last_name: string;
  };
  rejection_reason?: string;
  statistics: {
    total_audience: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  created_at: string;
  updated_at: string;
  approved_at?: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  template_id: string;
  campaign_type: 'scheduled';
  scheduled_at: string; // ISO string (e.g., 2025-09-22T00:00:00.000Z)
  buffer_hours: number;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  scheduled_at?: string;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'RUNNING' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCampaigns: number;
    limit: number;
  };
}

export interface CampaignStatistics {
  total_campaigns: number;
  draft: number;
  pending: number;
  approved: number;
  running: number;
  paused: number;
  cancelled: number;
  completed: number;
}
