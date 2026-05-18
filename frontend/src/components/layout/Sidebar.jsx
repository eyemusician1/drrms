import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
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
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          <span className="material-symbols-rounded">logout</span>
          {!isCollapsed && <span className="link-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;