import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Building2,
  Users,
  MessageSquare,
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
} from "lucide-react";
import api from "../services/api";

interface DashboardOverview {
  total_organizations?: number;
  total_users?: number;
  total_campaigns?: number;
  total_templates?: number;
  running_campaigns?: number;
  pending_approvals?: number;
  organization_users?: number;
  total_audience?: number;
  campaign_statistics?: any;
}

interface DashboardStats {
  active_organizations?: string;
  inactive_organizations?: string;
  draft_campaigns?: string;
  pending_campaigns?: string;
  approved_campaigns?: string;
  running_campaigns?: string;
  completed_campaigns?: string;
  pending_templates?: string;
  approved_templates?: string;
  pending_admin_approval_templates?: string;
  admin_approved_templates?: string;
  admin_rejected_templates?: string;
  messages_sent?: string;
  messages_delivered?: string;
  messages_failed?: string;
}

interface Activity {
  type: string;
  id: number;
  name: string;
  status: string;
  admin_status?: string;
  created_at: string;
  organization_name?: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSystemAdmin =
    user?.role === "super_admin" || user?.role === "system_admin";

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load overview data
      const overviewRes = await api.getDashboardOverview();
      if (overviewRes.success) {
        setOverview(overviewRes.data.overview);
      }

      // Load statistics
      const statsRes = await api.getDashboardStats();
      if (statsRes.success) {
        setStats(statsRes.data.statistics);
      }

      // Load activities
      const activitiesRes = await api.getDashboardActivities(10);
      if (activitiesRes.success) {
        setActivities(activitiesRes.data.activities || []);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const getOverviewStats = () => {
    if (!overview) return [];

    if (isSystemAdmin) {
      return [
        {
          name: "Organizations",
          value: overview.total_organizations || 0,
          icon: Building2,
          color: "bg-blue-500",
        },
        {
          name: "Total Users",
          value: overview.total_users || 0,
          icon: Users,
          color: "bg-green-500",
        },
        {
          name: "Total Campaigns",
          value: overview.total_campaigns || 0,
          icon: MessageSquare,
          color: "bg-purple-500",
        },
        {
          name: "Total Templates",
          value: overview.total_templates || 0,
          icon: FileText,
          color: "bg-orange-500",
        },
        {
          name: "Running Campaigns",
          value: overview.running_campaigns || 0,
          icon: Play,
          color: "bg-whatsapp-500",
        },
        {
          name: "Pending Approvals",
          value: overview.pending_approvals || 0,
          icon: Clock,
          color: "bg-yellow-500",
        },
      ];
    } else {
      return [
        {
          name: "Organization Users",
          value: overview.organization_users || 0,
          icon: Users,
          color: "bg-blue-500",
        },
        {
          name: "Total Campaigns",
          value: overview.total_campaigns || 0,
          icon: MessageSquare,
          color: "bg-purple-500",
        },
        {
          name: "Total Templates",
          value: overview.total_templates || 0,
          icon: FileText,
          color: "bg-orange-500",
        },
        {
          name: "Running Campaigns",
          value: overview.running_campaigns || 0,
          icon: Play,
          color: "bg-whatsapp-500",
        },
        {
          name: "Total Audience",
          value: overview.total_audience || 0,
          icon: Users,
          color: "bg-green-500",
        },
      ];
    }
  };

  const getDetailedStats = () => {
    if (!stats) return [];

    const baseStats = [
      {
        label: "Draft Campaigns",
        value: stats.draft_campaigns || "0",
        color: "text-gray-600",
      },
      {
        label: "Pending Campaigns",
        value: stats.pending_campaigns || "0",
        color: "text-yellow-600",
      },
      {
        label: "Approved Campaigns",
        value: stats.approved_campaigns || "0",
        color: "text-green-600",
      },
      {
        label: "Running Campaigns",
        value: stats.running_campaigns || "0",
        color: "text-blue-600",
      },
      {
        label: "Completed Campaigns",
        value: stats.completed_campaigns || "0",
        color: "text-purple-600",
      },
    ];

    if (isSystemAdmin) {
      return [
        {
          label: "Active Organizations",
          value: stats.active_organizations || "0",
          color: "text-green-600",
        },
        {
          label: "Inactive Organizations",
          value: stats.inactive_organizations || "0",
          color: "text-red-600",
        },
        ...baseStats,
        {
          label: "Pending Templates",
          value: stats.pending_templates || "0",
          color: "text-yellow-600",
        },
        {
          label: "Approved Templates",
          value: stats.approved_templates || "0",
          color: "text-green-600",
        },
        {
          label: "Admin Approved Templates",
          value: stats.admin_approved_templates || "0",
          color: "text-blue-600",
        },
        {
          label: "Admin Rejected Templates",
          value: stats.admin_rejected_templates || "0",
          color: "text-red-600",
        },
      ];
    } else {
      return [
        ...baseStats,
        {
          label: "Approved Templates",
          value: stats.approved_templates || "0",
          color: "text-green-600",
        },
        {
          label: "Admin Approved Templates",
          value: stats.admin_approved_templates || "0",
          color: "text-blue-600",
        },
        {
          label: "Messages Sent",
          value: stats.messages_sent || "0",
          color: "text-orange-600",
        },
        {
          label: "Messages Delivered",
          value: stats.messages_delivered || "0",
          color: "text-green-600",
        },
        {
          label: "Messages Failed",
          value: stats.messages_failed || "0",
          color: "text-red-600",
        },
      ];
    }
  };

  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "campaign":
        return MessageSquare;
      case "template":
        return FileText;
      case "organization":
        return Building2;
      case "user":
        return Users;
      default:
        return MessageSquare;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.first_name}!
            </h1>
            <p className="mt-2 text-gray-600">
              Here's what's happening with your WhatsApp campaigns today.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Overview Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
            {getOverviewStats().map((stat) => (
              <div
                key={stat.name}
                className="bg-white overflow-hidden shadow rounded-lg"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`${stat.color} p-3 rounded-md`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.name}
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stat.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Statistics */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Detailed Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {getDetailedStats().map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  {activities.length === 0 ? (
                    <li className="text-gray-500 text-center py-4">
                      No recent activities
                    </li>
                  ) : (
                    activities.map((activity, activityIdx) => {
                      const ActivityIcon = getActivityIcon(activity.type);
                      return (
                        <li key={`${activity.type}-${activity.id}`}>
                          <div className="relative pb-8">
                            {activityIdx !== activities.length - 1 && (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-whatsapp-500 flex items-center justify-center ring-8 ring-white">
                                  <ActivityIcon className="h-4 w-4 text-white" />
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-900">
                                    {activity.type.charAt(0).toUpperCase() +
                                      activity.type.slice(1)}{" "}
                                    "{activity.name}"
                                    <span className="text-gray-500">
                                      {" "}
                                      - {activity.status}
                                    </span>
                                    {activity.organization_name && (
                                      <span className="text-gray-500">
                                        {" "}
                                        ({activity.organization_name})
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  {formatActivityTime(activity.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      Manage Organizations
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Create and manage your organizations
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <a
                    href="/organizations"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-whatsapp-700 bg-whatsapp-100 hover:bg-whatsapp-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500"
                  >
                    View Organizations
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MessageSquare className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      Create Campaign
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start a new WhatsApp campaign
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <a
                    href="/campaigns"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-whatsapp-700 bg-whatsapp-100 hover:bg-whatsapp-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500"
                  >
                    New Campaign
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      View Templates
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage your message templates
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <a
                    href="/templates"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-whatsapp-700 bg-whatsapp-100 hover:bg-whatsapp-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500"
                  >
                    View Templates
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
