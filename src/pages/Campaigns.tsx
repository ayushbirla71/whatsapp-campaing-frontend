import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Campaign, CreateCampaignRequest, UpdateCampaignRequest, CampaignStatistics } from '../types/campaign';
import { Organization } from '../types/organization';
import { Template } from '../types/template';
import { Audience, CampaignAudience } from '../types/audience';
import { Plus, Search, Edit, Send, Pause, Play, X, Check, Trash2 } from 'lucide-react';

type Status = 'DRAFT' | 'PENDING' | 'APPROVED' | 'RUNNING' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';

const Campaigns: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<CampaignStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | Status>('');
  const [organizationId, setOrganizationId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);

  const [audienceOpen, setAudienceOpen] = useState(false);
  const [campaignAudience, setCampaignAudience] = useState<CampaignAudience[]>([]);
  const [audiencePage, setAudiencePage] = useState(1);
  const [audienceTotalPages, setAudienceTotalPages] = useState(1);
  const [audienceIdsInput, setAudienceIdsInput] = useState('');

  // New Campaign form state (request body only)
  const [form, setForm] = useState<CreateCampaignRequest>({
    name: '',
    description: '',
    template_id: '',
    campaign_type: 'scheduled',
    scheduled_at: '',
    buffer_hours: 48,
  });
  // Organization selection for create (sent via URL path, not body)
  const [createOrgId, setCreateOrgId] = useState('');

  const canAdminAllOrgs = user?.role === 'super_admin' || user?.role === 'system_admin';
  const effectiveOrgId = canAdminAllOrgs ? organizationId : (user?.organization_id || '');

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
        if (!orgId) { setTemplates([]); return; }
        const res = await api.getOrganizationTemplates(orgId, 1, 100);
        if (res.success && res.data) {
          const raw = (res.data.templates || []) as any[];
          const isAdminApproved = (t: any): boolean => {
            const val = t?.approved_by_admin ?? t?.admin_approval_status ?? t?.adminApproved ?? t?.components_approval?.admin;
            if (typeof val === 'boolean') return val;
            if (typeof val === 'string') {
              const v = val.toLowerCase();
              return v === 'approved' || v === 'true' || v === '1' || v === 'yes';
            }
            if (typeof val === 'number') return val === 1;
            return false;
          };
          const adminApprovedTemplates: Template[] = raw.filter(isAdminApproved);
          setTemplates(adminApprovedTemplates);
        }
      } catch (e) { setTemplates([]); }
    };

    // Determine which org to use for template fetch
    const orgIdForTemplates = showCreate
      ? (canAdminAllOrgs ? createOrgId : (user?.organization_id || ''))
      : effectiveOrgId;

    loadApprovedTemplates(orgIdForTemplates);
  }, [effectiveOrgId, showCreate, createOrgId, canAdminAllOrgs, user?.organization_id]);

  const loadOrganizations = async () => {
    try {
      const res = await api.getOrganizations(1, 100);
      if (res.success && res.data) setOrganizations(res.data.organizations);
    } catch (e) {}
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.getCampaigns(currentPage, 10, effectiveOrgId || undefined, status || undefined);
      if (res.success && res.data) {
        setCampaigns(res.data.campaigns);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.getCampaignStatistics(effectiveOrgId || undefined);
      if (res.success && res.data) setStats(res.data);
    } catch (e) {}
  };

  const filtered = useMemo(() => {
    return campaigns.filter(c =>
      search.trim() === '' || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [campaigns, search]);

  const openCreate = () => {
    setForm({
      name: '',
      description: '',
      template_id: '',
      campaign_type: 'scheduled',
      scheduled_at: '',
      buffer_hours: 48,
    });
    setCreateOrgId(canAdminAllOrgs ? '' : (user?.organization_id || ''));
    setShowCreate(true);
  };

  const openEdit = (c: Campaign) => {
    setSelected(c);
    setForm({
      name: c.name,
      description: c.description || '',
      template_id: c.template_id,
      campaign_type: 'scheduled',
      scheduled_at: c.scheduled_at || '',
      buffer_hours: 48,
    });
    setShowEdit(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgId = canAdminAllOrgs ? (createOrgId || '') : (user?.organization_id || '');
      const isoScheduled = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : '';
      const payload: CreateCampaignRequest = {
        name: form.name,
        description: form.description,
        template_id: form.template_id,
        campaign_type: 'scheduled',
        scheduled_at: isoScheduled,
        buffer_hours: form.buffer_hours ?? 48,
      };
      await api.createCampaign(orgId, payload);
      setShowCreate(false);
      loadCampaigns();
      loadStats();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create campaign');
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
      const sid = (selected as any).id || (selected as any).campaign_id || (selected as any)._id;
      await api.updateCampaign(sid, upd);
      setShowEdit(false);
      setSelected(null);
      loadCampaigns();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update campaign');
    }
  };

  const submitCampaign = async (id: string) => { await api.submitCampaign(id); loadCampaigns(); };
  const approveCampaign = async (id: string) => { await api.approveCampaign(id); loadCampaigns(); };
  const rejectCampaign = async (id: string) => { const reason = prompt('Rejection reason?') || ''; await api.rejectCampaign(id, reason); loadCampaigns(); };
  const startCampaign = async (id: string) => { await api.startCampaign(id); loadCampaigns(); loadStats(); };
  const pauseCampaign = async (id: string) => { await api.pauseCampaign(id); loadCampaigns(); };
  const cancelCampaign = async (id: string) => { await api.cancelCampaign(id); loadCampaigns(); loadStats(); };

  const openAudience = async (c: Campaign) => {
    setSelected(c);
    setAudiencePage(1);
    setAudienceIdsInput('');
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
    const ids = audienceIdsInput.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    await api.addAudienceToCampaign(selected._id, ids);
    await loadCampaignAudience(selected._id, audiencePage);
    setAudienceIdsInput('');
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
          <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
          <p className="text-gray-600">Create, schedule, approve, run and track campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === 'super_admin' || user?.role === 'system_admin') && (
            <button onClick={() => navigate('/campaigns/approval')} className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">
              Pending Approvals
            </button>
          )}
          <button onClick={openCreate} className="bg-whatsapp-500 text-white px-4 py-2 rounded-lg hover:bg-whatsapp-600 flex items-center">
            <Plus className="h-4 w-4 mr-2" /> New Campaign
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total_campaigns },
            { label: 'Draft', value: stats.draft },
            { label: 'Pending', value: stats.pending },
            { label: 'Approved', value: stats.approved },
            { label: 'Running', value: stats.running },
            { label: 'Paused', value: stats.paused },
            { label: 'Cancelled', value: stats.cancelled },
            { label: 'Completed', value: stats.completed },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-semibold text-gray-900">{s.value}</div>
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
          <select value={status} onChange={e => setStatus(e.target.value as any)} className="px-3 py-2 border rounded-lg">
            <option value="">Select Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="RUNNING">Running</option>
            <option value="PAUSED">Paused</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
          {canAdminAllOrgs && (
            <select value={organizationId} onChange={e => setOrganizationId(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">Select Organizations</option>
              {organizations.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Select Organization</td></tr>
              ) : filtered.map(c => {
                const cid = (c as any).id || (c as any).campaign_id; // prefer UUID fields
                return (
                <tr key={cid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {cid ? (
                      <button onClick={() => navigate(`/campaigns/${cid}`)} className="text-blue-600 hover:underline" title={`Open ${c.name}`}>
                        {c.name}
                      </button>
                    ) : (
                      <span>{c.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      c.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                      c.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      c.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                      c.status === 'PAUSED' ? 'bg-orange-100 text-orange-800' :
                      c.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      c.status === 'COMPLETED' ? 'bg-gray-200 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{c.status.toLowerCase()}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{c.template?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(c.updated_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end space-x-2">
                      {c.status === 'draft'&& (
                        <button onClick={() => submitCampaign(cid)} className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded inline-flex items-center" title="Submit">
                          <Send className="h-4 w-4" />
                          <span className="ml-1 text-sm">Submit</span>
                        </button>
                      )}
                      {(user?.role === 'super_admin' || user?.role === 'system_admin') && c.status === 'PENDING' && (
                        <>
                          <button onClick={() => approveCampaign(cid)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Approve"><Check className="h-4 w-4" /></button>
                          <button onClick={() => rejectCampaign(cid)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Reject"><X className="h-4 w-4" /></button>
                        </>
                      )}
                      {c.status === 'APPROVED' && (
                        <button onClick={() => startCampaign(cid)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Start"><Play className="h-4 w-4" /></button>
                      )}
                      {c.status === 'RUNNING' && (
                        <button onClick={() => pauseCampaign(cid)} className="p-2 text-orange-600 hover:bg-orange-50 rounded" title="Pause"><Pause className="h-4 w-4" /></button>
                      )}
                      {c.status !== 'COMPLETED' && c.status !== 'CANCELLED' && (
                        <button onClick={() => cancelCampaign(cid)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Cancel"><Trash2 className="h-4 w-4" /></button>
                      )}
                      <button onClick={() => openEdit(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit"><Edit className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">Page {currentPage} of {totalPages}</div>
            <div className="space-x-2">
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="px-3 py-1 border rounded">Prev</button>
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className="px-3 py-1 border rounded">Next</button>
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
                  <label className="block text-sm font-medium text-gray-700">Organization</label>
                  <select value={createOrgId} onChange={e => { setCreateOrgId(e.target.value); setForm({ ...form, template_id: '' }); }} required className="mt-1 w-full border rounded px-3 py-2">
                    <option value="">Select organization</option>
                    {organizations.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1 w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Approved Template</label>
                  <select value={form.template_id} onChange={e => setForm({ ...form, template_id: e.target.value })} required className="mt-1 w-full border rounded px-3 py-2">
                    <option value="">Select Template</option>
                    {templates.map(t => {
                      const ident = (t as any).id || t._id;
                      return (<option key={ident} value={ident}>{t.name}</option>);
                    })}
                  </select>
                  {templates.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No admin-approved templates found for the selected organization. Go to the Organization Approval page to Sync WhatsApp and Approve templates.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Schedule</label>
                  <input type="datetime-local" required value={form.scheduled_at || ''} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Buffer Hours</label>
                  <input type="number" min={0} value={form.buffer_hours} onChange={e => setForm({ ...form, buffer_hours: Number(e.target.value) })} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={templates.length === 0 || !form.name || !form.template_id || !form.scheduled_at || !(canAdminAllOrgs ? createOrgId : (user?.organization_id))} className={`px-4 py-2 rounded text-white ${templates.length === 0 || !form.name || !form.template_id || !form.scheduled_at || !(canAdminAllOrgs ? createOrgId : (user?.organization_id)) ? 'bg-gray-400 cursor-not-allowed' : 'bg-whatsapp-500 hover:bg-whatsapp-600'}`}>Create</button>
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
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1 w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Schedule</label>
                  <input type="datetime-local" value={form.scheduled_at || ''} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-whatsapp-500 text-white rounded">Update</button>
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
              <h3 className="text-lg font-semibold">Campaign Audience — {selected.name}</h3>
              <button onClick={() => setAudienceOpen(false)} className="px-3 py-1 bg-gray-100 rounded">Close</button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Add Audience by IDs (comma-separated)</label>
              <div className="flex gap-2 mt-1">
                <input value={audienceIdsInput} onChange={e => setAudienceIdsInput(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="id1, id2, ..." />
                <button onClick={handleAddAudience} className="px-4 py-2 bg-whatsapp-500 text-white rounded">Add</button>
              </div>
            </div>
            <div className="border rounded">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaignAudience.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No audience</td></tr>
                    ) : campaignAudience.map((ca) => (
                      <tr key={ca._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{ca.audience?.first_name} {ca.audience?.last_name}</td>
                        <td className="px-6 py-4 text-sm">{ca.audience?.phone_number}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            ca.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                            ca.status === 'READ' ? 'bg-blue-100 text-blue-800' :
                            ca.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>{ca.status.toLowerCase()}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <button onClick={() => handleRemoveAudience(ca.audience_id)} className="p-2 text-red-600 hover:bg-red-50 rounded">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {audienceTotalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-700">Page {audiencePage} of {audienceTotalPages}</div>
                  <div className="space-x-2">
                    <button onClick={async () => { const p=Math.max(1, audiencePage-1); setAudiencePage(p); await loadCampaignAudience(selected._id, p); }} className="px-3 py-1 border rounded">Prev</button>
                    <button onClick={async () => { const p=Math.min(audienceTotalPages, audiencePage+1); setAudiencePage(p); await loadCampaignAudience(selected._id, p); }} className="px-3 py-1 border rounded">Next</button>
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
