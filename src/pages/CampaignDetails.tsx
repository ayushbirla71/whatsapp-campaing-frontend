import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Campaign } from '../types/campaign';
import { CampaignAudience, CampaignAudienceListResponse } from '../types/audience';

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [audience, setAudience] = useState<CampaignAudience[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Audience Modal state
  const [showAddAudience, setShowAddAudience] = useState(false);
  const [addName, setAddName] = useState('');
  const [addMsisdn, setAddMsisdn] = useState('');
  const [addAttributes, setAddAttributes] = useState(''); // key=value per line or JSON
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadCampaign = async () => {
    if (!id) return;
    try {
      const res = await api.getCampaign(id);
      console.debug('[CampaignDetails] getCampaign response:', res);
      if (res.success && res.data) {
        const data: any = res.data as any;
        const campaignObj = data.campaign || data.item || data.result || data;
        setCampaign(campaignObj);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load campaign');
    }
  };

  const loadAudience = async (p = 1) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getCampaignAudience(id, p, 10);
      console.debug('[CampaignDetails] getCampaignAudience response:', res);
      if (res.success && res.data) {
        const data: any = res.data as any;
        const list = Array.isArray(data.campaign_audience)
          ? data.campaign_audience
          : (Array.isArray(data.audience) ? data.audience : (Array.isArray(data.items) ? data.items : []));
        setAudience(list);
        const tp = data?.pagination?.totalPages ?? 1;
        setTotalPages(typeof tp === 'number' && tp > 0 ? tp : 1);
      } else {
        setAudience([]);
        setTotalPages(1);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load campaign audience');
      setAudience([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadAudience(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page]);

  // Support multiple possible backend field names
  const scheduledAt = (campaign as any)?.scheduled_at
    || (campaign as any)?.scheduled_date
    || (campaign as any)?.scheduledAt
    || (campaign as any)?.scheduled_time
    || (campaign as any)?.scheduledDate;
  const campaignName = (campaign as any)?.name
    || (campaign as any)?.campaign_name
    || (campaign as any)?.title
    || '-';
  const campaignStatus = (campaign as any)?.status
    || (campaign as any)?.state
    || (campaign as any)?.campaign_status
    || undefined;

  const getCampaignStatusClass = (s?: string) => {
    switch (s) {
      case 'RUNNING': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'PAUSED': return 'bg-orange-100 text-orange-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'COMPLETED': return 'bg-gray-200 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAudienceStatusClass = (s?: string) => {
    switch (s) {
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'READ': return 'bg-blue-100 text-blue-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const parseAttributes = (text: string): Record<string, any> => {
    const trimmed = (text || '').trim();
    if (!trimmed) return {};
    // Try JSON first
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') return obj as Record<string, any>;
    } catch {}
    // Fallback: key=value per line
    const obj: Record<string, any> = {};
    trimmed.split(/\r?\n/).forEach(line => {
      const idx = line.indexOf('=');
      if (idx > -1) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k) obj[k] = v;
      }
    });
    return obj;
  };

  const handleSubmitAddAudience = async () => {
    setSubmitError(null);
    if (!id) { setSubmitError('Invalid campaign ID.'); return; }
    if (!campaign?.organization_id) { setSubmitError('Missing organization for this campaign.'); return; }
    if (!addName || !addMsisdn) { setSubmitError('Name and MSISDN are required.'); return; }
    setSubmitting(true);
    try {
      const attributes = parseAttributes(addAttributes);
      // Create master audience record for the organization
      const body: any = { name: addName, msisdn: addMsisdn, attributes };
      const createRes: any = await api.createMasterAudienceRecord(campaign.organization_id, body);
      const data: any = createRes?.data ?? createRes;
      const aud = data?.audience || data?.item || data?.result || data;
      const audienceId = aud?.id || aud?._id || aud?.audience_id || data?.id || data?._id;
      if (!audienceId) {
        throw new Error('Could not determine created audience ID');
      }
      // Link to campaign using addAudienceToCampaign endpoint
      await api.addAudienceToCampaign(id, [audienceId]);
      // Refresh list and close modal
      await loadAudience(page);
      setShowAddAudience(false);
      setAddName('');
      setAddMsisdn('');
      setAddAttributes('');
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message || e?.message || 'Failed to add audience to campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Details</h1>
          <p className="text-gray-600">View campaign information and audience.</p>
        </div>
        <button onClick={() => navigate(-1)} className="px-3 py-2 bg-gray-100 rounded">Back</button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>
      )}

      {/* Campaign Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {campaign ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Name</div>
              <div className="text-lg font-semibold text-gray-900">{campaignName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Scheduled At</div>
              <div className="text-gray-800">{scheduledAt ? new Date(scheduledAt).toLocaleString() : '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getCampaignStatusClass(campaignStatus)}`}>
                {(campaignStatus || '-').toString().toLowerCase()}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading campaign...</div>
        )}
      </div>

      {/* Audience Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Audience</h2>
          <button onClick={() => setShowAddAudience(true)} className="px-3 py-2 bg-whatsapp-500 text-white rounded hover:bg-whatsapp-600">Add Audience</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : (!Array.isArray(audience) || audience.length === 0) ? (
                <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">No audience</td></tr>
              ) : audience.map((ca, idx) => {
                const a = (ca as any).audience || ca;
                const first = a?.first_name || a?.firstName || '';
                const last = a?.last_name || a?.lastName || '';
                const name = (a?.name) || `${first} ${last}`.trim() || '-';
                const phone = a?.phone_number || a?.phone || a?.msisdn || '-';
                const status = (ca as any)?.message_status || (ca as any)?.delivery_status || (ca as any)?.state;
                const key = (ca as any)?._id || (ca as any)?.id || (ca as any)?.audience_id || idx;
                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{name}</td>
                    <td className="px-6 py-4 text-sm">{phone}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getAudienceStatusClass(status)}`}>
                        {(status || '-').toString().toLowerCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">Page {page} of {totalPages}</div>
            <div className="space-x-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} className="px-3 py-1 border rounded">Prev</button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} className="px-3 py-1 border rounded">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Audience Modal */}
      {showAddAudience && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Add Audience to Campaign</h3>
            {submitError && (
              <div className="mb-3 p-2 bg-red-50 text-red-700 rounded border border-red-200 text-sm">{submitError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">MSISDN</label>
                <input value={addMsisdn} onChange={e => setAddMsisdn(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="e.g. 919876543210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Attributes</label>
                <textarea value={addAttributes} onChange={e => setAddAttributes(e.target.value)} rows={4} className="mt-1 w-full border rounded px-3 py-2" placeholder={'JSON or key=value per line\ncity=Mumbai\nplan=premium'} />
                <p className="text-xs text-gray-500 mt-1">Enter JSON or key=value pairs (one per line).</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { if (!submitting) { setShowAddAudience(false); setSubmitError(null); } }} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                <button onClick={handleSubmitAddAudience} disabled={submitting || !addName || !addMsisdn} className={`px-4 py-2 rounded text-white ${submitting || !addName || !addMsisdn ? 'bg-gray-400 cursor-not-allowed' : 'bg-whatsapp-500 hover:bg-whatsapp-600'}`}>{submitting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetails;
