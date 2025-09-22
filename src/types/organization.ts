export interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  whatsapp_business_account_id?: string;
  whatsapp_phone_number_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  whatsapp_business_account_id?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
  whatsapp_webhook_verify_token?: string;
  whatsapp_webhook_url?: string;
  whatsapp_app_id?: string;
  whatsapp_app_secret?: string;
}

export interface UpdateOrganizationRequest extends Partial<CreateOrganizationRequest> {}

export interface WhatsAppConfig {
  whatsapp_business_account_id?: string;
  whatsapp_access_token?: string;
  whatsapp_phone_number_id?: string;
}
