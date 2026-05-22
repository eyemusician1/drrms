import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../ui/Modal';
import './Sidebar.css';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const links = [
    { name: 'Overview', icon: 'grid_view', path: '/manage/dashboard' },
    { name: 'Disasters', icon: 'warning', path: '/manage/disasters' },
    { name: 'Teams', icon: 'groups', path: '/manage/teams' },
    { name: 'Relief Ops', icon: 'package_2', path: '/manage/relief' },
    { name: 'Evacuation', icon: 'door_front', path: '/manage/evacuation' },
  ];

  return (
    <aside className={`labs-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <button
          className="menu-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label="Toggle Sidebar"
        >
          <span className="material-symbols-rounded">menu</span>
        </button>
        {!isCollapsed && <span className="brand-text">DRRMS</span>}
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? link.name : ""} // Shows tooltip when collapsed
          >
            <span className="material-symbols-rounded">{link.icon}</span>
            {!isCollapsed && <span className="link-label">{link.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="logout-btn"
          title={isCollapsed ? "Logout" : ""}
          onClick={() => setIsLogoutModalOpen(true)}
        >
          <span className="material-symbols-rounded">logout</span>
          {!isCollapsed && <span className="link-label">Logout</span>}
        </button>
      </div>

      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => {
          if (!isLoggingOut) setIsLogoutModalOpen(false);
        }}
        title="Log out of DRRMS?"
        actionText={isLoggingOut ? 'Logging out...' : 'Logout'}
        onAction={async () => {
          setIsLoggingOut(true);
          try {
            await logout();
            setIsLogoutModalOpen(false);
            navigate('/');
          } finally {
            setIsLoggingOut(false);
          }
        }}
      >
        <div className="logout-modal-copy">
          <div className="logout-modal-alert">
            <span className="material-symbols-rounded">info</span>
            <span>You will be returned to the public landing page.</span>
          </div>
          <p>
            This will end your current session on this device. You can sign in again anytime.
          </p>
        </div>
      </Modal>
    </aside>
  );
};

export default Sidebar;