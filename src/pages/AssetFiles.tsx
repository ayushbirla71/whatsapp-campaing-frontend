import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCw, Eye, Layers3, Trash2, PencilLine } from 'lucide-react';

// Minimal shape fallbacks to keep flexibility with backend payloads
interface Organization { id: string; name: string }

interface AssetFile {
  _id: string;
  id?: string;
  template_id?: string;
  organization_id?: string;
  file_name: string;
  content_type?: string;
  status?: string; // active/inactive
  is_active?: boolean;
  metadata?: any;
  updated_at?: string;
  created_at?: string;
}

const AssetFiles: React.FC = () => {
  const { user } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');

  const [files, setFiles] = useState<AssetFile[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponseMeta, setLastResponseMeta] = useState<{ source: 'org'|'template'|null; itemCount: number; keys?: string[] } | null>(null);

  // Modals state
  const [showUpdate, setShowUpdate] = useState<boolean>(false);
  const [showVersions, setShowVersions] = useState<boolean>(false);
  const [showCreateVersion, setShowCreateVersion] = useState<boolean>(false);

  const [selected, setSelected] = useState<AssetFile | null>(null);
  const [versions, setVersions] = useState<any[]>([]);

  // Update form (generic and tolerant)
  const [updateForm, setUpdateForm] = useState<{ file_name?: string; metadata?: string; content_type?: string }>({});

  const canAdminAllOrgs = user?.role === 'super_admin' || user?.role === 'system_admin';
  const effectiveOrgId = canAdminAllOrgs ? organizationId : (user?.organization_id || '');

  useEffect(() => {
    if (canAdminAllOrgs) {
      loadOrganizations();
    } else if (user?.organization_id) {
      setOrganizationId(user.organization_id);
    }
  }, [canAdminAllOrgs, user?.organization_id]);

  useEffect(() => {
    // Auto fetch when we have a filter
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOrgId, templateId, currentPage]);

  const loadOrganizations = async () => {
    try {
      const res: any = await api.getOrganizations(1, 100);
      if (res?.success && res?.data?.organizations) setOrganizations(res.data.organizations);
    } catch (_) { /* ignore */ }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      let res: any;
      if (templateId) {
        // GET /api/asset-files/template/:id
        res = await api.getAssetFiles(templateId);
        // Tolerate different shapes: data.files | data | result
        const list = (res?.data?.files ?? res?.data ?? res?.result ?? []) as AssetFile[];
        setFiles(Array.isArray(list) ? list : []);
        setLastResponseMeta({ source: 'template', itemCount: Array.isArray(list) ? list.length : 0, keys: Object.keys(res?.data ?? res ?? {}) });
        setTotalPages(1);
        setCurrentPage(1);
      } else if (effectiveOrgId) {
        // GET /api/asset-files/organization/:id
        res = await api.getOrgAssetFiles(effectiveOrgId, currentPage, 10);
        try { console.debug('Org asset files response', res); } catch {}
        const payload = res?.data ?? res ?? {};
        // Try multiple common shapes for list; unwrap an extra nested data if present
        const innerLevel1 = payload?.data ?? payload;
        const inner = innerLevel1?.data ?? innerLevel1;
        const listCandidate =
          inner?.files ?? inner?.asset_files ?? inner?.assets ?? inner?.items ?? inner?.results ?? inner?.list ?? inner?.docs ?? inner;
        const list = Array.isArray(listCandidate) ? listCandidate : [];
        setFiles(list as AssetFile[]);
        setLastResponseMeta({ source: 'org', itemCount: list.length, keys: Object.keys(inner ?? {}) });
        // Pagination tolerant extraction
        const pg = inner?.pagination ?? payload?.pagination ?? inner ?? {};
        const totalPg = pg?.totalPages ?? pg?.total_pages ?? pg?.pages ?? pg?.total ?? 1;
        setTotalPages(typeof totalPg === 'number' && totalPg > 0 ? totalPg : 1);
      } else {
        setFiles([]);
        setTotalPages(1);
        setCurrentPage(1);
        setLastResponseMeta({ source: null, itemCount: 0 });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load asset files');
    } finally {
      setLoading(false);
    }
  };

  // Generate Assets is initiated from Campaigns after approval; no manual trigger here.

  const openUpdate = (file: AssetFile) => {
    setSelected(file);
    setUpdateForm({ file_name: file.file_name || '', content_type: file.content_type || '', metadata: JSON.stringify(file.metadata ?? {}, null, 2) });
    setShowUpdate(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      setLoading(true);
      const payload: any = {
        ...(updateForm.file_name ? { file_name: updateForm.file_name } : {}),
        ...(updateForm.content_type ? { content_type: updateForm.content_type } : {}),
      };
      if (updateForm.metadata) {
        try { payload.metadata = JSON.parse(updateForm.metadata); } catch { payload.metadata = updateForm.metadata; }
      }
      const id = selected._id || selected.id as string;
      await api.updateAssetFile(id, payload);
      setShowUpdate(false);
      setSelected(null);
      await fetchFiles();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update asset file');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (file: AssetFile) => {
    if (!window.confirm('Deactivate this asset file?')) return;
    try {
      setLoading(true);
      const id = file._id || file.id as string;
      await api.deactivateAssetFile(id);
      await fetchFiles();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to deactivate asset file');
    } finally {
      setLoading(false);
    }
  };

  const openVersions = async (file: AssetFile) => {
    try {
      setLoading(true);
      setSelected(file);
      const tplId = file.template_id || templateId;
      if (!tplId) throw new Error('Template ID missing for versions');
      const res: any = await api.getAssetFileVersions(tplId, file.file_name);
      const list = (res?.data?.versions ?? res?.data ?? res?.result ?? []) as any[];
      setVersions(Array.isArray(list) ? list : []);
      setShowVersions(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      setLoading(true);
      const tplId = selected.template_id || templateId;
      if (!tplId) throw new Error('Template ID missing');
      // For simplicity, allow metadata/content JSON in a textarea
      const fileName = selected.file_name;
      const metaText = (document.getElementById('versionMetadata') as HTMLTextAreaElement)?.value || '';
      const contentText = (document.getElementById('versionContent') as HTMLTextAreaElement)?.value || '';
      let metadata: any = undefined;
      let content: any = undefined;
      if (metaText.trim()) { try { metadata = JSON.parse(metaText); } catch { metadata = metaText; } }
      if (contentText.trim()) { try { content = JSON.parse(contentText); } catch { content = contentText; } }
      await api.createAssetFileVersion(tplId, { file_name: fileName, metadata, content });
      setShowCreateVersion(false);
      await openVersions(selected);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create version');
    } finally {
      setLoading(false);
    }
  };

  const derived = useMemo(() => files, [files]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Files</h1>
          <p className="text-gray-600">View and manage generated asset files for your templates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchFiles} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"><RefreshCw className="h-4 w-4 mr-2"/>Refresh</button>
        </div>
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">Page {currentPage} of {totalPages} (10 per page)</div>
            <div className="space-x-2">
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="px-3 py-1 border rounded">Prev</button>
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className="px-3 py-1 border rounded">Next</button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {canAdminAllOrgs && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization</label>
              <select value={organizationId} onChange={e => { setOrganizationId(e.target.value); setCurrentPage(1); }} className="mt-1 w-full border rounded px-3 py-2">
                <option value="">Select organization</option>
                {organizations.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Template ID (optional to filter, required to Generate)</label>
            <input value={templateId} onChange={e => { setTemplateId(e.target.value); setCurrentPage(1); }} className="mt-1 w-full border rounded px-3 py-2" placeholder="template id" />
          </div>
          <div>
            <button onClick={() => { setCurrentPage(1); fetchFiles(); }} className="w-full px-4 py-2 border rounded">Apply</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : derived.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No asset files</td></tr>
              ) : derived.map((f) => (
                <tr key={f._id ?? f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 break-all">{f.file_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{f.content_type || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      const active = typeof f.is_active === 'boolean' ? f.is_active : (f.status ? f.status.toLowerCase() === 'active' : true);
                      const cls = active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700';
                      return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{active ? 'active' : 'inactive'}</span>;
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{f.updated_at ? new Date(f.updated_at).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => openVersions(f)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="View versions"><Layers3 className="h-4 w-4"/></button>
                      <button onClick={() => { setSelected(f); setShowCreateVersion(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Create version"><Eye className="h-4 w-4"/></button>
                      <button onClick={() => openUpdate(f)} className="p-2 text-amber-600 hover:bg-amber-50 rounded" title="Update"><PencilLine className="h-4 w-4"/></button>
                      <button onClick={() => handleDeactivate(f)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Deactivate"><Trash2 className="h-4 w-4"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Modal */}
      {showUpdate && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Update Asset File</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">File Name</label>
                <input value={updateForm.file_name || ''} onChange={e => setUpdateForm({ ...updateForm, file_name: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Content Type</label>
                <input value={updateForm.content_type || ''} onChange={e => setUpdateForm({ ...updateForm, content_type: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Metadata (JSON)</label>
                <textarea value={updateForm.metadata || ''} onChange={e => setUpdateForm({ ...updateForm, metadata: e.target.value })} rows={6} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowUpdate(false)} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-whatsapp-500 text-white rounded">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Versions Modal */}
      {showVersions && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Versions - {selected.file_name}</h3>
              <button onClick={() => setShowVersions(false)} className="px-3 py-1 text-sm rounded bg-gray-100">Close</button>
            </div>
            {versions.length === 0 ? (
              <div className="text-sm text-gray-600">No versions</div>
            ) : (
              <ul className="space-y-3">
                {versions.map((v, idx) => (
                  <li key={idx} className="border rounded p-3 bg-gray-50">
                    <div className="text-sm text-gray-700 break-all">{JSON.stringify(v)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Create Version Modal */}
      {showCreateVersion && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Version - {selected.file_name}</h3>
            <form onSubmit={handleCreateVersion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Metadata (JSON)</label>
                <textarea id="versionMetadata" rows={6} className="mt-1 w-full border rounded px-3 py-2" placeholder='{"key":"value"}' />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Content (JSON or text)</label>
                <textarea id="versionContent" rows={6} className="mt-1 w-full border rounded px-3 py-2" placeholder='{"data":{}}' />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowCreateVersion(false)} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-whatsapp-500 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetFiles;
