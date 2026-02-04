import axios, { AxiosInstance, AxiosResponse } from "axios";
import { toast } from "react-toastify";
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ApiResponse,
} from "../types/auth";
import {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  WhatsAppConfig,
} from "../types/organization";
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserListResponse,
} from "../types/user";
import {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateListResponse,
} from "../types/template";
import {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignListResponse,
  CampaignStatistics,
} from "../types/campaign";
import {
  Audience,
  CreateAudienceRequest,
  BulkCreateAudienceRequest,
  UpdateAudienceRequest,
  AudienceListResponse,
  CampaignAudience,
  CampaignAudienceListResponse,
} from "../types/audience";

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || "http://13.232.17.134:3000",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (refreshToken) {
              const response = await this.api.post("/auth/refresh", {
                refreshToken,
              });

              const { accessToken, refreshToken: newRefreshToken } =
                response.data.data;
              localStorage.setItem("accessToken", accessToken);
              localStorage.setItem("refreshToken", newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            window.location.href = "/login";
          }
        }

        // Global error toast handling (can be suppressed per-request by setting config.suppressToast = true)
        try {
          const cfg: any = originalRequest || {};
          if (!cfg?.suppressToast) {
            const status = error?.response?.status;
            const data = error?.response?.data;
            let message: string = "";

            // Prefer explicit message fields
            if (data?.message) message = String(data.message);
            else if (typeof data === "string") message = data;
            else if (data?.error) message = String(data.error);

            // Network or timeout errors
            if (!error.response) {
              if (error.code === "ECONNABORTED")
                message = message || "Request timed out. Please try again.";
              else
                message =
                  message || "Network error. Please check your connection.";
            }

            // Status-based fallbacks
            if (!message) {
              if (status === 400) message = "Bad request.";
              else if (status === 401)
                message = "Your session has expired. Please login again.";
              else if (status === 403)
                message = "You do not have permission to perform this action.";
              else if (status === 404)
                message = "The requested resource was not found.";
              else if (status >= 500)
                message = "Server error. Please try again later.";
            }

            toast.error(message || "Something went wrong.");
          }
        } catch {
          // ignore toast failures
        }

        return Promise.reject(error);
      },
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post(
      "/api/auth/login",
      credentials,
    );
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      "/api/users",
      userData,
    );
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const refreshToken = localStorage.getItem("refreshToken");
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      "/api/auth/logout",
      {
        refreshToken,
      },
    );
    return response.data;
  }

  async validateToken(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> =
      await this.api.post("/api/auth/validate");
    return response.data;
  }

  // Organization endpoints
  async getOrganizations(
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<{ organizations: Organization[]; pagination: any }>> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/organizations?page=${page}&limit=${limit}`,
    );
    return response.data;
  }

  async getOrganization(id: string): Promise<ApiResponse<Organization>> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/organizations/${id}`,
    );
    return response.data;
  }

  async createOrganization(
    data: CreateOrganizationRequest,
  ): Promise<ApiResponse<Organization>> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      "/api/organizations",
      data,
    );
    return response.data;
  }

  async updateOrganization(
    id: string,
    data: UpdateOrganizationRequest,
  ): Promise<ApiResponse<Organization>> {
    const response: AxiosResponse<ApiResponse> = await this.api.put(
      `/api/organizations/${id}`,
      data,
    );
    return response.data;
  }

  async deleteOrganization(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(
      `/api/organizations/${id}`,
    );
    return response.data;
  }

  async getOrganizationUsers(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/organizations/${id}/users`,
    );
    return response.data;
  }

  async updateWhatsAppConfig(
    id: string,
    config: WhatsAppConfig,
  ): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.put(
      `/organizations/${id}/whatsapp-config`,
      config,
    );
    return response.data;
  }

  async getWhatsAppConfig(id: string): Promise<ApiResponse<WhatsAppConfig>> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/organizations/${id}/whatsapp-config`,
    );
    return response.data;
  }

  // User endpoints
  async getUsers(
    page = 1,
    limit = 10,
    organizationId?: string,
  ): Promise<ApiResponse<UserListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (organizationId) params.append("organization_id", organizationId);
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/users?${params}`,
    );
    return response.data;
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/users/${id}`,
    );
    return response.data;
  }

  async createUser(data: CreateUserRequest): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      "/api/users",
      data,
    );
    return response.data;
  }

  async updateUser(
    id: string,
    data: UpdateUserRequest,
  ): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse> = await this.api.put(
      `/api/users/${id}`,
      data,
    );
    return response.data;
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(
      `/api/users/${id}`,
    );
    return response.data;
  }

  // Template endpoints (compatible + backend-specific)
  // 1) Backend-specific: get organization templates
  async getOrganizationTemplates(
    organizationId: string,
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<TemplateListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/templates/organization/${organizationId}?${params}`,
    );
    return response.data;
  }

  // 2) Backend-specific: create template for an organization
  async createTemplateForOrganization(
    organizationId: string,
    data: CreateTemplateRequest,
  ): Promise<ApiResponse<Template>> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/templates/organization/${organizationId}`,
      data,
    );
    return response.data;
  }

  // 3) Backend-specific: get pending approval templates (admin review queue)
  async getPendingApprovalTemplates(
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<TemplateListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/templates/pending-approval?${params}`,
    );
    return response.data;
  }

  // 4) Backend-specific: sync from WhatsApp API for an organization
  async syncTemplatesFromWhatsApp(
    organizationId: string,
  ): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/templates/organization/${organizationId}/sync-whatsapp`,
    );
    return response.data;
  }

  // Legacy-compatible generic list (kept for compatibility where used)
  async getTemplates(
    page = 1,
    limit = 10,
    organizationId?: string,
    status?: string,
  ): Promise<ApiResponse<TemplateListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (organizationId) params.append("organization_id", organizationId);
    if (status) params.append("status", status);
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/templates?${params}`,
    );
    return response.data;
  }

  async getTemplate(id: string): Promise<ApiResponse<Template>> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/templates/${id}`,
    );
    return response.data;
  }

  async createTemplate(
    data: CreateTemplateRequest,
  ): Promise<ApiResponse<Template>> {
    // If organization_id provided, prefer backend's org-specific route
    if (data.organization_id) {
      return this.createTemplateForOrganization(data.organization_id, data);
    }
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      "/api/templates",
      data,
    );
    return response.data;
  }

  async updateTemplate(
    id: string,
    data: UpdateTemplateRequest,
  ): Promise<ApiResponse<Template>> {
    const response: AxiosResponse<ApiResponse> = await this.api.put(
      `/api/templates/${id}`,
      data,
    );
    return response.data;
  }

  async deleteTemplate(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(
      `/api/templates/${id}`,
    );
    return response.data;
  }

  async submitTemplate(id: string): Promise<ApiResponse> {
    // Backend route: /api/templates/:id/submit-approval
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/templates/${id}/submit-approval`,
    );
    return response.data;
  }

  async approveTemplate(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/templates/${id}/approve`,
    );
    return response.data;
  }

  async rejectTemplate(id: string, reason: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/templates/${id}/reject`,
      { reason },
    );
    return response.data;
  }

  // Campaign endpoints
  async getCampaigns(
    page = 1,
    limit = 10,
    organizationId?: string,
    status?: string,
  ): Promise<ApiResponse<CampaignListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append("status", status);
    // Enforce organization-scoped endpoint to match backend and avoid 404 on global route
    if (!organizationId) {
      throw new Error("organizationId is required to fetch campaigns");
    }
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/campaigns/organization/${organizationId}?${params}`,
    );
    return response.data;
  }

  async getCampaign(id: string): Promise<ApiResponse<Campaign>> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/campaigns/${id}`,
    );
    return response.data;
  }

  async createCampaignForOrganization(
    organizationId: string,
    data: CreateCampaignRequest,
  ): Promise<ApiResponse<Campaign>> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/campaigns/organization/${organizationId}`,
      data,
    );
    return response.data;
  }

  async createCampaign(
    organizationId: string,
    data: CreateCampaignRequest,
  ): Promise<ApiResponse<Campaign>> {
    if (!organizationId) {
      throw new Error("organizationId is required to create a campaign");
    }
    return this.createCampaignForOrganization(organizationId, data);
  }

  async updateCampaign(
    id: string,
    data: UpdateCampaignRequest,
  ): Promise<ApiResponse<Campaign>> {
    const response: AxiosResponse<ApiResponse> = await this.api.put(
      `/api/campaigns/${id}`,
      data,
    );
    return response.data;
  }

  async deleteCampaign(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(
      `/api/campaigns/${id}`,
    );
    return response.data;
  }

  async submitCampaign(id: string): Promise<ApiResponse> {
    // Suppress global toast so UI can handle and show a clean message
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/campaigns/${id}/submit-approval`,
      undefined,
      { suppressToast: true } as any,
    );
    return response.data;
  }

  async approveCampaign(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/campaigns/${id}/approve`,
    );
    return response.data;
  }

  async rejectCampaign(id: string, reason: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/campaigns/${id}/reject`,
      { reason },
    );
    return response.data;
  }

  // Pending Campaign Approvals
  async getPendingCampaignApprovals(
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<CampaignListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/campaigns/pending-approval?${params}`,
    );
    return response.data;
  }

  async startCampaign(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/campaigns/${id}/start`,
    );
    return response.data;
  }

  async pauseCampaign(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/campaigns/${id}/pause`,
    );
    return response.data;
  }

  async cancelCampaign(id: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/campaigns/${id}/cancel`,
    );
    return response.data;
  }

  async getCampaignStatistics(
    organizationId?: string,
  ): Promise<ApiResponse<CampaignStatistics>> {
    // Avoid calling a conflicting global path like /api/campaigns/statistics which some backends treat as /api/campaigns/:id
    if (!organizationId) {
      throw new Error(
        "organizationId is required to fetch campaign statistics",
      );
    }
    const params = `?organization_id=${organizationId}`;
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/campaigns/statistics${params}`,
    );
    return response.data;
  }

  // Organization-scoped Audience endpoints (updated to use global endpoint with org parameter)
  async getOrganizationAudience(
    organizationId: string,
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<AudienceListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      organization_id: organizationId,
    });
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/audience?${params}`,
    );
    return response.data;
  }

  // Master audience routes (create/update single master record, and bulk upsert) with minimal bodies
  async createMasterAudienceRecord(
    organizationId: string,
    body: any = {},
    id?: string,
  ): Promise<ApiResponse> {
    const bodyWithOrg = { ...body, organization_id: organizationId };
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/campaigns/${id}/audience`,
      bodyWithOrg,
    );
    return response.data;
  }

  async bulkCreateMasterAudience(
    organizationId: string,
    body: any = {},
  ): Promise<ApiResponse> {
    const bodyWithOrg = { ...body, organization_id: organizationId };
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/audience/bulk`,
      bodyWithOrg,
    );
    return response.data;
  }

  //Admin Approval endpoints
  async getPendingAdminApprovalTemplates(
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<TemplateListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/templates/pending-admin-approval?${params}`,
    );
    return response.data;
  }

  async approveAdminTemplates(
    templateId: string,
    body?: any,
  ): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/templates/${templateId}/admin-approve`,
      body ?? {},
    );
    return response.data;
  }

  async rejectAdminTemplates(
    templateId: string,
    body?: any,
  ): Promise<ApiResponse> {
    const payload =
      typeof body === "string" ? { rejection_reason: body } : (body ?? {});
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/templates/${templateId}/admin-reject`,
      payload,
    );
    return response.data;
  }

  // Campaign Audience endpoints
  async getCampaignAudience(
    campaignId: string,
    page = 1,
    limit = 10,
    includeReplies = false,
  ): Promise<ApiResponse<CampaignAudienceListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (includeReplies) {
      params.append("include_replies", "true");
    }
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/campaigns/${campaignId}/audience?${params}`,
    );
    return response.data;
  }

  // async addAudienceToCampaign(
  //   campaignId: string,
  //   audienceList: Array<{ name: string; msisdn: string; attributes?: any }>,
  // ): Promise<ApiResponse> {
  //   // Backend expects 'audience_list' with objects having 'name' and 'msisdn'
  //   const payload = { audience_list: audienceList };
  //   const response: AxiosResponse<ApiResponse> = await this.api.post(
  //     `/api/campaigns/${campaignId}/audience`,
  //     payload,
  //   );
  //   return response.data;
  // }

  async addAudienceToCampaign(
    campaignId: string,
    audienceList: Array<{ name: string; msisdn: string; attributes?: any }>,
  ): Promise<ApiResponse> {
    // Backend expects 'audience_list'
    const payload = { audience_list: audienceList };

    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/campaigns/${campaignId}/audience`,
      payload,
    );

    // console.log("resposne data:-", response.data);

    return response.data;
  }

  async removeAudienceFromCampaign(
    campaignId: string,
    audienceId: string,
  ): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(
      `/api/campaigns/${campaignId}/audience/${audienceId}`,
    );
    return response.data;
  }

  //Asset Generation endpoints
  async generateAssets(templateId: string, body?: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/asset-files/template/${templateId}`,
      body ?? {},
    );
    return response.data;
  }

  async getAssetFiles(templateId: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/asset-files/template/${templateId}?include_inactive=false`,
    );
    return response.data;
  }

  async getOrgAssetFiles(
    organizationId: string,
    page = 1,
    limit = 10,
  ): Promise<ApiResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/asset-files/organization/${organizationId}?${params}`,
    );
    return response.data;
  }

  // Additional Asset File endpoints
  async updateAssetFile(assetFileId: string, data: any): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.put(
      `/api/asset-files/${assetFileId}`,
      data,
    );
    return response.data;
  }

  async createAssetFileVersion(
    templateId: string,
    data: { file_name: string; content?: any; metadata?: any },
  ): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(
      `/api/asset-files/template/${templateId}/version`,
      data,
    );
    return response.data;
  }

  async getAssetFileVersions(
    templateId: string,
    fileName: string,
  ): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/asset-files/template/${templateId}/versions/${encodeURIComponent(
        fileName,
      )}`,
    );
    return response.data;
  }

  async deactivateAssetFile(assetFileId: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(
      `/api/asset-files/${assetFileId}`,
    );
    return response.data;
  }

  async deleteAssetFile(assetFileId: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(
      `/api/asset-files/${assetFileId}`,
    );
    return response.data;
  }

  // Dashboard endpoints
  async getDashboardOverview(): Promise<ApiResponse<any>> {
    const response = await this.api.get("/api/dashboard/overview");
    return response.data;
  }

  async getDashboardStats(): Promise<ApiResponse<any>> {
    const response = await this.api.get("/api/dashboard/stats");
    return response.data;
  }

  async getDashboardActivities(limit: number = 10): Promise<ApiResponse<any>> {
    const response = await this.api.get(
      `/api/dashboard/activities?limit=${limit}`,
    );
    return response.data;
  }

  // Global audience endpoint for super/system admins
  async getGlobalAudience(
    page = 1,
    limit = 10,
    search?: string,
    countryCode?: string,
    organizationId?: string,
  ): Promise<ApiResponse<AudienceListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append("search", search);
    if (countryCode) params.append("country_code", countryCode);
    if (organizationId) params.append("organization_id", organizationId);
    const response: AxiosResponse<ApiResponse> = await this.api.get(
      `/api/audience?${params}`,
    );
    return response.data;
  }

  // Chatbot endpoints

  async getChatingInbox(): Promise<ApiResponse<any>> {
    const response = await this.api.get("/api/messages/inbox");
    return response.data;
  }

  async getConversationMessages(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/messages/${id}/messages`);
    return response.data;
  }

  async sendMessage(
    id: string,
    body: Record<string, any>,
  ): Promise<ApiResponse<any>> {
    console.log("Sending message:", body);

    const response = await this.api.post(
      `/api/messages/${id}/send`,
      body, // ✅ correct
    );

    return response.data;
  }

  async getIsActiveConversation(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/messages/${id}/is-active`);
    return response.data;
  }

  async uploadMedia(file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append("file", file);
    console.log("Uploading media:", file);
    const response = await this.api.post(
      "/api/messages/upload-media",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    console.log("Media uploaded:", response.data);
    return response.data;
  }
}

export default new ApiService();
