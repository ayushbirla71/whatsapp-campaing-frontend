import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Template, CreateTemplateRequest, UpdateTemplateRequest } from '../types/template';
import { Organization } from '../types/organization';
import { Plus, Search, Eye, Trash2, Send, Check, X } from 'lucide-react';

type Category = 'MARKETING' | 'AUTHENTICATION' | 'UTILITY';
type Status = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

const Templates: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status] = useState<'' | Status>('');
  const [category, setCategory] = useState<'' | Category>('');
  const [organizationId, setOrganizationId] = useState('');
  const [viewPendingQueue] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<Template | null>(null);
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewComponents, setPreviewComponents] = useState<any>(null);
  const [previewContext, setPreviewContext] = useState<string>('');

  const [form, setForm] = useState<CreateTemplateRequest>({
    name: '',
    category: 'MARKETING',
    language: 'en',
    header_type: 'TEXT',
    header_text: '',
    body_text: '',
    footer_text: '',
    components: [],
    organization_id: '',
  });

  const canAdminAllOrgs = user?.role === 'super_admin' || user?.role === 'system_admin';
  const effectiveOrgId = canAdminAllOrgs ? organizationId : (user?.organization_id || '');

  useEffect(() => {
    if (canAdminAllOrgs) {
      loadOrganizations();
    }
  }, [canAdminAllOrgs]);

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, effectiveOrgId, status, viewPendingQueue]);

  // Sync create modal with route (/templates/new)
  useEffect(() => {
    const isCreateRoute = location.pathname.endsWith('/templates/new');
    setShowCreate(isCreateRoute);
  }, [location.pathname]);

  const loadOrganizations = async () => {
    try {
      const res = await api.getOrganizations(1, 100);
      if (res.success && res.data) setOrganizations(res.data.organizations);
    } catch (e) {
      // ignore
    }
  };

  // Determine approval from various backend shapes
  const isApproved = (item: any): boolean => {
    const v = item?.approved_by_admin ?? item?.approvedByAdmin ?? item?.admin_approved ?? item?.is_admin_approved ?? item?.approval_status ?? item?.status;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') {
      const s = v.toLowerCase();
      return s === 'approved' || s === 'true' || s === 'yes' || s === '1';
    }
    return false;
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      let res;
      if (viewPendingQueue) {
        // Admin review queue: GET /api/templates/pending-approval
        res = await api.getPendingApprovalTemplates(currentPage, 10);
      } else if (effectiveOrgId) {
        // Org-specific: GET /api/templates/organization/:id
        res = await api.getOrganizationTemplates(effectiveOrgId, currentPage, 10);
      } else {
        // No valid API route without org. Show empty state and return.
        setTemplates([]);
        setTotalPages(1);
        return;
      }
      if (res.success && res.data) {
        // Optional client-side category filter if provided
        let list = res.data.templates as Template[];
        if (category) list = list.filter(t => t.category === category);
        if (status) list = list.filter(t => t.status === status);
        if (search.trim()) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.body_text.toLowerCase().includes(search.toLowerCase()));
        setTemplates(list);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = search.trim() === '' ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.body_text.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === '' || t.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [templates, search, category]);

  const resetForm = () => {
    setForm({
      name: '',
      category: 'MARKETING',
      language: 'en',
      header_type: 'TEXT',
      header_text: '',
      body_text: '',
      footer_text: '',
      components: [],
      organization_id: canAdminAllOrgs ? '' : (user?.organization_id || ''),
    });
  };

  const openCreate = () => {
    resetForm();
    navigate('/templates/new');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openEdit = (tpl: Template) => {
    setSelected(tpl);
    const editForm: UpdateTemplateRequest & { organization_id?: string } = {
      name: tpl.name,
      category: tpl.category,
      language: tpl.language,
      header_type: tpl.header_type,
      header_text: tpl.header_text,
      body_text: tpl.body_text,
      footer_text: tpl.footer_text,
      components: tpl.components || [],
    };
    setForm({ ...(editForm as any), organization_id: tpl.organization_id });
    setShowEdit(true);
  };

  const openPreview = async (tpl: Template) => {
    try {
      setLoading(true);
      const templateId = (tpl as any).id || (tpl as any)._id;
      if (!templateId) {
        setError('Template ID is missing.');
        return;
      }
      const res: any = await api.getTemplate(templateId as string);
      // Be tolerant of varying API shapes
      const payload = res?.data ?? res?.template ?? res?.result ?? res;
      const components = payload?.components ?? payload?.data?.components ?? tpl.components ?? [];
      setPreviewTitle(tpl.name || 'Template Preview');
      setPreviewComponents(components);
      // Build preview context: extract text for components of type BODY
      const list = Array.isArray(components) ? components : [];
      const bodyTexts = list
        .filter((c: any) => {
          const t = (c?.type || c?.component_type || c?.name || '').toString().toUpperCase();
          return t === 'BODY';
        })
        .map((c: any) => c?.text || c?.body_text || c?.data?.text || c?.example || c?.content || '')
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0);
      setPreviewContext(bodyTexts.join('\n\n'));
      setShowPreview(true);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load template preview');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: CreateTemplateRequest = {
        ...form,
        organization_id: canAdminAllOrgs ? (form.organization_id || '') : (user?.organization_id || ''),
        components: (form.components || []).map(v => v.trim()).filter(Boolean),
      };
      await api.createTemplate(payload);
      setShowCreate(false);
      navigate('/templates');
      resetForm();
      loadTemplates();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create template');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const upd: UpdateTemplateRequest = {
        name: form.name,
        category: form.category,
        language: form.language,
        header_type: form.header_type,
        header_text: form.header_text,
        body_text: form.body_text,
        footer_text: form.footer_text,
        components: (form.components || []).map(v => v.trim()).filter(Boolean),
      };
      await api.updateTemplate(selected._id, upd);
      setShowEdit(false);
      setSelected(null);
      loadTemplates();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update template');
    }
  };

  const handleDelete = async (id: string, status: Status) => {
    if (!(status === 'DRAFT' || status === 'REJECTED')) return alert('Only draft/rejected templates can be deleted');
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.deleteTemplate(id);
      loadTemplates();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete template');
    }
  };

  const submitTemplate = async (id: string) => { await api.submitTemplate(id); loadTemplates(); };
  const approveTemplate = async (id: string) => { await api.approveTemplate(id); loadTemplates(); };
  const rejectTemplate = async (id: string) => {
    const reason = prompt('Rejection reason?') || '';
    await api.rejectTemplate(id, reason);
    loadTemplates();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Management</h1>
          <p className="text-gray-600">Create, edit, and manage approvals for WhatsApp templates.</p>
        </div>
        <div className="flex items-center gap-2">
          {/** Sync from WhatsApp visible if we have a concrete org target */}
          {(effectiveOrgId || (canAdminAllOrgs && organizationId)) && (
            <button
              onClick={async () => {
                const org = effectiveOrgId || organizationId;
                await api.syncTemplatesFromWhatsApp(org);
                loadTemplates();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Sync WhatsApp
            </button>
          )}
          {(user?.role === 'super_admin' || user?.role === 'system_admin' || user?.role === 'organization_admin') && (
            <button onClick={openCreate} className="bg-whatsapp-500 text-white px-4 py-2 rounded-lg hover:bg-whatsapp-600 flex items-center">
              <Plus className="h-4 w-4 mr-2" /> New Template
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
          {/* <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name/body" className="pl-10 pr-3 py-2 border rounded-lg w-full" />
          </div> */}
          {/* <select value={status} onChange={e => setStatus(e.target.value as any)} className="px-3 py-2 border rounded-lg">
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select> */}
          <select value={category} onChange={e => setCategory(e.target.value as any)} className="px-3 py-2 border rounded-lg">
            <option value="">Select Category</option>
            <option value="MARKETING">Marketing</option>
            <option value="AUTHENTICATION">Authentication</option>
            <option value="UTILITY">Utility</option>
          </select>
          {canAdminAllOrgs && (
            <select value={organizationId} onChange={e => setOrganizationId(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">Select Organizations</option>
              {organizations.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          {/* {canAdminAllOrgs && (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={viewPendingQueue} onChange={e => { setCurrentPage(1); setViewPendingQueue(e.target.checked); }} />
              View Pending Approval Queue
            </label>
          )} */}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : (!effectiveOrgId && !viewPendingQueue) ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Select an organization or enable the pending approval queue to view templates.</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No templates</td></tr>
              ) : filtered.map(t => (
                <tr key={t._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{t.category}</td>
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      const approved = isApproved(t as any);
                      const derivedStatus = approved ? 'approved' : 'pending';
                      const cls = approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
                      return (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
                          {derivedStatus}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{t.language}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.updated_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end space-x-2">
                      {t.status === 'DRAFT' && (user?.role === 'super_admin' || user?.role === 'system_admin' || user?.role === 'organization_admin') && (
                        <button onClick={() => submitTemplate(t._id)} title="Submit" className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      {(user?.role === 'super_admin' || user?.role === 'system_admin') && t.status === 'PENDING' && (
                        <>
                          <button onClick={() => approveTemplate(t._id)} title="Approve" className="p-2 text-green-600 hover:bg-green-50 rounded">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => rejectTemplate(t._id)} title="Reject" className="p-2 text-red-600 hover:bg-red-50 rounded">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => openPreview(t)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="Preview">
                        <Eye className="h-4 w-4" />
                      </button>
                      {(t.status === 'DRAFT' || t.status === 'REJECTED') && (
                        <button onClick={() => handleDelete(t._id, t.status)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Template</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {canAdminAllOrgs && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization</label>
                  <select value={form.organization_id} onChange={e => setForm({ ...form, organization_id: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" required>
                    <option value="">Select organization</option>
                    {organizations.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="MARKETING">Marketing</option>
                    <option value="AUTHENTICATION">Authentication</option>
                    <option value="UTILITY">Utility</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Language</label>
                  <input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Header Type</label>
                  <select value={form.header_type} onChange={e => setForm({ ...form, header_type: e.target.value as any })} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                </div>
              </div>
              {form.header_type === 'TEXT' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Header Text</label>
                  <input value={form.header_text || ''} onChange={e => setForm({ ...form, header_text: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Header Media URL</label>
                  <input value={form.header_media_url || ''} onChange={e => setForm({ ...form, header_media_url: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Body Text</label>
                <textarea value={form.body_text} onChange={e => setForm({ ...form, body_text: e.target.value })} rows={4} className="mt-1 w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Footer Text</label>
                <input value={form.footer_text || ''} onChange={e => setForm({ ...form, footer_text: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">components (comma-separated)</label>
                <input value={(form.components || []).join(', ')} onChange={e => setForm({ ...form, components: e.target.value.split(',') })} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); navigate('/templates'); }} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-whatsapp-500 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{previewTitle} - Context</h3>
              <button onClick={() => setShowPreview(false)} className="px-3 py-1 text-sm rounded bg-gray-100">Close</button>
            </div>
            {previewContext && previewContext.trim().length > 0 ? (
              <pre className="text-sm bg-gray-50 p-3 rounded whitespace-pre-wrap">{previewContext}</pre>
            ) : (
              <div className="text-sm text-gray-600">No BODY text found for this template.</div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Template</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="MARKETING">Marketing</option>
                    <option value="AUTHENTICATION">Authentication</option>
                    <option value="UTILITY">Utility</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Language</label>
                  <input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Header Type</label>
                  <select value={form.header_type} onChange={e => setForm({ ...form, header_type: e.target.value as any })} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                </div>
              </div>
              {form.header_type === 'TEXT' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Header Text</label>
                  <input value={form.header_text || ''} onChange={e => setForm({ ...form, header_text: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Header Media URL</label>
                  <input value={form.header_media_url || ''} onChange={e => setForm({ ...form, header_media_url: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Body Text</label>
                <textarea value={form.body_text} onChange={e => setForm({ ...form, body_text: e.target.value })} rows={4} className="mt-1 w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Footer Text</label>
                <input value={form.footer_text || ''} onChange={e => setForm({ ...form, footer_text: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">components (comma-separated)</label>
                <input value={(form.components || []).join(', ')} onChange={e => setForm({ ...form, components: e.target.value.split(',') })} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-whatsapp-500 text-white rounded">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
