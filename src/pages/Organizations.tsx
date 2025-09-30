import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";
import {
  Organization,
  CreateOrganizationRequest,
  WhatsAppConfig,
} from "../types/organization";
import { Plus, Edit, Trash2, Settings } from "lucide-react";

const Organizations: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({});

  const [createForm, setCreateForm] = useState<CreateOrganizationRequest>({
    name: "",
    description: "",
    website: "",
    phone: "",
    address: "",
    whatsapp_business_account_id: "",
    whatsapp_phone_number_id: "",
    whatsapp_access_token: "",
    whatsapp_webhook_verify_token: "",
    whatsapp_webhook_url: "",
    whatsapp_app_id: "",
    whatsapp_app_secret: "",
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getOrganizations(1, 50);
      if (response.success && response.data) {
        // Normalize is_active regardless of backend representation
        const normalizeActive = (val: any): boolean => {
          if (typeof val === "boolean") return val;
          if (typeof val === "number") return val === 1;
          if (typeof val === "string") {
            const v = val.toLowerCase();
            return (
              v === "true" || v === "active" || v === "1" || v === "enabled"
            );
          }
          return false;
        };
        const normalized = (response.data.organizations || []).map(
          (org: any) => {
            const rawActive = org.is_active ?? org.active ?? org.status;
            return {
              ...org,
              is_active: normalizeActive(rawActive),
            } as Organization;
          }
        );
        setOrganizations(normalized);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiService.createOrganization(createForm);
      if (response.success) {
        setShowCreateModal(false);
        setCreateForm({
          name: "",
          description: "",
          whatsapp_business_account_id: "",
          whatsapp_phone_number_id: "",
          whatsapp_access_token: "",
          whatsapp_webhook_verify_token: "",
          whatsapp_webhook_url: "",
          whatsapp_app_id: "",
          whatsapp_app_secret: "",
        });
        fetchOrganizations();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    try {
      await apiService.updateOrganization(selectedOrg.id, createForm);
      setShowCreateModal(false);
      setCreateForm({ name: "", description: "" });
      fetchOrganizations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteOrganization = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this organization?")) {
      try {
        await apiService.deleteOrganization(id);
        fetchOrganizations();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleOpenWhatsAppConfig = async (org: Organization) => {
    setSelectedOrg(org);
    try {
      const response = await apiService.getWhatsAppConfig(org.id);
      if (response.success && response.data) {
        setWhatsappConfig(response.data);
      }
    } catch (err) {
      setWhatsappConfig({});
    }
    setShowConfigModal(true);
  };

  const handleSaveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    try {
      await apiService.updateWhatsAppConfig(selectedOrg.id, whatsappConfig);
      setShowConfigModal(false);
      setSelectedOrg(null);
      setWhatsappConfig({});
    } catch (err: any) {
      setError(err.message);
    }
  };

  const canManageOrganizations =
    user?.role === "super_admin" || user?.role === "system_admin";
  const canCreateOrganizations =
    user?.role === "super_admin" || user?.role === "system_admin";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-whatsapp-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
            {canCreateOrganizations && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-whatsapp-600 hover:bg-whatsapp-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Organization
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {organizations.map((org) => (
                <li key={org.id}>
                  <div
                    className="px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      navigate(`/organizations/${org.id}/approval`)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-whatsapp-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {org.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {org.name}
                            </p>
                            <span
                              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                org.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {org.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {org.description && (
                            <p className="text-sm text-gray-500 truncate">
                              {org.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {canManageOrganizations && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); /* open edit modal if added later */
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="Edit Organization"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrganization(org.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Delete Organization"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {organizations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No organizations found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white my-8">
            <div className="mt-3">
              <h3 className="text-xl font-medium text-gray-900 mb-6">
                Create New Organization
              </h3>
              <form
                onSubmit={
                  selectedOrg
                    ? handleUpdateOrganization
                    : handleCreateOrganization
                }
                className="space-y-6"
              >
                {/* Basic Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                        value={createForm.name}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, name: e.target.value })
                        }
                        placeholder="Enter organization name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                        rows={3}
                        value={createForm.description}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Brief description of the organization"
                      />
                    </div>
                  </div>
                </div>

                {/* WhatsApp Configuration */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <span className="text-green-600 mr-2">📱</span>
                    WhatsApp Business Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Account ID
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                        value={createForm.whatsapp_business_account_id}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            whatsapp_business_account_id: e.target.value,
                          })
                        }
                        placeholder="e.g., 2172945366518805"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                        value={createForm.whatsapp_phone_number_id}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            whatsapp_phone_number_id: e.target.value,
                          })
                        }
                        placeholder="e.g., 748110565050257"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Access Token
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                        value={createForm.whatsapp_access_token}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            whatsapp_access_token: e.target.value,
                          })
                        }
                        placeholder="Enter WhatsApp access token"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        App ID
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                        value={createForm.whatsapp_app_id}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            whatsapp_app_id: e.target.value,
                          })
                        }
                        placeholder="app_id_123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        App Secret
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                        value={createForm.whatsapp_app_secret}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            whatsapp_app_secret: e.target.value,
                          })
                        }
                        placeholder="app_secret_456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Webhook Verify Token
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                        value={createForm.whatsapp_webhook_verify_token}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            whatsapp_webhook_verify_token: e.target.value,
                          })
                        }
                        placeholder="webhook_verify_token_123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                        value={createForm.whatsapp_webhook_url}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            whatsapp_webhook_url: e.target.value,
                          })
                        }
                        placeholder="https://example.com/webhook"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedOrg(null);
                      setCreateForm({
                        name: "",
                        description: "",
                        website: "",
                        phone: "",
                        address: "",
                        whatsapp_business_account_id: "",
                        whatsapp_phone_number_id: "",
                        whatsapp_access_token: "",
                        whatsapp_webhook_verify_token: "",
                        whatsapp_webhook_url: "",
                        whatsapp_app_id: "",
                        whatsapp_app_secret: "",
                      });
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-white bg-whatsapp-600 hover:bg-whatsapp-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500"
                  >
                    {selectedOrg
                      ? "Update Organization"
                      : "Create Organization"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Configuration Modal */}
      {showConfigModal && selectedOrg && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                WhatsApp Configuration - {selectedOrg.name}
              </h3>
              <form onSubmit={handleSaveWhatsAppConfig} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Business Account ID
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-whatsapp-500 focus:border-whatsapp-500 sm:text-sm"
                    value={whatsappConfig.whatsapp_business_account_id || ""}
                    onChange={(e) =>
                      setWhatsappConfig({
                        ...whatsappConfig,
                        whatsapp_business_account_id: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Access Token
                  </label>
                  <input
                    type="password"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-whatsapp-500 focus:border-whatsapp-500 sm:text-sm"
                    value={whatsappConfig.whatsapp_access_token || ""}
                    onChange={(e) =>
                      setWhatsappConfig({
                        ...whatsappConfig,
                        whatsapp_access_token: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-whatsapp-500 focus:border-whatsapp-500 sm:text-sm"
                    value={whatsappConfig.whatsapp_phone_number_id || ""}
                    onChange={(e) =>
                      setWhatsappConfig({
                        ...whatsappConfig,
                        whatsapp_phone_number_id: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfigModal(false);
                      setSelectedOrg(null);
                      setWhatsappConfig({});
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-whatsapp-600 border border-transparent rounded-md hover:bg-whatsapp-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
