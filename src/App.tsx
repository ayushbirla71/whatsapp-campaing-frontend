import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Organizations from "./pages/Organizations";
import OrganizationApproval from "./pages/OrganizationApproval";
import Users from "./pages/Users";
import Templates from "./pages/Templates";
import Campaigns from "./pages/Campaigns";
import Audience from "./pages/Audience";
import CampaignDetails from "./pages/CampaignDetails";
import ApprovalCampaign from "./pages/ApprovalCampaign";
import AssetFiles from "./pages/AssetFiles";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
              path="/organizations"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "super_admin",
                    "system_admin",
                    "organization_admin",
                  ]}
                >
                  <Layout>
                    <Organizations />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizations/:id/approval"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "super_admin",
                    "system_admin",
                    "organization_admin",
                  ]}
                >
                  <Layout>
                    <OrganizationApproval />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "super_admin",
                    "system_admin",
                    "organization_admin",
                  ]}
                >
                  <Layout>
                    <Users />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "super_admin",
                    "system_admin",
                    "organization_admin",
                    "user",
                  ]}
                >
                  <Layout>
                    <Templates />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/new"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "super_admin",
                    "system_admin",
                    "organization_admin",
                    "user",
                  ]}
                >
                  <Layout>
                    <Templates />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "super_admin",
                    "system_admin",
                    "organization_admin",
                    "user",
                  ]}
                >
                  <Layout>
                    <Campaigns />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/asset-files"
              element={
                <ProtectedRoute requiredRoles={["super_admin", "system_admin"]}>
                  <Layout>
                    <AssetFiles />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/approval"
              element={
                <ProtectedRoute requiredRoles={["super_admin", "system_admin"]}>
                  <Layout>
                    <ApprovalCampaign />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "super_admin",
                    "system_admin",
                    "organization_admin",
                    "user",
                  ]}
                >
                  <Layout>
                    <CampaignDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/audience"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "super_admin",
                    "system_admin",
                    "organization_admin",
                    "user",
                  ]}
                >
                  <Layout>
                    <Audience />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/unauthorized"
              element={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">
                      Unauthorized
                    </h1>
                    <p className="text-gray-600">
                      You don't have permission to access this page.
                    </p>
                  </div>
                </div>
              }
            />

            {/* Dashboard route */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "super_admin",
                    "system_admin",
                    "organization_admin",
                    "user",
                  ]}
                >
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
