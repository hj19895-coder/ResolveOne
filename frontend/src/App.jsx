import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import CreateTicketPage from "./pages/CreateTicketPage";
import UsersPage from "./pages/UsersPage";
import MasterDataPage from "./pages/MasterDataPage";
import AssignTicketPage from "./pages/AssignTicketPage";
import EditTicketPage from "./pages/EditTicketPage";
import TicketDetailsPage from "./pages/TicketDetailsPage";
import Layout from "./components/layout/Layout";
import RolesPage from "./pages/RolesPage";
import Unauthorized from "./pages/Unauthorized";
import ReportsPage from "./pages/Reportspage";
import Landing from "./pages/Landing";
import { PageHeaderProvider } from "./context/PageHeaderContext";
import TemplatesPage from "./pages/TemplatesPage";




export default function App() {
  return (
    <AuthProvider>
      <PageHeaderProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />

            <Route path="/tickets" element={
              <ProtectedRoute><Tickets /></ProtectedRoute>
            } />

            <Route path="/tickets/new" element={
              <ProtectedRoute>
                <Layout><CreateTicketPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute page="reports">
                <ReportsPage />
              </ProtectedRoute>
            } />

            <Route path="/super-admin/users" element={
              <ProtectedRoute page="users"><UsersPage /></ProtectedRoute>
            } />

            <Route path="/super-admin/master-data" element={
              <ProtectedRoute page="master-data"><MasterDataPage /></ProtectedRoute>
            } />

            <Route path="/templates" element={<ProtectedRoute page="templates"><TemplatesPage /></ProtectedRoute>} />
            

            <Route path="/super-admin/roles" element={
              <ProtectedRoute adminOnly><RolesPage /></ProtectedRoute>
            } />

            <Route path="/tickets/:ticketId/assign" element={
              <ProtectedRoute adminOnly><AssignTicketPage /></ProtectedRoute>
            } />

            <Route path="/tickets/:ticketId/edit" element={
              <ProtectedRoute adminOnly><EditTicketPage /></ProtectedRoute>
            } />

            <Route path="/tickets/:id" element={
              <ProtectedRoute><TicketDetailsPage /></ProtectedRoute>
            } />

            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PageHeaderProvider>
    </AuthProvider>
  );
}