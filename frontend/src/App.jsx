import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Layout & Auth
import Login from './pages/auth/Login';
import Sidebar from './components/layout/Sidebar';

// Management Pages
import Dashboard from './pages/manage/Dashboard';
import ManageDisasters from './pages/manage/ManageDistasters'; // Make sure this filename matches your actual file!
import ManageTeams from './pages/manage/ManageTeams';
import ManageRelief from './pages/manage/ManageRelief';
import ManageEvacuation from './pages/manage/ManageEvacuation';

// Layout wrapper to keep the Sidebar consistent
const AdminLayout = () => (
  <div className="admin-layout">
    <Sidebar />
    <main className="admin-main-content">
      <Outlet />
    </main>
  </div>
);

function App() {
  return (
    <Routes>
      {/* Public Landing / Login */}
      <Route path="/" element={<Login />} />

      {/* Admin Management Routes */}
      <Route path="/manage" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="disasters" element={<ManageDisasters />} />
        <Route path="teams" element={<ManageTeams />} />
        <Route path="relief" element={<ManageRelief />} />
        <Route path="evacuation" element={<ManageEvacuation />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Catch-all: Redirect unknown paths to Login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;