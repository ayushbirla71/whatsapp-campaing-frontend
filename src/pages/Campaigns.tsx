import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignStatistics,
} from "../types/campaign";
import { Organization } from "../types/organization";
import { Template } from "../types/template";
import { Audience, CampaignAudience } from "../types/audience";
import {
  Plus,
  Search,
  Edit,
  Send,
  Pause,
  Play,
  X,
  Check,
  Trash2,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";

type Status =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "ASSET_GENERATION"
  | "ASSET_GENERATED"
  | "READY_TO_LAUNCH"
  | "RUNNING"
  | "PAUSED"
  | "CANCELLED"
  | "COMPLETED";

const Campaigns: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<CampaignStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | Status>("");
  const [organizationId, setOrganizationId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);

  const [audienceOpen, setAudienceOpen] = useState(false);
  const [campaignAudience, setCampaignAudience] = useState<CampaignAudience[]>(
    [],
  );
  const [audiencePage, setAudiencePage] = useState(1);
  const [audienceTotalPages, setAudienceTotalPages] = useState(1);
  const [audienceIdsInput, setAudienceIdsInput] = useState("");

  const [customRetry, setCustomRetry] = useState(false);
  const [retryCount, setRetryCount] = useState<number>(1);

  // New Campaign form state (request body only)
  const [form, setForm] = useState<CreateCampaignRequest>({
    name: "",
    description: "",
    template_id: "",
    campaign_type: "scheduled",
    scheduled_at: "",
    buffer_hours: 48,
  });
  // Organization selection for create (sent via URL path, not body)
  const [createOrgId, setCreateOrgId] = useState("");

  const canAdminAllOrgs =
    user?.role === "super_admin" || user?.role === "system_admin";
  const effectiveOrgId = canAdminAllOrgs
    ? organizationId
    : user?.organization_id || "";

  useEffect(() => {
    if (canAdminAllOrgs) loadOrganizations();
  }, [canAdminAllOrgs]);

  useEffect(() => {
    loadCampaigns();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, effectiveOrgId, status]);

  useEffect(() => {
    // Load templates for the organization, then filter admin-approved client-side
    const loadApprovedTemplates = async (orgId: string) => {
      try {
        if (!orgId) {
          setTemplates([]);
          return;
        }
        const res = await api.getOrganizationTemplates(orgId, 1, 100);
        if (res.success && res.data) {
          const raw = (res.data.templates || []) as any[];
          const isAdminApproved = (t: any): boolean => {
            const val =
              t?.approved_by_admin ??
              t?.admin_approval_status ??
              t?.adminApproved ??
              t?.components_approval?.admin;
            if (typeof val === "boolean") return val;
            if (typeof val === "string") {
              const v = val.toLowerCase();
              return (
                v === "approved" || v === "true" || v === "1" || v === "yes"
              );
            }
            if (typeof val === "number") return val === 1;
            return false;
          };
          const adminApprovedTemplates: Template[] =
            raw.filter(isAdminApproved);
          setTemplates(adminApprovedTemplates);
        }
      } catch (e) {
        setTemplates([]);
      }
    };

    // Determine which org to use for template fetch
    const orgIdForTemplates = showCreate
      ? canAdminAllOrgs
        ? createOrgId
        : user?.organization_id || ""
      : effectiveOrgId;

    loadApprovedTemplates(orgIdForTemplates);
  }, [
    effectiveOrgId,
    showCreate,
    createOrgId,
    canAdminAllOrgs,
    user?.organization_id,
  ]);

  const loadOrganizations = async () => {
    try {
      const res = await api.getOrganizations(1, 100);
      if (res.success && res.data) setOrganizations(res.data.organizations);
    } catch (e) {}
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      // Many backends do not expose a global campaigns list route.
      // For super/system admins, require an organization to be selected before fetching.
      if (!effectiveOrgId && canAdminAllOrgs) {
        setCampaigns([]);
        setTotalPages(1);
        return;
      }
      const res = await api.getCampaigns(
        currentPage,
        10,
        effectiveOrgId || undefined,
        status || undefined,
      );
      if (res.success && res.data) {
        setCampaigns(res.data.campaigns);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Compute statistics client-side from the campaigns we already fetched
    if (!campaigns || campaigns.length === 0) {
      setStats(null);
      return;
    }
    const toKey = (s: string) => String(s || "").toUpperCase();
    const counts = campaigns.reduce(
      (acc: any, c) => {
        const s = toKey((c as any).status);
        acc.total_campaigns += 1;
        if (s === "DRAFT") acc.draft += 1;
        else if (s === "PENDING") acc.pending += 1;
        else if (s === "APPROVED") acc.approved += 1;
        else if (s === "RUNNING") acc.running += 1;
        else if (s === "PAUSED") acc.paused += 1;
        else if (s === "CANCELLED") acc.cancelled += 1;
        else if (s === "COMPLETED") acc.completed += 1;
        return acc;
      },
      {
        total_campaigns: 0,
        draft: 0,
        pending: 0,
        approved: 0,
        running: 0,
        paused: 0,
        cancelled: 0,
        completed: 0,
      },
    );
    setStats(counts);
  };

  const filtered = useMemo(() => {
    return campaigns.filter(
      (c) =>
        search.trim() === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [campaigns, search]);

  const openCreate = () => {
    setForm({
      name: "",
      description: "",
      template_id: "",
      campaign_type: "scheduled",
      scheduled_at: "",
      buffer_hours: 48,
    });
    setCreateOrgId(canAdminAllOrgs ? "" : user?.organization_id || "");
    setShowCreate(true);
  };

  const openEdit = (c: Campaign) => {
    setSelected(c);
    setForm({
      name: c.name,
      description: c.description || "",
      template_id: c.template_id,
      campaign_type: "scheduled",
      scheduled_at: c.scheduled_at || "",
      buffer_hours: 48,
    });
    setShowEdit(true);
  };

  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled">(
    "scheduled",
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgId = canAdminAllOrgs
        ? createOrgId || ""
        : user?.organization_id || "";
      // const isoScheduled = form.scheduled_at
      //   ? new Date(form.scheduled_at).toISOString()
      //   : "";
      const scheduledDate =
        scheduleType === "immediate"
          ? new Date().toISOString()
          : form.scheduled_at
            ? new Date(form.scheduled_at).toISOString()
            : "";
      const payload: CreateCampaignRequest = {
        name: form.name,
        description: form.description,
        template_id: form.template_id,
        // campaign_type: "scheduled",
        campaign_type: scheduleType,
        // scheduled_at: isoScheduled,
        scheduled_at: scheduledDate,
        buffer_hours: form.buffer_hours ?? 48,
        retry_count: customRetry ? retryCount : undefined,
      };
      await api.createCampaign(orgId, payload);
      setShowCreate(false);
      toast.success("Campaign created successfully");
      loadCampaigns();
      loadStats();
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to create campaign",
      );
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const upd: UpdateCampaignRequest = {
        name: form.name,
        description: form.description,
        scheduled_at: form.scheduled_at || undefined,
      };
      const sid =
        (selected as any).id ||
        (selected as any).campaign_id ||
        (selected as any)._id;
      await api.updateCampaign(sid, upd);
      setShowEdit(false);
      setSelected(null);
      loadCampaigns();
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to update campaign");
    }
  };

  const submitCampaign = async (id: string) => {
    try {
      await api.submitCampaign(id);
      toast.success("Campaign submitted for approval");
      await loadCampaigns();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to submit campaign";
      toast.error(msg);
    }
  };
  const approveCampaign = async (id: string) => {
    // Find the campaign to extract template_id
    const camp =
      campaigns.find((c) => ((c as any).id || (c as any).campaign_id) === id) ||
      null;
    try {
      setLoading(true);
      await api.approveCampaign(id);
      // After approval, generate assets for the associated template
      const tplId =
        camp?.template_id ||
        (camp as any)?.template?._id ||
        (camp as any)?.template?.id;
      if (tplId) {
        await api.generateAssets(String(tplId));
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message || "Failed to approve or generate assets",
      );
    } finally {
      // Refresh campaigns which should reflect READY_TO_LAUNCH after assets are generated (per backend lifecycle)
      await loadCampaigns();
      setLoading(false);
    }
  };
  const rejectCampaign = async (id: string) => {
    const reason = prompt("Rejection reason?") || "";
    await api.rejectCampaign(id, reason);
    loadCampaigns();
  };
  const startCampaign = async (id: string) => {
    await api.startCampaign(id);
    loadCampaigns();
    loadStats();
  };
  const pauseCampaign = async (id: string) => {
    await api.pauseCampaign(id);
    loadCampaigns();
  };
  const deleteCampaign = async (id: string) => {
    await api.deleteCampaign(id);
    loadCampaigns();
    loadStats();
  };

  const openAudience = async (c: Campaign) => {
    setSelected(c);
    setAudiencePage(1);
    setAudienceIdsInput("");
    setAudienceOpen(true);
    await loadCampaignAudience(c._id, 1);
  };

  const loadCampaignAudience = async (campaignId: string, page: number) => {
    try {
      const res = await api.getCampaignAudience(campaignId, page, 10);
      if (res.success && res.data) {
        setCampaignAudience(res.data.campaign_audience);
        setAudienceTotalPages(res.data.pagination.totalPages);
      }
    } catch (e) {}
  };

  const handleAddAudience = async () => {
    if (!selected) return;
    const tokens = audienceIdsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;
    // Support both formats:
    // 1) name:msisdn
    // 2) msisdn (name will be auto-generated)
    const now = Date.now();
    const list = tokens
      .map((t, idx) => {
        if (t.includes(":")) {
          const [nameRaw, msisdnRaw] = t.split(":");
          const name = (nameRaw || "").trim() || `Audience ${now}-${idx}`;
          const msisdn = (msisdnRaw || "").trim();
          return { name, msisdn };
        }
        return { name: `Audience ${now}-${idx}`, msisdn: t };
      })
      .filter((item) => item.msisdn);
    if (list.length === 0) return;
    await api.addAudienceToCampaign(selected._id, list);
    await loadCampaignAudience(selected._id, audiencePage);
    setAudienceIdsInput("");
  };

  const handleRemoveAudience = async (audienceId: string) => {
    if (!selected) return;
    await api.removeAudienceFromCampaign(selected._id, audienceId);
    await loadCampaignAudience(selected._id, audiencePage);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Campaign Management
          </h1>
          <p className="text-gray-600">
            Create, schedule, approve, run and track campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === "super_admin" || user?.role === "system_admin") && (
            <button
              onClick={() => navigate("/campaigns/approval")}
              className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
            >
              Pending Approvals
            </button>
          )}
          <button
            onClick={openCreate}
            className="bg-whatsapp-500 text-white px-4 py-2 rounded-lg hover:bg-whatsapp-600 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" /> New Campaign
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total_campaigns },
            { label: "Draft", value: stats.draft },
            { label: "Pending", value: stats.pending },
            { label: "Approved", value: stats.approved },
            { label: "Running", value: stats.running },
            { label: "Paused", value: stats.paused },
            { label: "Cancelled", value: stats.cancelled },
            { label: "Completed", value: stats.completed },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-lg shadow p-4 text-center"
            >
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-semibold text-gray-900">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name/description" className="pl-10 pr-3 py-2 border rounded-lg w-full" />
          </div> */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">Select Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="RUNNING">Running</option>
            <option value="PAUSED">Paused</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
          {canAdminAllOrgs && (
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Select Organizations</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Targeted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Scheduled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    {canAdminAllOrgs && !effectiveOrgId
                      ? "Select Organization"
                      : "No campaigns found"}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const cid = (c as any).id || (c as any).campaign_id;
                  const s = String((c as any).status || "").toUpperCase();
                  const totalTargeted = (c as any).total_targeted_audience || 0;
                  const createdByName = `${(c as any).created_by_name || ""} ${
                    (c as any).created_by_lastname || ""
                  }`.trim();
                  const templateName =
                    (c as any).template_name || c.template?.name || "-";
                  const templateCategory = (c as any).template_category || "";

                  // Show action buttons only if status is not draft or pending
                  const showActionButtons = s !== "DRAFT" && s !== "PENDING";

                  return (
                    <tr key={cid} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {cid ? (
                              <button
                                onClick={() => navigate(`/campaigns/${cid}`)}
                                className="text-blue-600 hover:underline"
                                title={`Open ${c.name}`}
                              >
                                {c.name}
                              </button>
                            ) : (
                              c.name
                            )}
                          </div>
                          {c.description && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                              {c.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            Created:{" "}
                            {new Date(c.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            s === "RUNNING"
                              ? "bg-green-100 text-green-800"
                              : s === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : s === "APPROVED"
                                  ? "bg-blue-100 text-blue-800"
                                  : s === "ASSET_GENERATION"
                                    ? "bg-indigo-100 text-indigo-800"
                                    : s === "ASSET_GENERATED"
                                      ? "bg-teal-100 text-teal-800"
                                      : s === "READY_TO_LAUNCH"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : s === "PAUSED"
                                          ? "bg-orange-100 text-orange-800"
                                          : s === "CANCELLED"
                                            ? "bg-red-100 text-red-800"
                                            : s === "COMPLETED"
                                              ? "bg-gray-200 text-gray-800"
                                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {s.toLowerCase().replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col">
                          <div className="text-gray-900 font-medium">
                            {templateName}
                          </div>
                          {templateCategory && (
                            <div className="text-xs text-gray-500 mt-1">
                              {templateCategory}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-medium text-gray-900">
                          {totalTargeted}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {c.scheduled_at
                          ? new Date(c.scheduled_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {createdByName || "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          {s === "DRAFT" && (
                            <button
                              onClick={() => submitCampaign(cid)}
                              className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded inline-flex items-center"
                              title="Submit"
                            >
                              <Send className="h-4 w-4" />
                              <span className="ml-1 text-sm">Submit</span>
                            </button>
                          )}
                          {(user?.role === "super_admin" ||
                            user?.role === "system_admin") &&
                            s === "PENDING" && (
                              <>
                                <button
                                  onClick={() => approveCampaign(cid)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded"
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => rejectCampaign(cid)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          {s !== "DRAFT" && s !== "PENDING" && (
                            <>
                              {s === "RUNNING" && (
                                <button
                                  onClick={() => pauseCampaign(cid)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                                  title="Pause"
                                >
                                  <Pause className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                          {s === "PENDING" && (
                            <button
                              onClick={() => openEdit(c)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteCampaign(cid)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Cancel"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className="px-3 py-1 border rounded"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                className="px-3 py-1 border rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Create Campaign</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {canAdminAllOrgs && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Organization
                  </label>
                  <select
                    value={createOrgId}
                    onChange={(e) => {
                      setCreateOrgId(e.target.value);
                      setForm({ ...form, template_id: "" });
                    }}
                    required
                    className="mt-1 w-full border rounded px-3 py-2"
                  >
                    <option value="">Select organization</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Approved Template
                  </label>
                  <select
                    value={form.template_id}
                    onChange={(e) =>
                      setForm({ ...form, template_id: e.target.value })
                    }
                    required
                    className="mt-1 w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Template</option>
                    {templates.map((t) => {
                      const ident = (t as any).id || t._id;
                      return (
                        <option key={ident} value={ident}>
                          {t.name}
                        </option>
                      );
                    })}
                  </select>
                  {templates.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No admin-approved templates found for the selected
                      organization. Go to the Organization Approval page to Sync
                      WhatsApp and Approve templates.
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="customRetry"
                    checked={customRetry}
                    onChange={(e) => setCustomRetry(e.target.checked)}
                    className="h-4 w-4"
                  />

                  <label
                    htmlFor="customRetry"
                    className="text-sm font-medium text-gray-700"
                  >
                    Customize Retry Count
                  </label>

                  {/* Info Tooltip */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="w-4 h-4 flex items-center justify-center rounded-full  text-xs font-bold "
                    >
                      <Info />
                    </button>

                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 text-xs text-white bg-black rounded px-3 py-2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                      Retry count defines how many times the system will retry
                      sending the campaign message if delivery fails.
                    </div>
                  </div>
                </div>

                {/* Retry Count Dropdown */}
                {customRetry && (
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700">
                      Retry Count
                    </label>
                    <select
                      value={retryCount}
                      onChange={(e) => setRetryCount(Number(e.target.value))}
                      className="mt-1 w-full border rounded px-3 py-2"
                    >
                      {[1, 2, 3, 4, 5].map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Schedule Type Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Schedule Type
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => {
                      const value = e.target.value as "immediate" | "scheduled";
                      setScheduleType(value);

                      // If Immediate → auto set current date
                      if (value === "immediate") {
                        setForm({
                          ...form,
                          scheduled_at: new Date().toISOString().slice(0, 16),
                        });
                      } else {
                        setForm({ ...form, scheduled_at: "" });
                      }
                    }}
                    className="mt-1 w-full border rounded px-3 py-2"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="scheduled">Schedule</option>
                  </select>
                </div>

                {/* Scheduled DateTime (only when scheduled) */}
                {scheduleType === "scheduled" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Schedule Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={form.scheduled_at || ""}
                      onChange={(e) =>
                        setForm({ ...form, scheduled_at: e.target.value })
                      }
                      className="mt-1 w-full border rounded px-3 py-2"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Schedule
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.scheduled_at || ""}
                    onChange={(e) =>
                      setForm({ ...form, scheduled_at: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                </div> */}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Buffer Hours
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.buffer_hours}
                    onChange={(e) =>
                      setForm({ ...form, buffer_hours: Number(e.target.value) })
                    }
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    templates.length === 0 ||
                    !form.name ||
                    !form.template_id ||
                    !form.scheduled_at ||
                    !(canAdminAllOrgs ? createOrgId : user?.organization_id)
                  }
                  className={`px-4 py-2 rounded text-white ${
                    templates.length === 0 ||
                    !form.name ||
                    !form.template_id ||
                    !form.scheduled_at ||
                    !(canAdminAllOrgs ? createOrgId : user?.organization_id)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-whatsapp-500 hover:bg-whatsapp-600"
                  }`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Campaign</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Schedule
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at || ""}
                    onChange={(e) =>
                      setForm({ ...form, scheduled_at: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-whatsapp-500 text-white rounded"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audience Modal */}
      {audienceOpen && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Campaign Audience — {selected.name}
              </h3>
              <button
                onClick={() => setAudienceOpen(false)}
                className="px-3 py-1 bg-gray-100 rounded"
              >
                Close
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Add Audience (comma-separated: name:msisdn or msisdn)
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  value={audienceIdsInput}
                  onChange={(e) => setAudienceIdsInput(e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="John:919876543210, Jane:919999999999 or 919876543210"
                />
                <button
                  onClick={handleAddAudience}
                  className="px-4 py-2 bg-whatsapp-500 text-white rounded"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="border rounded">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaignAudience.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          No audience
                        </td>
                      </tr>
                    ) : (
                      campaignAudience.map((ca) => (
                        <tr key={ca._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {ca.audience?.first_name} {ca.audience?.last_name}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {ca.audience?.phone_number}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                ca.status === "DELIVERED"
                                  ? "bg-green-100 text-green-800"
                                  : ca.status === "READ"
                                    ? "bg-blue-100 text-blue-800"
                                    : ca.status === "FAILED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {ca.status.toLowerCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            <button
                              onClick={() =>
                                handleRemoveAudience(ca.audience_id)
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {audienceTotalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Page {audiencePage} of {audienceTotalPages}
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={async () => {
                        const p = Math.max(1, audiencePage - 1);
                        setAudiencePage(p);
                        await loadCampaignAudience(selected._id, p);
                      }}
                      className="px-3 py-1 border rounded"
                    >
                      Prev
                    </button>
                    <button
                      onClick={async () => {
                        const p = Math.min(
                          audienceTotalPages,
                          audiencePage + 1,
                        );
                        setAudiencePage(p);
                        await loadCampaignAudience(selected._id, p);
                      }}
                      className="px-3 py-1 border rounded"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
