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

  // Approve modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveTemplateId, setApproveTemplateId] = useState<string | null>(null);
  const [approveBodyTemplate, setApproveBodyTemplate] = useState<string>('');
  const [approveParams, setApproveParams] = useState<Record<string, string>>({});
  const [approvePreview, setApprovePreview] = useState<string>('');
  const [approveExamples, setApproveExamples] = useState<string[]>([]);
  const [approvePlaceholders, setApprovePlaceholders] = useState<string[]>([]);

  // Keep approvePreview unused (we show raw body), but clear consistently
  useEffect(() => {
    setApprovePreview('');
  }, [approveBodyTemplate, approveParams]);

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

  // Determine if asset generation file exists (flag can come in various shapes)
  const hasAssetGenerationFile = (item: any): boolean => {
    const v = item?.is_asset_generation_file ?? item?.has_asset_generation_file ?? item?.asset_generation_file ?? item?.assetFileGenerated ?? item?.asset_generated;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') {
      const s = v.toLowerCase();
      return s === 'true' || s === 'yes' || s === '1';
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

  // Replace placeholders like {{1}}, {{2}} in a text using params
  const renderWithParams = (text: string, params: Record<string, string>) => {
    if (!text) return '';
    return text.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, k: string) => {
      const v = params?.[k];
      return typeof v === 'string' ? v : `{{${k}}}`;
    });
  };

  // Extract BODY text and example values from components with flexible shapes
  const extractBodyData = (components: any): { bodyText: string; exampleValues: string[] } => {
    const list = Array.isArray(components) ? components : [];
    const body = list.find((c: any) => {
      const t = (c?.type || c?.component_type || c?.name || '').toString().toUpperCase();
      return t === 'BODY';
    }) || {};
    const bodyText = body?.text || body?.body_text || body?.data?.text || '';
    const ex = body?.example || body?.examples || body?.data?.example || {};
    // WhatsApp often returns example.body_text as array of arrays; pick first row
    let vals: any = ex?.body_text ?? ex?.body ?? ex?.values;
    let exampleValues: string[] = [];
    if (Array.isArray(vals)) {
      if (Array.isArray(vals[0])) exampleValues = (vals[0] as any[]).map((v) => String(v));
      else exampleValues = vals.map((v: any) => String(v));
    } else if (typeof vals === 'string') {
      exampleValues = [vals];
    }
    return { bodyText: String(bodyText || ''), exampleValues };
  };

  const openApproveModal = async (templateRow: any) => {
    try {
      const ident = getTemplateIdentifier(templateRow);
      if (!ident) { setError('Template UUID is missing or invalid on this item'); return; }
      setApproveLoading(true);
      setError(null);
      // Fetch full template to get components with examples
      const res: any = await apiService.getTemplate(ident);
      const payload = res?.data ?? res?.template ?? res?.result ?? res;
      const components = payload?.components
        ?? payload?.data?.components
        ?? payload?.template?.components
        ?? payload?.result?.components
        ?? [];
      const { bodyText, exampleValues } = extractBodyData(components);

      // Compute placeholder order from BODY text, like {{1}}, {{2}}, ...
      const matches = Array.from(String(bodyText || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g));
      const placeholderOrder = Array.from(new Set(matches.map((m) => String(m[1]))));

      // Build default params aligned to placeholder order using example values
      const params: Record<string, string> = {};
      placeholderOrder.forEach((ph, i) => {
        params[ph] = exampleValues[i] ?? '';
      });

      setApproveTemplateId(ident);
      setApproveBodyTemplate(bodyText);
      setApproveParams(params);
      setApprovePreview('');
      setApproveExamples(exampleValues);
      setApprovePlaceholders(placeholderOrder);
      setShowApproveModal(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to open approval modal');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleApprove = async (templateId: string) => {
    try {
      const body = { parameters: approveParams };
      await apiService.approveAdminTemplates(templateId, body);
      await fetchTemplates();
      setShowApproveModal(false);
      setApproveTemplateId(null);
      setApproveParams({});
      setApproveBodyTemplate('');
      setApprovePreview('');
      setApproveExamples([]);
      setApprovePlaceholders([]);
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
    <>
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
                        {(() => {
                          const assetGenerated = hasAssetGenerationFile(t as any);
                          // If asset generation file is not present -> show Upload Asset button
                          if (!assetGenerated) {
                            if (user?.role === 'super_admin' || user?.role === 'system_admin' || user?.role === 'organization_admin') {
                              const ident = getTemplateIdentifier(t);
                              return (
                                <button
                                  onClick={() => {
                                    if (!ident) { setError('Template UUID is missing or invalid on this item'); return; }
                                    navigate(`/asset-files?create=1&templateId=${encodeURIComponent(ident)}`);
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                  Upload Asset
                                </button>
                              );
                            }
                            return null;
                          }
                          // If asset exists -> show existing Admin Approve/Reject
                          return (
                            <>
                              {(user?.role === 'super_admin' || user?.role === 'system_admin') && (
                                <button
                                  onClick={() => { openApproveModal(t); }}
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
                            </>
                          );
                        })()}
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

    {/* Approve Modal UI */}
    {showApproveModal && (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity flex items-center justify-center" aria-hidden="true" onClick={() => setShowApproveModal(false)}>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:align-middle sm:max-w-lg sm:w-full" role="dialog" aria-modal="true" aria-labelledby="modal-headline" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[70vh] overflow-y-auto">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">Approve Template</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Please review and validate the template parameters.</p>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Body Template (with placeholders):</label>
                  <div className="mt-1 whitespace-pre-wrap text-gray-900">{approveBodyTemplate}</div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Example Context (example.body_text):</label>
                  {approveExamples && approveExamples.length > 0 ? (
                    <ul className="mt-1 list-disc list-inside text-sm text-gray-800">
                      {approveExamples.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-1 text-sm text-gray-500">No example values found.</div>
                  )}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Placeholder Mappings:</label>
                  <div className="mt-1 space-y-2">
                    {approvePlaceholders.length > 0 ? (
                      approvePlaceholders.map((ph, idx) => {
                        const exampleVal = approveExamples[idx] ?? '';
                        return (
                          <div key={ph} className="flex items-center gap-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">{'{{' + ph + '}}'}</span>
                            <input
                              type="text"
                              value={approveParams[ph] ?? ''}
                              onChange={(e) => setApproveParams({ ...approveParams, [ph]: e.target.value })}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-whatsapp-500 focus:ring-whatsapp-500"
                            />
                            <span className="text-xs text-gray-500">Example: {exampleVal}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-500">No placeholders detected in body.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={() => handleApprove(approveTemplateId as string)}
            >
              Approve
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={() => setShowApproveModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );  
};

export default OrganizationApproval;
