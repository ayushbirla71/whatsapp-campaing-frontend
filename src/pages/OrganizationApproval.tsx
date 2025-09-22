import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Template, TemplateListResponse } from '../types/template';
import { ChevronLeft, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const OrganizationApproval: React.FC = () => {
  const { id: organizationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingOnly, setPendingOnly] = useState(false);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Prefer UUID style identifiers coming from backend; fall back to others only if valid
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const getTemplateIdentifier = (t: any): string | null => {
    const candidate = t?.id || t?.template_id || t?.templateId || t?.uuid || t?.external_id || null;
    if (candidate && uuidRegex.test(String(candidate))) return String(candidate);
    return null;
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

  const fetchTemplates = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setError(null);
      const res = pendingOnly
        ? await apiService.getPendingAdminApprovalTemplates(page, limit)
        : await apiService.getOrganizationTemplates(organizationId, page, limit);
      const payload: any = res?.data || {};
      const list: Template[] = payload.templates || payload.data?.templates || [];
      const pg = payload.pagination || payload.data?.pagination || {};
      setTemplates(list);
      setTotalPages(pg.totalPages || 1);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, page, limit, pendingOnly]);

  const handleSyncWhatsApp = async () => {
    if (!organizationId) return;
    try {
      setSyncing(true);
      setError(null);
      await apiService.syncTemplatesFromWhatsApp(organizationId);
      await fetchTemplates();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleApprove = async (templateId: string) => {
    try {
      const body = {
        parameters: {
          '1': 'customer_name',
          '2': 'order_number',
          '3': 'pickup_location',
        },
      };
      await apiService.approveAdminTemplates(templateId, body);
      await fetchTemplates();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Approve failed');
    }
  };

  const handleReject = async (templateId: string) => {
    try {
      const body = {
        rejection_reason:
          'Parameter mapping not suitable for campaign usage. Please review the template structure and parameter requirements.',
      };
      await apiService.rejectAdminTemplates(templateId, body);
      await fetchTemplates();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Reject failed');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Approval - Organization {organizationId}</h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(e) => { setPage(1); setPendingOnly(e.target.checked); }}
              className="h-4 w-4 rounded border-gray-300 text-whatsapp-600 focus:ring-whatsapp-500"
            />
            Pending admin approval
          </label>
          <button
            onClick={handleSyncWhatsApp}
            disabled={syncing}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-white ${syncing ? 'bg-gray-400' : 'bg-whatsapp-500 hover:bg-whatsapp-600'}`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync WhatsApp'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
        </div>

        {error && (
          <div className="m-4 rounded bg-red-50 text-red-700 p-3 text-sm">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4" colSpan={6}>Loading...</td>
                </tr>
              ) : templates.filter((t) => !isApproved(t as any)).length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-gray-500" colSpan={6}>No templates found.</td>
                </tr>
              ) : (
                templates.filter((t) => !isApproved(t as any)).map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.language}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const approved = isApproved(t as any);
                        const derivedStatus = approved ? 'approved' : 'pending';
                        const cls = approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>
                            {derivedStatus}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div>
                        {t.header_text && <div className="font-medium mb-1">{t.header_text}</div>}
                        <div className="whitespace-pre-wrap text-gray-700">{t.body_text}</div>
                        {t.footer_text && <div className="text-gray-500 mt-1">{t.footer_text}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      
                      <div className="flex items-center gap-2 justify-end">
                        {(user?.role === 'super_admin' || user?.role === 'system_admin') && (
                        <button
                          onClick={() => {
                            const ident = getTemplateIdentifier(t);
                            if (!ident) { setError('Template UUID is missing or invalid on this item'); return; }
                            handleApprove(ident);
                          }}
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Admin Approve
                        </button>
                        )}
                        {(user?.role === 'super_admin' || user?.role === 'system_admin') && (
                        <button
                          onClick={() => {
                            const ident = getTemplateIdentifier(t);
                            if (!ident) { setError('Template UUID is missing or invalid on this item'); return; }
                            handleReject(ident);
                          }}
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Admin Reject
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-b-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows:</label>
            <select
              className="rounded-md border-gray-300 shadow-sm focus:border-whatsapp-500 focus:ring-whatsapp-500"
              value={limit}
              onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev}
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!canNext}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationApproval;
