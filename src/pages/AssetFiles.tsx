import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { RefreshCw, Eye, Layers3, Trash2, PencilLine } from "lucide-react";

// Minimal shape fallbacks to keep flexibility with backend payloads
interface Organization {
  id: string;
  name: string;
}

interface AssetFile {
  _id: string;
  id?: string;
  template_id?: string;
  organization_id?: string;
  file_name: string;
  file_content?: string;
  content_type?: string;
  status?: string; // active/inactive
  is_active?: boolean;
  metadata?: any;
  updated_at?: string;
  created_at?: string;
  created_by?: string;
  description?: string;
  typeofcontent?: string;
  version?: string;
  template_name?: string;
  template_category?: string;
  organization_name?: string;
  created_by_name?: string;
  created_by_lastname?: string;
}

const AssetFiles: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");

  const [files, setFiles] = useState<AssetFile[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponseMeta, setLastResponseMeta] = useState<{
    source: "org" | "template" | null;
    itemCount: number;
    keys?: string[];
  } | null>(null);

  // Modals state
  const [showUpdate, setShowUpdate] = useState<boolean>(false);
  const [showVersions, setShowVersions] = useState<boolean>(false);
  const [showCreateVersion, setShowCreateVersion] = useState<boolean>(false);
  const [showCreateAsset, setShowCreateAsset] = useState<boolean>(false);

  const [selected, setSelected] = useState<AssetFile | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [confirmState, setConfirmState] = useState<{ open: boolean; message: string; onConfirm?: () => Promise<void> | void }>({ open: false, message: "" });

  // Update form (generic and tolerant)
  const [updateForm, setUpdateForm] = useState<{
    file_name?: string;
    typeofcontent?: string;
    file_content?: string;
    description?: string;
    version?: string;
  }>({}); // Removed default values

  // Create Asset form state (UI-only; submission triggers generateAssets)
  const [createForm, setCreateForm] = useState<{
    typeofcontent?: string;
    file_name?: string;
    description?: string;
    version?: string;
    file_content?: string;
  }>({});
  const [templateName, setTemplateName] = useState<string>("");
  const [createErrors, setCreateErrors] = useState<{ file_name?: string; version?: string }>({});

  const canAdminAllOrgs =
    user?.role === "super_admin" || user?.role === "system_admin";
  const effectiveOrgId = canAdminAllOrgs
    ? organizationId
    : user?.organization_id || "";

  // Check if user has access to asset files
  const hasAssetFileAccess =
    user?.role === "super_admin" || user?.role === "system_admin";

  useEffect(() => {
    if (canAdminAllOrgs) {
      loadOrganizations();
    } else if (user?.organization_id) {
      setOrganizationId(user.organization_id);
    }
  }, [canAdminAllOrgs, user?.organization_id]);

  // Detect create flow via query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldCreate =
      params.get("create") === "1" || params.get("create") === "true";
    const tplId = params.get("templateId") || "";
    if (shouldCreate && tplId) {
      setTemplateId(tplId);
      setShowCreateAsset(true);
    }
  }, [location.search]);

  // Load template name when create modal is opened
  useEffect(() => {
    const loadName = async () => {
      if (!showCreateAsset || !templateId) {
        setTemplateName("");
        return;
      }
      try {
        const res: any = await api.getTemplate(templateId);
        const payload = res?.data ?? res?.template ?? res?.result ?? res;
        const name =
          payload?.name ?? payload?.data?.name ?? payload?.template?.name ?? "";
        setTemplateName(typeof name === "string" ? name : "");
      } catch {
        setTemplateName("");
      }
    };
    loadName();
  }, [showCreateAsset, templateId]);

  useEffect(() => {
    // Auto fetch when we have a filter
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOrgId, templateId, currentPage]);

  const loadOrganizations = async () => {
    try {
      const res: any = await api.getOrganizations(1, 100);
      if (res?.success && res?.data?.organizations)
        setOrganizations(res.data.organizations);
    } catch (_) {
      /* ignore */
    }
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
        const list = (res?.data?.files ??
          res?.data ??
          res?.result ??
          []) as AssetFile[];
        setFiles(Array.isArray(list) ? list : []);
        setLastResponseMeta({
          source: "template",
          itemCount: Array.isArray(list) ? list.length : 0,
          keys: Object.keys(res?.data ?? res ?? {}),
        });
        setTotalPages(1);
        setCurrentPage(1);
      } else if (effectiveOrgId) {
        // GET /api/asset-files/organization/:id
        res = await api.getOrgAssetFiles(effectiveOrgId, currentPage, 10);
        try {
          console.debug("Org asset files response", res);
        } catch {}
        const payload = res?.data ?? res ?? {};
        // Try multiple common shapes for list; unwrap an extra nested data if present
        const innerLevel1 = payload?.data ?? payload;
        const inner = innerLevel1?.data ?? innerLevel1;
        const listCandidate =
          inner?.files ??
          inner?.asset_files ??
          inner?.assets ??
          inner?.items ??
          inner?.results ??
          inner?.list ??
          inner?.docs ??
          inner;
        const list = Array.isArray(listCandidate) ? listCandidate : [];
        setFiles(list as AssetFile[]);
        setLastResponseMeta({
          source: "org",
          itemCount: list.length,
          keys: Object.keys(inner ?? {}),
        });
        // Pagination tolerant extraction
        const pg = inner?.pagination ?? payload?.pagination ?? inner ?? {};
        const totalPg =
          pg?.totalPages ?? pg?.total_pages ?? pg?.pages ?? pg?.total ?? 1;
        setTotalPages(typeof totalPg === "number" && totalPg > 0 ? totalPg : 1);
      } else {
        setFiles([]);
        setTotalPages(1);
        setCurrentPage(1);
        setLastResponseMeta({ source: null, itemCount: 0 });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load asset files");
    } finally {
      setLoading(false);
    }
  };

  // Generate Assets is initiated from Campaigns after approval; no manual trigger here.

  const openUpdate = (file: AssetFile) => {
    setSelected(file);
    setUpdateForm({
      file_name: file.file_name || "",
      typeofcontent: file.typeofcontent || "",
      file_content: file.file_content || "",
      description: file.description || "",
      version: file.version || "",
    });
    setShowUpdate(true);
    setShowVersions(false);
    setShowCreateVersion(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      setLoading(true);
      const payload: any = {
        ...(updateForm.file_name ? { file_name: updateForm.file_name } : {}),
        ...(updateForm.typeofcontent
          ? { typeofcontent: updateForm.typeofcontent }
          : {}),
        ...(updateForm.description
          ? { description: updateForm.description }
          : {}),
        ...(updateForm.file_content
          ? { file_content: updateForm.file_content }
          : {}),
        ...(updateForm.version ? { version: updateForm.version } : {}),
      };

      const id = selected._id || (selected.id as string);
      await api.updateAssetFile(id, payload);
      setShowUpdate(false);
      setSelected(null);
      await fetchFiles();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to update asset file");
    } finally {
      setLoading(false);
    }
  };

  const openPreview = (file: AssetFile) => {
    setSelected(file);
    setShowUpdate(false);
    setShowVersions(false);
    setShowCreateVersion(false);
  };

  const handleDelete = async (file: AssetFile) => {
    setConfirmState({
      open: true,
      message: `Are you sure you want to delete "${file.file_name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          setLoading(true);
          const id = file._id || file.id;
          if (!id) {
            setError("File ID is missing");
            return;
          }
          await api.deleteAssetFile(id);
          await fetchFiles();
          setError(null);
        } catch (e: any) {
          setError(e?.response?.data?.message || "Failed to delete asset file");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const openVersions = async (file: AssetFile) => {
    try {
      setSelected(file);
      setLoading(true);
      const id = file._id || file.id;
      if (id) {
        setVersions([file]);
      }
      setShowVersions(true);
      setShowUpdate(false);
      setShowCreateVersion(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load versions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (file: AssetFile) => {
    setConfirmState({
      open: true,
      message: `Are you sure you want to deactivate "${file.file_name}"?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          const id = file._id || file.id;
          if (!id) {
            setError("File ID is missing");
            return;
          }
          await api.updateAssetFile(id, { is_active: false });
          await fetchFiles();
          setError(null);
        } catch (e: any) {
          setError(e?.response?.data?.message || "Failed to deactivate asset file");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      setLoading(true);
      const tplId = selected.template_id || templateId;
      if (!tplId) throw new Error("Template ID missing");
      // For simplicity, allow metadata/content JSON in a textarea
      const fileName = selected.file_name;
      const metaText =
        (document.getElementById("versionMetadata") as HTMLTextAreaElement)
          ?.value || "";
      const contentText =
        (document.getElementById("versionContent") as HTMLTextAreaElement)
          ?.value || "";
      let metadata: any = undefined;
      let content: any = undefined;
      if (metaText.trim()) {
        try {
          metadata = JSON.parse(metaText);
        } catch {
          metadata = metaText;
        }
      }
      if (contentText.trim()) {
        try {
          content = JSON.parse(contentText);
        } catch {
          content = contentText;
        }
      }
      await api.createAssetFileVersion(tplId, {
        file_name: fileName,
        metadata,
        content,
      });
      setShowCreateVersion(false);
      await openVersions(selected);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to create version");
    } finally {
      setLoading(false);
    }
  };

  const derived = useMemo(() => files, [files]);

  // If user doesn't have access, show access denied
  if (!hasAssetFileAccess) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Access Denied
          </h2>
          <p className="text-red-600">
            You don't have permission to access Asset Files. Only Super Admin
            and System Admin can view this section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Files</h1>
          <p className="text-gray-600">
            View and manage generated asset files for your templates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFiles}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} (10 per page)
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

      {/* Confirm Dialog */}
      {confirmState.open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-700 mb-6">{confirmState.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmState({ open: false, message: "" })}
                className="px-4 py-2 bg-gray-100 rounded"
              >
                Cancel
              </button>
              {confirmState.onConfirm && (
                <button
                  type="button"
                  onClick={async () => {
                    const cb = confirmState.onConfirm;
                    setConfirmState({ open: false, message: "" });
                    if (cb) await cb();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Confirm
                </button>
              )}
              {!confirmState.onConfirm && (
                <button
                  type="button"
                  onClick={() => setConfirmState({ open: false, message: "" })}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {canAdminAllOrgs && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Organization
              </label>
              <select
                value={organizationId}
                onChange={(e) => {
                  setOrganizationId(e.target.value);
                  setCurrentPage(1);
                }}
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Template ID (optional to filter, required to Generate)
            </label>
            <input
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="template id"
            />
          </div>
          <div>
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchFiles();
              }}
              className="w-full px-4 py-2 border rounded"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Asset File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type & Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
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
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : derived.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No asset files
                  </td>
                </tr>
              ) : (
                derived.map((f) => {
                  const createdByName = `${f.created_by_name || ""} ${
                    f.created_by_lastname || ""
                  }`.trim();
                  const templateName = f.template_name || "-";
                  const templateCategory = f.template_category || "";
                  const organizationName = f.organization_name || "-";
                  const typeofcontent =
                    f.typeofcontent || f.content_type || "-";
                  const version = f.version || "-";

                  return (
                    <tr key={f._id ?? f.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900 break-all">
                            {f.file_name}
                          </div>
                          {f.description && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                              {f.description}
                            </div>
                          )}
                        </div>
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
                        <div className="flex flex-col">
                          <div className="text-gray-900">{typeofcontent}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            v{version}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {organizationName}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col">
                          <div className="text-gray-900">
                            {f.created_at
                              ? new Date(f.created_at).toLocaleDateString()
                              : "-"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            by {createdByName || "Unknown"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {(() => {
                          const active =
                            typeof f.is_active === "boolean"
                              ? f.is_active
                              : f.status
                              ? f.status.toLowerCase() === "active"
                              : true;
                          const cls = active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-700";
                          return (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}
                            >
                              {active ? "active" : "inactive"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openPreview(f)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openVersions(f)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                            title="View versions"
                          >
                            <Layers3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openUpdate(f)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded"
                            title="Update"
                          >
                            <PencilLine className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(f)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
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
      </div>

      {/* Update Modal */}
      {showUpdate && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Update Asset File</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    File Name
                  </label>
                  <input
                    value={updateForm.file_name || ""}
                    onChange={(e) =>
                      setUpdateForm({
                        ...updateForm,
                        file_name: e.target.value,
                      })
                    }
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Content Type
                  </label>
                  <select
                    value={updateForm.typeofcontent || ""}
                    onChange={(e) =>
                      setUpdateForm({
                        ...updateForm,
                        typeofcontent: e.target.value,
                      })
                    }
                    className="mt-1 w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Type</option>
                    <option value="public">Public</option>
                    <option value="personalized">Personalized</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Version
                  </label>
                  <input
                    value={updateForm.version || ""}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, version: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-3 py-2"
                    placeholder="e.g., 1.0, 2.1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={updateForm.description || ""}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="Enter description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  File Content
                </label>
                <textarea
                  value={updateForm.file_content || ""}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      file_content: e.target.value,
                    })
                  }
                  rows={12}
                  className="mt-1 w-full border rounded px-3 py-2 font-mono text-sm"
                  placeholder="Enter file content..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdate(false);
                    setSelected(null);
                  }}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-whatsapp-500 text-white rounded hover:bg-whatsapp-600"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Versions Modal */}
      {showVersions && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Versions for {selected.file_name}
              </h3>
              <button
                onClick={() => {
                  setShowVersions(false);
                  setSelected(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{version.file_name}</h4>
                      <p className="text-sm text-gray-600">
                        Version: {version.version || "1.0"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Created:{" "}
                        {version.created_at
                          ? new Date(version.created_at).toLocaleString()
                          : "Unknown"}
                      </p>
                      {version.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {version.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        version.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {version.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal - Read Only */}
      {selected && !showUpdate && !showVersions && !showCreateVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Preview: {selected.file_name}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    File Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selected.file_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Content Type
                  </label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selected.typeofcontent || "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Version
                  </label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selected.version || "1.0"}
                  </p>
                </div>
              </div>
              {selected.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selected.description}
                  </p>
                </div>
              )}
              {selected.file_content && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    File Content
                  </label>
                  <div className="mt-1 bg-gray-50 p-4 rounded border max-h-96 overflow-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {selected.file_content}
                    </pre>
                  </div>
                </div>
              )}
              {selected.metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Metadata
                  </label>
                  <div className="mt-1 bg-gray-50 p-4 rounded border max-h-48 overflow-auto">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Version Modal */}
      {showCreateVersion && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Create Version - {selected.file_name}
            </h3>
            <form onSubmit={handleCreateVersion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Metadata (JSON)
                </label>
                <textarea
                  id="versionMetadata"
                  rows={6}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder='{"key":"value"}'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Content (JSON or text)
                </label>
                <textarea
                  id="versionContent"
                  rows={6}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder='{"data":{}}'
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateVersion(false)}
                  className="px-4 py-2 bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-whatsapp-500 text-white rounded"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Asset Modal (triggered when navigated from approval if is_asset_generation_file is false) */}
      {showCreateAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow p-6 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Asset</h3>
              <button
                onClick={() => {
                  setShowCreateAsset(false);
                  navigate("/asset-files");
                }}
                className="px-3 py-1 text-sm rounded bg-gray-100"
              >
                Close
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const fname = (createForm.file_name || '').trim();
                  const ver = (createForm.version || '').trim();
                  const errs: { file_name?: string; version?: string } = {};
                  if (!/\.py$/i.test(fname)) errs.file_name = 'File name must end with .py';
                  if (!/^\d+\.\d+$/.test(ver)) errs.version = 'Version must be in the format 0.1';
                  if (Object.keys(errs).length) { setCreateErrors(errs); return; }
                  setCreateErrors({});
                  if (!templateId) throw new Error('Template ID is required');
                  await api.generateAssets(templateId, createForm);
                  setShowCreateAsset(false);
                  setTemplateId('');
                  navigate('/asset-files');
                } catch (e: any) {
                  setError(e?.response?.data?.message || 'Failed to generate asset');
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">File Name</label>
                  <input
                    value={createForm.file_name || ''}
                    onChange={(e) => setCreateForm({ ...createForm, file_name: e.target.value })}
                    className={`mt-1 w-full border rounded px-3 py-2 ${createErrors.file_name ? 'border-red-500' : ''}`}
                    placeholder="Enter file name (e.g., script.py)"
                  />
                  {createErrors.file_name && (<p className="mt-1 text-xs text-red-600">{createErrors.file_name}</p>)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Content Type</label>
                  <select
                    value={createForm.typeofcontent || ''}
                    onChange={(e) => setCreateForm({ ...createForm, typeofcontent: e.target.value })}
                    className="mt-1 w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Type</option>
                    <option value="public">Public</option>
                    <option value="personalized">Personalized</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    value={createForm.description || ''}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="mt-1 w-full border rounded px-3 py-2"
                    placeholder="Enter description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Version</label>
                  <input
                    value={createForm.version || ''}
                    onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                    className={`mt-1 w-full border rounded px-3 py-2 ${createErrors.version ? 'border-red-500' : ''}`}
                    placeholder="0.1"
                  />
                  {createErrors.version && (<p className="mt-1 text-xs text-red-600">{createErrors.version}</p>)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">File Content</label>
                <textarea
                  value={createForm.file_content || ''}
                  onChange={(e) => setCreateForm({ ...createForm, file_content: e.target.value })}
                  rows={10}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="Paste the Python code"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateAsset(false); navigate('/asset-files'); }}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-whatsapp-500 text-white rounded hover:bg-whatsapp-600">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetFiles;
