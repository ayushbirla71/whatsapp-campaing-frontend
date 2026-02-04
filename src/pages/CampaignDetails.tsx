import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Info, MessageCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { Campaign } from "../types/campaign";
import {
  CampaignAudience,
  CampaignAudienceListResponse,
} from "../types/audience";
import * as XLSX from "xlsx";

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [audience, setAudience] = useState<CampaignAudience[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeReplies, setIncludeReplies] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set(),
  );

  const toggleReplies = (audienceId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(audienceId)) {
      newExpanded.delete(audienceId);
    } else {
      newExpanded.add(audienceId);
    }
    setExpandedReplies(newExpanded);
  };

  const formatReplyTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Add Audience Modal state
  const [showAddAudience, setShowAddAudience] = useState(false);
  // Bulk Add Audience state
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkRows, setBulkRows] = useState<
    Array<{ name: string; msisdn: string; attributes: Record<string, string> }>
  >([]);
  const [bulkConfirmed, setBulkConfirmed] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<Array<Record<string, string>>>(
    [],
  ); // per-row field->error
  // Only MSISDN and template params shown in form (name auto-generated)
  // const [addMsisdn, setAddMsisdn] = useState("");
  const [audiences, setAudiences] = useState([
    {
      msisdn: "",
      tplParams: {} as Record<string, string>,
    },
  ]);
  const addMoreAudience = () => {
    setAudiences((prev) => [
      ...prev,
      {
        msisdn: "",
        tplParams: {},
      },
    ]);
  };

  const removeAudience = (index: number) => {
    setAudiences((prev) => prev.filter((_, i) => i !== index));
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Template-driven audience params
  const [tplPlaceholders, setTplPlaceholders] = useState<string[]>([]);
  const [tplExamples, setTplExamples] = useState<string[]>([]);
  const [tplParams, setTplParams] = useState<Record<string, string>>({});
  const [tplLabels, setTplLabels] = useState<Record<string, string>>({}); // maps numeric placeholder (e.g., '1') -> label (e.g., 'Name')

  const loadCampaign = async () => {
    if (!id) return;
    try {
      const res = await api.getCampaign(id);
      console.debug("[CampaignDetails] getCampaign response:", res);
      if (res.success && res.data) {
        const data: any = res.data as any;
        const campaignObj = data.campaign || data.item || data.result || data;
        setCampaign(campaignObj);
        // Preload template params when campaign loads
        try {
          const tid =
            (campaignObj as any)?.template_id ||
            (campaignObj as any)?.template?.id ||
            (campaignObj as any)?.template?.template_id;
          if (tid) {
            await prepareTemplateFields(tid);
          } else {
            // reset if no template id
            setTplPlaceholders([]);
            setTplExamples([]);
            setTplParams({});
          }
        } catch {
          // ignore template preload errors
        }
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Failed to load campaign";
      setError(msg);
      toast.error(msg);
    }
  };

  const loadAudience = async (p = 1) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getCampaignAudience(id, p, 10, includeReplies);
      console.debug("[CampaignDetails] getCampaignAudience response:", res);
      if (res.success && res.data) {
        const data: any = res.data as any;
        const list = Array.isArray(data.campaign_audience)
          ? data.campaign_audience
          : Array.isArray(data.audience)
            ? data.audience
            : Array.isArray(data.items)
              ? data.items
              : [];
        // console.log("data of audience:-", list, data.campaign_audience);
        setAudience(list);
        const tp = data?.pagination?.totalPages ?? 1;
        setTotalPages(typeof tp === "number" && tp > 0 ? tp : 1);
      } else {
        setAudience([]);
        setTotalPages(1);
      }
    } catch (e: any) {
      console.error("[CampaignDetails] loadAudience error:", e);
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
  }, [page, includeReplies]);

  // Fetch and compute template placeholders/examples
  const prepareTemplateFields = async (templateId: string) => {
    try {
      const res: any = await api.getTemplate(templateId);
      const payload = res?.data ?? res?.template ?? res?.result ?? res;
      const components =
        payload?.components ??
        payload?.data?.components ??
        payload?.template?.components ??
        payload?.result?.components ??
        [];
      // Extract BODY text and examples
      const list = Array.isArray(components) ? components : [];
      const body =
        list.find((c: any) => {
          const t = (c?.type || c?.component_type || c?.name || "")
            .toString()
            .toUpperCase();
          return t === "BODY";
        }) || {};
      const bodyText: string =
        body?.text || body?.body_text || body?.data?.text || "";
      // Collect parameter labels from template JSON if present
      const paramLabelsSource =
        payload?.parameters ??
        payload?.data?.parameters ??
        payload?.template?.parameters ??
        payload?.result?.parameters ??
        body?.parameters ??
        null;
      const labels: Record<string, string> = {};
      if (
        paramLabelsSource &&
        typeof paramLabelsSource === "object" &&
        !Array.isArray(paramLabelsSource)
      ) {
        Object.entries(paramLabelsSource).forEach(([k, v]) => {
          if (/^\d+$/.test(String(k)) && typeof v === "string")
            labels[String(k)] = v as string;
        });
      }
      const ex = body?.example || body?.examples || body?.data?.example || {};
      let vals: any = ex?.body_text ?? ex?.body ?? ex?.values;
      let exampleValues: string[] = [];
      if (Array.isArray(vals)) {
        if (Array.isArray(vals[0]))
          exampleValues = (vals[0] as any[]).map((v) => String(v));
        else exampleValues = vals.map((v: any) => String(v));
      } else if (typeof vals === "string") {
        exampleValues = [vals];
      }
      // Compute placeholders order from body text
      const matches = Array.from(
        String(bodyText || "").matchAll(/\{\{\s*(\d+)\s*\}\}/g),
      );
      const placeholderOrder = Array.from(
        new Set(matches.map((m) => String(m[1]))),
      );
      // Build params with keys '{{n}}'
      const params: Record<string, string> = {};
      placeholderOrder.forEach((ph, i) => {
        params[`{{${ph}}}`] = exampleValues[i] ?? "";
      });
      setTplPlaceholders(placeholderOrder);
      setTplExamples(exampleValues);
      setTplParams(params);
      setTplLabels(labels);
    } catch (e) {
      // If fetching template fails, just clear
      setTplPlaceholders([]);
      setTplExamples([]);
      setTplParams({});
      setTplLabels({});
    }
  };

  const openAddAudience = async () => {
    setShowAddAudience(true);
    try {
      const tid =
        (campaign as any)?.template_id ||
        (campaign as any)?.template?.id ||
        (campaign as any)?.template?.template_id;
      if (tid) await prepareTemplateFields(tid);
    } catch {}
  };

  // Bulk Add: open and prepare template fields
  const openBulkAddAudience = async () => {
    setShowBulkAdd(true);
    try {
      const tid =
        (campaign as any)?.template_id ||
        (campaign as any)?.template?.id ||
        (campaign as any)?.template?.template_id;
      if (tid) await prepareTemplateFields(tid);
    } catch {}
  };

  // Compute attribute header keys for bulk based on template labels or fallbacks
  const templateAttributeKeys = useMemo(() => {
    if (!tplPlaceholders || tplPlaceholders.length === 0) return [] as string[];
    const keys = tplPlaceholders.map((ph) =>
      tplLabels && tplLabels[ph] ? String(tplLabels[ph]).trim() : `param_${ph}`,
    );
    // Remove any 'name' key to avoid duplication with the top-level name column
    return keys.filter((k) => k.toLowerCase() !== "name");
  }, [tplPlaceholders, tplLabels]);

  // Validate a single row
  const validateBulkRow = (row: {
    name: string;
    msisdn: string;
    attributes: Record<string, string>;
  }) => {
    const errs: Record<string, string> = {};
    if (!row.name || !row.name.trim()) errs.name = "Required";
    if (!row.msisdn || !row.msisdn.trim()) errs.msisdn = "Required";
    // Require all template attribute keys if present
    templateAttributeKeys.forEach((k) => {
      if (
        typeof row.attributes?.[k] === "undefined" ||
        String(row.attributes[k]).trim() === ""
      )
        errs[k] = "Required";
    });
    return errs;
  };

  // Create and download demo Excel
  const downloadDemoExcel = () => {
    try {
      const headers = ["name", "msisdn", ...templateAttributeKeys];
      const sample1: any = { name: "Alice Johnson", msisdn: "+1234567890" };
      const sample2: any = { name: "Bob Wilson", msisdn: "+1234567892" };
      templateAttributeKeys.forEach((k, idx) => {
        sample1[k] = `example_${idx + 1}_A`;
        sample2[k] = `example_${idx + 1}_B`;
      });
      const wsData = [
        headers,
        ...[sample1, sample2].map((obj) => headers.map((h) => obj[h] ?? "")),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BulkAudience");
      XLSX.writeFile(wb, "bulk_audience_demo.xlsx");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate demo file");
    }
  };

  // Handle file upload and parse
  const handleBulkFileUpload = async (file: File) => {
    setBulkUploading(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows: Array<{
        name: string;
        msisdn: string;
        attributes: Record<string, string>;
      }> = [];
      json.forEach((rowObj) => {
        // Map headers case-insensitively for name and msisdn
        const normEntries = Object.entries(rowObj).map(([k, v]) => [
          String(k).trim(),
          String(v ?? "").trim(),
        ]) as [string, string][];
        const getVal = (key: string) => {
          const found = normEntries.find(
            ([k]) => k.toLowerCase() === key.toLowerCase(),
          );
          return found ? found[1] : "";
        };
        const name = getVal("name");
        const msisdn = getVal("msisdn");
        const attributes: Record<string, string> = {};
        // For attributes, use exact header names (excluding name/msisdn) as keys
        normEntries.forEach(([k, v]) => {
          if (/^name$/i.test(k) || /^msisdn$/i.test(k)) return;
          if (v) attributes[k] = v;
        });
        rows.push({ name, msisdn, attributes });
      });
      // Validate rows and set errors
      const errs = rows.map((r) => validateBulkRow(r));
      setBulkErrors(errs);
      setBulkRows(rows);
      setBulkConfirmed(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to parse file");
    } finally {
      setBulkUploading(false);
    }
  };

  const onChangeBulkCell = (
    rowIdx: number,
    key: string,
    value: string,
    isAttribute: boolean,
  ) => {
    setBulkRows((prev) => {
      const next = [...prev];
      const r = { ...next[rowIdx] };
      if (isAttribute) {
        r.attributes = { ...r.attributes, [key]: value };
      } else {
        (r as any)[key] = value;
      }
      next[rowIdx] = r;
      return next;
    });
    // Re-validate this row
    setBulkErrors((prev) => {
      const next = [...prev];
      next[rowIdx] = validateBulkRow({
        ...bulkRows[rowIdx],
        [key]: value,
      } as any);
      return next;
    });
  };

  const confirmBulk = () => {
    // Final validation before freezing
    const errs = bulkRows.map((r) => validateBulkRow(r));
    setBulkErrors(errs);
    const hasAnyError = errs.some((er) => Object.keys(er).length > 0);
    if (hasAnyError) {
      toast.error(
        "Please fix required fields highlighted in red before confirming",
      );
      return;
    }
    setBulkConfirmed(true);
  };

  const submitBulk = async () => {
    try {
      if (!id) throw new Error("Invalid campaign ID");
      if (!bulkConfirmed) {
        toast.info("Please confirm the data before submitting");
        return;
      }
      // Prepare payload: only include non-empty attributes
      const payload = bulkRows.map((r) => {
        const attrs: Record<string, string> = {};
        Object.entries(r.attributes || {}).forEach(([k, v]) => {
          if (String(v).trim()) attrs[k] = String(v).trim();
        });
        // Top-level name should mirror attributes.name if present; otherwise use row.name
        const topName =
          typeof attrs["name"] === "string" && attrs["name"].trim()
            ? attrs["name"].trim()
            : r.name;
        // Ensure backend-required attributes.name is present (no duplicate column in UI)
        if (!attrs["name"] && topName) attrs["name"] = topName;
        return { name: topName, msisdn: r.msisdn, attributes: attrs };
      });
      await api.addAudienceToCampaign(id, payload);
      toast.success("Bulk audience submitted");
      setShowBulkAdd(false);
      setBulkRows([]);
      setBulkErrors([]);
      setBulkConfirmed(false);
      await loadAudience(page);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to submit bulk audience",
      );
    }
  };

  // Support multiple possible backend field names
  const scheduledAt =
    (campaign as any)?.scheduled_at ||
    (campaign as any)?.scheduled_date ||
    (campaign as any)?.scheduledAt ||
    (campaign as any)?.scheduled_time ||
    (campaign as any)?.scheduledDate;
  const campaignName =
    (campaign as any)?.name ||
    (campaign as any)?.campaign_name ||
    (campaign as any)?.title ||
    "-";
  const campaignStatus =
    (campaign as any)?.status ||
    (campaign as any)?.state ||
    (campaign as any)?.campaign_status ||
    undefined;

  // Extract campaign statistics
  const campaignStats = useMemo(() => {
    if (!campaign) return null;
    const c = campaign as any;
    return {
      totalTargeted: c.total_targeted_audience || 0,
      totalSent: c.total_sent || 0,
      totalDelivered: c.total_delivered || 0,
      totalRead: c.total_read || 0,
      totalReplied: c.total_replied || 0,
      totalFailed: c.total_failed || 0,
    };
  }, [campaign]);

  const getCampaignStatusClass = (s?: string) => {
    switch (s) {
      case "RUNNING":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-blue-100 text-blue-800";
      case "PAUSED":
        return "bg-orange-100 text-orange-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "COMPLETED":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAudienceStatusClass = (s?: string) => {
    switch (s) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "READ":
        return "bg-blue-100 text-blue-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const parseAttributes = (text: string): Record<string, any> => {
    const trimmed = (text || "").trim();
    if (!trimmed) return {};
    // Try JSON first
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === "object") return obj as Record<string, any>;
    } catch {}
    // Fallback: key=value per line
    const obj: Record<string, any> = {};
    trimmed.split(/\r?\n/).forEach((line) => {
      const idx = line.indexOf("=");
      if (idx > -1) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k) obj[k] = v;
      }
    });
    return obj;
  };

  // const handleSubmitAddAudience = async () => {
  //   setSubmitError(null);
  //   if (!id) {
  //     setSubmitError("Invalid campaign ID.");
  //     return;
  //   }
  //   if (!campaign?.organization_id) {
  //     setSubmitError("Missing organization for this campaign.");
  //     return;
  //   }
  //   // Only template parameters and msisdn are shown; name is generated
  //   setSubmitting(true);
  //   try {
  //     // Build attributes strictly from user-entered values mapped to human-readable labels.
  //     // Rules:
  //     // - Use placeholder label (from tplLabels) if available; otherwise a stable key like param_<n>.
  //     // - Do NOT include raw placeholder keys like {{1}}.
  //     // - Do NOT include example text as keys or any duplicates.
  //     // - Only include entries where the user provided a non-empty value (no example fallbacks).
  //     const attributes: Record<string, any> = {};
  //     if (tplPlaceholders.length > 0) {
  //       tplPlaceholders.forEach((ph) => {
  //         const keyTpl = `{{${ph}}}`;
  //         const label =
  //           tplLabels && tplLabels[ph]
  //             ? String(tplLabels[ph]).trim()
  //             : `param_${ph}`;
  //         const rawVal =
  //           tplParams && typeof tplParams[keyTpl] !== "undefined"
  //             ? String(tplParams[keyTpl])
  //             : "";
  //         const val = rawVal.trim();
  //         if (val) {
  //           // Only set if not already set to avoid duplicates
  //           if (typeof attributes[label] === "undefined") {
  //             attributes[label] = val;
  //           }
  //         }
  //       });
  //     }
  //     // Backend currently validates name and msisdn; provide minimal defaults silently
  //     const defaultName = `Audience ${Date.now()}`;
  //     // Use a generic 12-digit MSISDN with country code prefix (adjust if your backend enforces a specific format)
  //     const defaultMsisdn = "910000000000";
  //     // Create master audience record for the organization with required fields
  //     const userProvidedName =
  //       typeof attributes["name"] === "string"
  //         ? String(attributes["name"]).trim()
  //         : "";
  //     const finalName = userProvidedName || defaultName;
  //     const body: any = {
  //       name: finalName,
  //       msisdn: addMsisdn?.trim() || defaultMsisdn,
  //       attributes,
  //     };
  //     // console.log("campaignid:-", campaign.id);
  //     const createRes: any = await api.createMasterAudienceRecord(
  //       campaign.organization_id,
  //       body,
  //       campaign.id,
  //     );
  //     const data: any = createRes?.data ?? createRes;
  //     const aud = data?.audience || data?.item || data?.result || data;
  //     // Build audience object required by backend (name, msisdn, attributes)
  //     const audienceObj = {
  //       name: aud?.name || finalName,
  //       msisdn: aud?.msisdn || aud?.phone_number || body.msisdn,
  //       attributes,
  //     };
  //     if (!audienceObj.msisdn) {
  //       throw new Error("Missing msisdn for audience");
  //     }
  //     // Link to campaign using addAudienceToCampaign endpoint with object payload
  //     await api.addAudienceToCampaign(id, [audienceObj]);
  //     // Refresh list and close modal
  //     await loadAudience(page);
  //     setShowAddAudience(false);
  //     setAddMsisdn("");
  //     toast.success("Audience added to campaign");
  //     // nothing else to reset
  //   } catch (e: any) {
  //     const msg =
  //       e?.response?.data?.message ||
  //       e?.message ||
  //       "Failed to add audience to campaign";
  //     setSubmitError(msg);
  //     toast.error(msg);
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  const handleSubmitAddAudience = async () => {
    // setSubmitError(null);

    setSubmitError(null);
    if (!id) {
      setSubmitError("Invalid campaign ID.");
      return;
    }
    if (!campaign?.organization_id) {
      setSubmitError("Missing organization for this campaign.");
      return;
    }

    setSubmitting(true);
    try {
      const audiencePayload = audiences.map((aud, index) => {
        const attributes: Record<string, any> = {};

        tplPlaceholders.forEach((ph) => {
          const keyTpl = `{{${ph}}}`;
          const label = tplLabels[ph] || `param_${ph}`;
          const val = aud.tplParams[keyTpl]?.trim();
          if (val) attributes[label] = val;
        });

        return {
          name: `Audience ${Date.now()}_${index}`,
          msisdn: aud.msisdn || "910000000000",
          attributes,
        };
      });

      // CORRECT CALL
      const createRes: any = await api.addAudienceToCampaign(
        campaign.id,
        audiencePayload,
      );

      const data: any = createRes?.data ?? createRes;
      // console.log("data:-", data);
      if (data?.failed > 0 && Array.isArray(data.errors)) {
        data.errors.forEach((err: any, idx: number) => {
          const phone = err?.data?.msisdn ? ` (${err.data.msisdn})` : "";

          toast.error(
            `Audience ${idx + 1}${phone}: ${err.error || "Invalid data"}`,
          );
        });

        return; // keep modal open
      }

      await loadAudience(page);
      setShowAddAudience(false);
      setAudiences([{ msisdn: "", tplParams: {} }]);
      toast.success("Audiences added successfully");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to add audience";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusTimestamp = (item: any) => {
    const status = item.message_status || item.delivery_status || item.state;
    switch (status) {
      case "sent":
        return item.sent_at;
      case "delivered":
        return item.delivered_at;
      case "read":
        return item.read_at;
      case "failed":
        return item.failed_at;
      default:
        return item.created_at;
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString();
  };

  // console.log("capegn data:-", campaign);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Details</h1>
          <p className="text-gray-600">
            View campaign information and audience.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 bg-gray-100 rounded"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Campaign Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {campaign ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Name</div>
              <div className="text-lg font-semibold text-gray-900">
                {campaignName}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Scheduled At</div>
              <div className="text-gray-800">
                {scheduledAt ? new Date(scheduledAt).toLocaleString() : "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${getCampaignStatusClass(
                  campaignStatus,
                )}`}
              >
                {(campaignStatus || "-").toString().toLowerCase()}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading campaign...</div>
        )}
      </div>

      {/* Campaign Statistics */}
      {campaignStats && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Campaign Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {campaignStats.totalTargeted}
              </div>
              <div className="text-xs text-gray-500">Targeted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {campaignStats.totalSent}
              </div>
              <div className="text-xs text-gray-500">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {campaignStats.totalDelivered}
              </div>
              <div className="text-xs text-gray-500">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {campaignStats.totalRead}
              </div>
              <div className="text-xs text-gray-500">Read</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">
                {campaignStats.totalReplied}
              </div>
              <div className="text-xs text-gray-500">Replied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {campaignStats.totalFailed}
              </div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Audience Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Audience</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeReplies}
                  onChange={(e) => {
                    setIncludeReplies(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-gray-300 text-whatsapp-600 focus:ring-whatsapp-500"
                />
                Include Replies
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openBulkAddAudience}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Bulk Add Audience
              </button>
              {(campaign?.status as any) !== "ready_to_launch" && (
                <button
                  onClick={openAddAudience}
                  className="px-3 py-2 bg-whatsapp-500 text-white rounded hover:bg-whatsapp-600"
                >
                  Add Audience
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                {includeReplies && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Replies
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={includeReplies ? 5 : 4}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    <div className="flex h-10 items-center justify-center gap-2 text-gray-500">
                      <svg
                        className="h-5 w-5 animate-spin text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-label="Loading"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>

                      <span className="text-sm">Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : !Array.isArray(audience) || audience.length === 0 ? (
                <tr>
                  <td
                    colSpan={includeReplies ? 5 : 4}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No audience
                  </td>
                </tr>
              ) : (
                audience.map((ca, idx) => {
                  const a = (ca as any).audience || ca;
                  const first = a?.first_name || a?.firstName || "";
                  const last = a?.last_name || a?.lastName || "";
                  const name = a?.name || `${first} ${last}`.trim() || "-";
                  const phone = a?.phone_number || a?.phone || a?.msisdn || "-";
                  const status =
                    (ca as any)?.message_status ||
                    (ca as any)?.delivery_status ||
                    (ca as any)?.state;
                  const timestamp = getStatusTimestamp(ca);
                  const replies = (ca as any)?.replies || [];
                  const key =
                    (ca as any)?._id ||
                    (ca as any)?.id ||
                    (ca as any)?.audience_id ||
                    idx;
                  const isExpanded = expandedReplies.has(key);
                  const failureResponse = (ca as any)?.failure_response;

                  // console.log("ca:-", ca);
                  let failureReason: any = null;

                  if ((ca as any)?.failure_reason) {
                    try {
                      failureReason = JSON.parse((ca as any).failure_reason);
                    } catch (e) {
                      console.error(
                        "Invalid failure_reason JSON",
                        (ca as any).failure_reason,
                      );
                    }
                  }

                  return (
                    <>
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {name}
                        </td>
                        <td className="px-6 py-4 text-sm">{phone}</td>
                        {/* <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getAudienceStatusClass(
                              status,
                            )}`}
                          >
                            {(status || "-").toString().toLowerCase()}
                          </span>
                        </td> */}
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${getAudienceStatusClass(
                                status,
                              )}`}
                            >
                              {(status || "-").toString().toLowerCase()}
                            </span>

                            {/* Info tooltip only for FAILED */}
                            {status?.toString().toLowerCase() === "failed" &&
                              failureReason && (
                                <div className="relative group">
                                  {/* Info Icon */}
                                  <Info className="h-4 w-4 text-gray-400 cursor-pointer" />

                                  {/* Tooltip */}
                                  <div className="absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg group-hover:block">
                                    <div className="font-semibold text-gray-900 mb-1">
                                      {failureReason.title || "Failure reason"}
                                    </div>

                                    {failureReason.error_data?.details && (
                                      <div className="text-gray-600 mb-2">
                                        {failureReason.error_data.details}
                                      </div>
                                    )}

                                    {failureReason.code && (
                                      <div className="text-gray-500">
                                        Code:{" "}
                                        <span className="font-medium text-gray-700">
                                          {failureReason.code}
                                        </span>
                                      </div>
                                    )}

                                    {failureReason.href && (
                                      <a
                                        href={failureReason.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-block text-blue-600 underline"
                                      >
                                        View error docs
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatTimestamp(timestamp)}
                        </td>
                        {includeReplies && (
                          <td className="px-6 py-4 text-sm">
                            {replies.length > 0 ? (
                              <button
                                onClick={() => toggleReplies(key)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <MessageCircle className="h-4 w-4" />
                                {replies.length}{" "}
                                {replies.length === 1 ? "reply" : "replies"}
                              </button>
                            ) : (
                              <span className="text-gray-400">No replies</span>
                            )}
                          </td>
                        )}
                      </tr>
                      {includeReplies && isExpanded && replies.length > 0 && (
                        <tr key={`${key}-replies`}>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                Replies from {name}
                              </h4>
                              <div className="space-y-2">
                                {replies.map((reply: any, replyIdx: number) => (
                                  <div
                                    key={replyIdx}
                                    className="bg-white rounded-lg border border-gray-200 p-3"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-xs font-medium text-gray-500">
                                        {reply.message_type?.toUpperCase() ||
                                          "TEXT"}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {formatReplyTimestamp(reply.timestamp)}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-900">
                                      {reply.message_text ||
                                        "No message content"}
                                    </div>
                                    {reply.button_payload && (
                                      <div className="mt-2 text-xs text-blue-600">
                                        Button: {reply.button_payload}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                className="px-3 py-1 border rounded"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                className="px-3 py-1 border rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Audience Modal */}
      {showAddAudience && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow p-6 max-h-[85vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">
              Add Audience to Campaign
            </h3>
            {submitError && (
              <div className="mb-3 p-2 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
                {submitError}
              </div>
            )}
            {/* <div className="space-y-4 overflow-y-auto pr-2 -mr-2 flex-1">
             
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone (MSISDN)
                </label>
                <input
                  value={addMsisdn}
                  onChange={(e) => setAddMsisdn(e.target.value)}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="e.g. 919876543210"
                />
              </div>
             
              {tplPlaceholders.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Template Parameters
                  </label>
                  <div className="mt-2 space-y-2">
                    {tplPlaceholders.map((ph, idx) => {
                      const key = `{{${ph}}}`;
                      const exampleVal = tplExamples[idx] ?? "";
                      const label = tplLabels[ph] || `{{${ph}}}`;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                            {label}
                          </span>
                          <input
                            type="text"
                            value={tplParams[key] ?? ""}
                            onChange={(e) =>
                              setTplParams({
                                ...tplParams,
                                [key]: e.target.value,
                              })
                            }
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-whatsapp-500 focus:ring-whatsapp-500"
                            placeholder={
                              exampleVal ? `e.g., ${exampleVal}` : "Enter value"
                            }
                          />
                          {exampleVal && (
                            <span className="text-xs text-gray-500">
                              Example: {exampleVal}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div> */}
            <div className="space-y-6 overflow-y-auto pr-2 -mr-2 flex-1">
              {audiences.map((aud, aIndex) => (
                <div key={aIndex} className="border rounded p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm">
                      Audience {aIndex + 1}
                    </h4>
                    {audiences.length > 1 && (
                      <button
                        onClick={() => removeAudience(aIndex)}
                        className="text-red-500 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* MSISDN */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone (MSISDN)
                    </label>
                    <input
                      value={aud.msisdn}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAudiences((prev) => {
                          const copy = [...prev];
                          copy[aIndex].msisdn = val;
                          return copy;
                        });
                      }}
                      className="mt-1 w-full border rounded px-3 py-2"
                      placeholder="e.g. 919876543210"
                    />
                  </div>

                  {/* Template Parameters */}
                  {tplPlaceholders.length > 0 && (
                    <div className="space-y-2">
                      {tplPlaceholders.map((ph, idx) => {
                        const key = `{{${ph}}}`;
                        const label = tplLabels[ph] || key;
                        const exampleVal = tplExamples[idx] ?? "";

                        return (
                          <input
                            key={key}
                            className="w-full border rounded px-3 py-2"
                            placeholder={exampleVal || label}
                            value={aud.tplParams[key] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAudiences((prev) => {
                                const copy = [...prev];
                                copy[aIndex].tplParams[key] = val;
                                return copy;
                              });
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t mt-4">
              <button
                onClick={() => {
                  if (!submitting) {
                    setShowAddAudience(false);
                    setSubmitError(null);
                  }
                }}
                className="px-4 py-2 bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={addMoreAudience}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded"
              >
                + Add More
              </button>

              <button
                onClick={handleSubmitAddAudience}
                disabled={submitting}
                className={`px-4 py-2 rounded text-white ${
                  submitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-whatsapp-500 hover:bg-whatsapp-600"
                }`}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Audience Modal */}
      {showBulkAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bulk Add Audience</h3>
              <button
                onClick={() => {
                  if (!bulkUploading) {
                    setShowBulkAdd(false);
                    setBulkRows([]);
                    setBulkErrors([]);
                    setBulkConfirmed(false);
                  }
                }}
                className="px-3 py-1 bg-gray-100 rounded"
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                onClick={downloadDemoExcel}
                className="px-3 py-2 border rounded hover:bg-gray-50"
              >
                Download Demo Excel
              </button>
              <label className="inline-flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Upload filled Excel
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBulkFileUpload(f);
                  }}
                  className="block text-sm"
                />
              </label>
              {bulkUploading && (
                <span className="text-sm text-gray-500">Parsing file...</span>
              )}
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto border rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      #
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      msisdn
                    </th>
                    {templateAttributeKeys.map((k) => (
                      <th
                        key={k}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bulkRows.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-6 text-center text-gray-500"
                        colSpan={3 + templateAttributeKeys.length}
                      >
                        No data uploaded yet
                      </td>
                    </tr>
                  ) : (
                    bulkRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2">
                          {bulkConfirmed ? (
                            <span className="text-sm text-gray-900">
                              {row.name}
                            </span>
                          ) : (
                            <input
                              value={row.name}
                              onChange={(e) =>
                                onChangeBulkCell(
                                  idx,
                                  "name",
                                  e.target.value,
                                  false,
                                )
                              }
                              className={`w-44 border rounded px-2 py-1 text-sm ${
                                bulkErrors[idx]?.name
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="Full name"
                            />
                          )}
                          {bulkErrors[idx]?.name && (
                            <div className="text-xs text-red-600 mt-1">
                              {bulkErrors[idx]?.name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {bulkConfirmed ? (
                            <span className="text-sm text-gray-900">
                              {row.msisdn}
                            </span>
                          ) : (
                            <input
                              value={row.msisdn}
                              onChange={(e) =>
                                onChangeBulkCell(
                                  idx,
                                  "msisdn",
                                  e.target.value,
                                  false,
                                )
                              }
                              className={`w-56 border rounded px-2 py-1 text-sm ${
                                bulkErrors[idx]?.msisdn
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="+919876543210"
                            />
                          )}
                          {bulkErrors[idx]?.msisdn && (
                            <div className="text-xs text-red-600 mt-1">
                              {bulkErrors[idx]?.msisdn}
                            </div>
                          )}
                        </td>
                        {templateAttributeKeys.map((k) => (
                          <td key={k} className="px-4 py-2">
                            {bulkConfirmed ? (
                              <span className="text-sm text-gray-900">
                                {row.attributes?.[k] || ""}
                              </span>
                            ) : (
                              <input
                                value={row.attributes?.[k] || ""}
                                onChange={(e) =>
                                  onChangeBulkCell(idx, k, e.target.value, true)
                                }
                                className={`w-56 border rounded px-2 py-1 text-sm ${
                                  bulkErrors[idx]?.[k]
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                                placeholder={k}
                              />
                            )}
                            {bulkErrors[idx]?.[k] && (
                              <div className="text-xs text-red-600 mt-1">
                                {bulkErrors[idx]?.[k]}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              {!bulkConfirmed && (
                <button
                  onClick={confirmBulk}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Confirm
                </button>
              )}
              <button
                onClick={submitBulk}
                disabled={!bulkConfirmed || bulkRows.length === 0}
                className={`px-4 py-2 rounded text-white ${
                  !bulkConfirmed || bulkRows.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-whatsapp-500 hover:bg-whatsapp-600"
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetails;
