import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import api from '../services/api';
import { Campaign, CampaignListResponse } from '../types/campaign';
import { useAuth } from '../contexts/AuthContext';

const ApprovalCampaign: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPendingCampaignApprovals(page, limit);
      const payload: any = res?.data || {};
      const list: Campaign[] = payload.campaigns || payload.data?.campaigns || [];
      const pg = payload.pagination || payload.data?.pagination || {};
      setCampaigns(list);
      setTotalPages(pg.totalPages || 1);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const deriveId = (c: any): string | null => {
    // Prefer UUID fields for approval endpoints
    return c?.id || c?.campaign_id || null;
  };

  const handleApprove = async (campaign: Campaign) => {
    try {
      const cid = deriveId(campaign);
      if (!cid) { setError('Campaign UUID is missing or invalid on this item'); return; }
      await api.approveCampaign(cid);
      await fetchPending();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Approve failed');
    }
  };

  const handleReject = async (campaign: Campaign) => {
    try {
      const cid = deriveId(campaign);
      if (!cid) { setError('Campaign UUID is missing or invalid on this item'); return; }
      await api.rejectCampaign(cid, 'Campaign not suitable for approval at this time.');
      await fetchPending();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Reject failed');
    }
  };

  const statusBadge = (s?: string) => {
    const status = (s || '-').toString().toUpperCase();
    const cls = status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                status === 'RUNNING' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
    return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{status.toLowerCase()}</span>;
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
          <h1 className="text-2xl font-bold text-gray-900">Approval - Campaigns</h1>
        </div>
        <div className="flex items-center gap-4">
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
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Pending Campaigns</h2>
        </div>

        {error && (
          <div className="m-4 rounded bg-red-50 text-red-700 p-3 text-sm">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-6 py-4" colSpan={4}>Loading...</td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td className="px-6 py-4 text-gray-500" colSpan={4}>No campaigns found.</td></tr>
              ) : campaigns.map((c) => {
                const scheduled = (c as any)?.scheduled_at || (c as any)?.scheduled_date || (c as any)?.scheduledAt || null;
                return (
                  <tr key={(c as any)?._id || (c as any)?.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{scheduled ? new Date(scheduled).toLocaleString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{statusBadge((c as any)?.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {(user?.role === 'super_admin' || user?.role === 'system_admin') && (
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => handleApprove(c)} className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700">
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </button>
                          <button onClick={() => handleReject(c)} className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700">
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-b-lg p-4 flex items-center justify-between">
          <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>Prev</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={!canNext}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalCampaign;
