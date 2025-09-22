export interface Template {
  id?: string;
  _id: string;
  name: string;
  category: 'MARKETING' | 'AUTHENTICATION' | 'UTILITY';
  language: string;
  header_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  header_text?: string;
  header_media_url?: string;
  body_text: string;
  footer_text?: string;
  components: string[];
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
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
  approved_by?: string;
  approved_by_user?: {
    _id: string;
    first_name: string;
    last_name: string;
  };
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface CreateTemplateRequest {
  name: string;
  category: 'MARKETING' | 'AUTHENTICATION' | 'UTILITY';
  language: string;
  header_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  header_text?: string;
  header_media_url?: string;
  body_text: string;
  footer_text?: string;
  components: string[];
  organization_id: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  category?: 'MARKETING' | 'AUTHENTICATION' | 'UTILITY';
  language?: string;
  header_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  header_text?: string;
  header_media_url?: string;
  body_text?: string;
  footer_text?: string;
  components?: string[];
}

export interface TemplateListResponse {
  templates: Template[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalTemplates: number;
    limit: number;
  };
}
