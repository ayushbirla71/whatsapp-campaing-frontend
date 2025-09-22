export interface Audience {
  _id: string;
  first_name: string;
  last_name?: string;
  phone_number: string;
  email?: string;
  attributes: Record<string, any>;
  organization_id: string;
  organization?: {
    _id: string;
    name: string;
  };
  created_by: string;
  created_by_user?: {
    _id: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateAudienceRequest {
  first_name: string;
  last_name?: string;
  phone_number: string;
  email?: string;
  attributes?: Record<string, any>;
  organization_id: string;
}

export interface BulkCreateAudienceRequest {
  audience_members: CreateAudienceRequest[];
}

export interface UpdateAudienceRequest {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
  attributes?: Record<string, any>;
}

export interface AudienceListResponse {
  audience: Audience[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalAudience: number;
    limit: number;
  };
}

export interface CampaignAudience {
  _id: string;
  campaign_id: string;
  audience_id: string;
  audience?: Audience;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  created_at: string;
}

export interface CampaignAudienceListResponse {
  campaign_audience: CampaignAudience[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMembers: number;
    limit: number;
  };
}
