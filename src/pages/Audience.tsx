 import React, { useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../services/api';
import { Organization } from '../types/organization';
import { Audience as AudienceType, AudienceListResponse } from '../types/audience';
import { Plus } from 'lucide-react';

const Audience: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [audience, setAudience] = useState<AudienceType[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showCreateMasterModal, setShowCreateMasterModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [createMasterOrgId, setCreateMasterOrgId] = useState<string>('');
  const [bulkOrgId, setBulkOrgId] = useState<string>('');
  // Bulk CSV upload state
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvRecords, setCsvRecords] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Add master audience form fields
  const [maName, setMaName] = useState<string>('');
  const [maMsisdn, setMaMsisdn] = useState<string>('');
  const [maAccountNo, setMaAccountNo] = useState<string>('');
  const [maCity, setMaCity] = useState<string>('');
  const [maAge, setMaAge] = useState<string>('');
  const [maSubscription, setMaSubscription] = useState<string>('');

  const canPaginatePrev = useMemo(() => page > 1, [page]);
  const canPaginateNext = useMemo(() => page < totalPages, [page, totalPages]);
  useEffect(() => {
    // Load organizations
    const fetchOrgs = async () => {
      try {
        const res = await apiService.getOrganizations(1, 100);
        const list = (res.data?.organizations || []) as Organization[];
        setOrganizations(list);
        if (list.length && !selectedOrgId) {
          setSelectedOrgId(list[0].id);
          setCreateMasterOrgId(list[0].id);
          setBulkOrgId(list[0].id);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load organizations');
      }
    };
    fetchOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    const fetchAudience = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiService.getOrganizationAudience(selectedOrgId, page, limit);
        // Normalize possible backend shapes
        const payload: any = res?.data || {};
        const rawList: any[] = (payload.audience || payload.members || payload.data?.audience || payload.data?.members || []);
        const mapped = rawList.map((item: any) => ({
          // Preserve original if already matches expected shape
          _id: item._id || item.id || `${item.msisdn || item.phone_number || ''}-${item.name || ''}`,
          first_name: item.first_name || item.name || '',
          last_name: item.last_name || '',
          phone_number: item.phone_number || item.msisdn || '',
          email: item.email || '',
          attributes: item.attributes || item.meta || {},
          organization_id: item.organization_id || selectedOrgId,
          organization: item.organization,
          created_by: item.created_by || '',
          created_by_user: item.created_by_user,
          created_at: item.created_at || item.createdAt || new Date().toISOString(),
          updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
        }));
        setAudience(mapped);
        const pg = payload.pagination || payload.data?.pagination || {};
        setTotalPages(pg.totalPages || 1);
      } catch (e: any) {
        setError(e.message || 'Failed to load audience');
      } finally {
        setLoading(false);
      }
    };
    fetchAudience();
  }, [selectedOrgId, page, limit]);

  const handleCreateMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createMasterOrgId) return;
    // Basic validation for required fields
    if (!maName.trim() || !maMsisdn.trim()) {
      setError('Please provide both Name and MSISDN');
      return;
    }
    try {
      const payload = {
        name: maName.trim(),
        msisdn: maMsisdn.trim(),
        attributes: {
          account_no: maAccountNo || undefined,
          city: maCity || undefined,
          age: maAge || undefined,
          subscription: maSubscription || undefined,
        },
      };
      await apiService.createMasterAudienceRecord(createMasterOrgId, payload);
      setShowCreateMasterModal(false);
      // Clear form fields
      setMaName('');
      setMaMsisdn('');
      setMaAccountNo('');
      setMaCity('');
      setMaAge('');
      setMaSubscription('');
      // refresh list
      const res = await apiService.getOrganizationAudience(selectedOrgId || createMasterOrgId, page, limit);
      const responsePayload: any = res?.data || {};
      const rawList: any[] = (responsePayload.audience || responsePayload.members || responsePayload.data?.audience || responsePayload.data?.members || []);
      const mapped = rawList.map((item: any) => ({
        _id: item._id || item.id || `${item.msisdn || item.phone_number || ''}-${item.name || ''}`,
        first_name: item.first_name || item.name || '',
        last_name: item.last_name || '',
        phone_number: item.phone_number || item.msisdn || '',
        email: item.email || '',
        attributes: item.attributes || item.meta || {},
        organization_id: item.organization_id || (selectedOrgId || createMasterOrgId),
        organization: item.organization,
        created_by: item.created_by || '',
        created_by_user: item.created_by_user,
        created_at: item.created_at || item.createdAt || new Date().toISOString(),
        updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
      }));
      setAudience(mapped);
      const pg = responsePayload.pagination || responsePayload.data?.pagination || {};
      setTotalPages(pg.totalPages || 1);
    } catch (e: any) {
      setError(e.message || 'Failed to create master audience');
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkOrgId) return;
    if (!csvRecords.length) {
      setError('Please upload a CSV with at least one row before submitting.');
      return;
    }
    try {
      await apiService.bulkCreateMasterAudience(bulkOrgId, { records: csvRecords });
      setShowBulkModal(false);
      // reset CSV state
      setCsvFileName('');
      setCsvRecords([]);
      // refresh list
      const res = await apiService.getOrganizationAudience(selectedOrgId || bulkOrgId, page, limit);
      const responsePayload2: any = res?.data || {};
      const rawList: any[] = (responsePayload2.audience || responsePayload2.members || responsePayload2.data?.audience || responsePayload2.data?.members || []);
      const mapped = rawList.map((item: any) => ({
        _id: item._id || item.id || `${item.msisdn || item.phone_number || ''}-${item.name || ''}`,
        first_name: item.first_name || item.name || '',
        last_name: item.last_name || '',
        phone_number: item.phone_number || item.msisdn || '',
        email: item.email || '',
        attributes: item.attributes || item.meta || {},
        organization_id: item.organization_id || (selectedOrgId || bulkOrgId),
        organization: item.organization,
        created_by: item.created_by || '',
        created_by_user: item.created_by_user,
        created_at: item.created_at || item.createdAt || new Date().toISOString(),
        updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
      }));
      setAudience(mapped);
      const pg = responsePayload2.pagination || responsePayload2.data?.pagination || {};
      setTotalPages(pg.totalPages || 1);
    } catch (e: any) {
      setError(e.message || 'Failed to bulk create audience');
    }
  };

  // Simple CSV parser: expects headers: name,msisdn,account_no,city,age,subscription
  const handleCsvSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) {
          setError('The selected CSV appears to be empty.');
          setCsvFileName('');
          setCsvRecords([]);
          return;
        }
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const idx = (name: string) => headers.indexOf(name);
        const requiredIdx = idx('msisdn') !== -1 && (idx('name') !== -1 || (idx('first_name') !== -1 && idx('last_name') !== -1));
        if (!requiredIdx) {
          setError('CSV must include at least msisdn and name (or first_name,last_name) headers.');
          setCsvFileName('');
          setCsvRecords([]);
          return;
        }
        const recs = lines.slice(1).map((line) => {
          const cols = line.split(',').map((c) => c.trim());
          const nameIdx = idx('name');
          const firstNameIdx = idx('first_name');
          const lastNameIdx = idx('last_name');
          const msisdnIdx = idx('msisdn');
          const accountIdx = idx('account_no');
          const cityIdx = idx('city');
          const ageIdx = idx('age');
          const subIdx = idx('subscription');
          const first_name = nameIdx !== -1 ? cols[nameIdx] : (firstNameIdx !== -1 ? cols[firstNameIdx] : '');
          const last_name = nameIdx !== -1 ? '' : (lastNameIdx !== -1 ? cols[lastNameIdx] : '');
          const msisdn = msisdnIdx !== -1 ? cols[msisdnIdx] : '';
          const attributes: any = {};
          if (accountIdx !== -1 && cols[accountIdx]) attributes.account_no = cols[accountIdx];
          if (cityIdx !== -1 && cols[cityIdx]) attributes.city = cols[cityIdx];
          if (ageIdx !== -1 && cols[ageIdx]) attributes.age = cols[ageIdx];
          if (subIdx !== -1 && cols[subIdx]) attributes.subscription = cols[subIdx];
          return { name: `${first_name}${last_name ? ' ' + last_name : ''}`.trim(), msisdn, attributes };
        }).filter((r) => r.msisdn && r.name);
        if (!recs.length) {
          setError('No valid rows found in CSV. Ensure msisdn and name are present.');
          setCsvFileName('');
          setCsvRecords([]);
          return;
        }
        setError(null);
        setCsvFileName(file.name);
        setCsvRecords(recs);
      } catch (err: any) {
        setError('Failed to parse CSV. Please check the file format.');
        setCsvFileName('');
        setCsvRecords([]);
      }
    };
    reader.onerror = () => {
      setError('Unable to read the selected file.');
      setCsvFileName('');
      setCsvRecords([]);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6">
      

      {/* Header and actions (match style of Users/Templates/Campaigns) */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audience Management</h1>
            <p className="text-gray-600 mt-1">Manage master audience records and bulk operations</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateMasterModal(true)}
              className="bg-whatsapp-500 text-white px-4 py-2 rounded-lg hover:bg-whatsapp-600 flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add master audience
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-whatsapp-500 text-white px-4 py-2 rounded-lg hover:bg-whatsapp-600 flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              Bulk add audience
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateMasterModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add master audience</h3>
              <form onSubmit={handleCreateMasterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization</label>
                  <select
                    value={createMasterOrgId}
                    onChange={(e) => setCreateMasterOrgId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-whatsapp-500 focus:border-whatsapp-500"
                    required
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={maName}
                    onChange={(e) => setMaName(e.target.value)}
                    placeholder="Enter full name"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-whatsapp-500 focus:border-whatsapp-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">MSISDN</label>
                  <input
                    type="tel"
                    value={maMsisdn}
                    onChange={(e) => setMaMsisdn(e.target.value)}
                    placeholder="e.g., 919876543210"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-whatsapp-500 focus:border-whatsapp-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account No</label>
                    <input
                      type="text"
                      value={maAccountNo}
                      onChange={(e) => setMaAccountNo(e.target.value)}
                      placeholder="Account number"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-whatsapp-500 focus:border-whatsapp-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      value={maCity}
                      onChange={(e) => setMaCity(e.target.value)}
                      placeholder="City"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-whatsapp-500 focus:border-whatsapp-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <input
                      type="number"
                      min="0"
                      value={maAge}
                      onChange={(e) => setMaAge(e.target.value)}
                      placeholder="Age"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-whatsapp-500 focus:border-whatsapp-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subscription</label>
                    <input
                      type="text"
                      value={maSubscription}
                      onChange={(e) => setMaSubscription(e.target.value)}
                      placeholder="Subscription"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-whatsapp-500 focus:border-whatsapp-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateMasterModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel

                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-whatsapp-500 rounded-md hover:bg-whatsapp-600"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk add audience</h3>
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization</label>
                  <select
                    value={bulkOrgId}
                    onChange={(e) => setBulkOrgId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-whatsapp-500 focus:border-whatsapp-500"
                    required
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCsvSelected(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium text-white bg-whatsapp-500 rounded-md hover:bg-whatsapp-600"
                  >
                    Choose CSV File
                  </button>
                  {csvFileName ? (
                    <p className="mt-2 text-xs text-gray-600">Selected: {csvFileName} ({csvRecords.length} rows)</p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">Expected headers: name, msisdn, account_no, city, age, subscription</p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-whatsapp-500 rounded-md hover:bg-whatsapp-600"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Audience list */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Audience</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4" colSpan={4}>Loading...</td>
                </tr>
              ) : audience.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-gray-500" colSpan={4}>No audience found.</td>
                </tr>
              ) : (
                audience.map((m) => (
                  <tr key={m._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {m.first_name} {m.last_name || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{m.phone_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{m.organization_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {/* Actions in future: view/edit/delete */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows:</label>
            <select
              className="rounded-md border-gray-300 shadow-sm focus:border-whatsapp-500 focus:ring-whatsapp-500"
              value={limit}
              onChange={(e) => {
                setPage(1);
                setLimit(parseInt(e.target.value, 10));
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <div className="ml-4 flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPaginatePrev}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!canPaginateNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded bg-red-50 text-red-700 p-3 text-sm">{error}</div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Audience;

