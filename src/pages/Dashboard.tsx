import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, 
  Users, 
  MessageSquare,
  BarChart3 
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Organizations',
      value: '12',
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Users',
      value: '48',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      name: 'Messages Sent',
      value: '1,234',
      icon: MessageSquare,
      color: 'bg-whatsapp-500',
    },
    {
      name: 'Campaign Success Rate',
      value: '87%',
      icon: BarChart3,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.first_name}!
            </h1>
            <p className="mt-2 text-gray-600">
              Here's what's happening with your WhatsApp campaigns today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (
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

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  {[
                    {
                      id: 1,
                      content: 'New organization "Tech Corp" was created',
                      time: '2 hours ago',
                      type: 'organization',
                    },
                    {
                      id: 2,
                      content: 'Campaign "Summer Sale" sent to 150 contacts',
                      time: '4 hours ago',
                      type: 'campaign',
                    },
                    {
                      id: 3,
                      content: 'User "john@example.com" joined organization',
                      time: '6 hours ago',
                      type: 'user',
                    },
                    {
                      id: 4,
                      content: 'WhatsApp template "Welcome Message" approved',
                      time: '1 day ago',
                      type: 'template',
                    },
                  ].map((item, itemIdx, items) => (
                    <li key={item.id}>
                      <div className="relative pb-8">
                        {itemIdx !== items.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-whatsapp-500 flex items-center justify-center ring-8 ring-white">
                              <MessageSquare className="h-4 w-4 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">{item.content}</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {item.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
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
                  <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-whatsapp-700 bg-whatsapp-100 hover:bg-whatsapp-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500">
                    New Campaign
                  </button>
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
                      View Analytics
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Check your campaign performance
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-whatsapp-700 bg-whatsapp-100 hover:bg-whatsapp-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-whatsapp-500">
                    View Reports
                  </button>
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
