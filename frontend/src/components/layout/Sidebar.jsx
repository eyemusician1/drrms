import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate(); //declare function to nav

  const links = [
    { name: 'Overview', icon: 'grid_view', path: '/manage/dashboard' },
    { name: 'Disasters', icon: 'warning', path: '/manage/disasters' },
    { name: 'Teams', icon: 'groups', path: '/manage/teams' },
    { name: 'Relief Ops', icon: 'package_2', path: '/manage/relief' },
    { name: 'Evacuation', icon: 'door_front', path: '/manage/evacuation' },
  ];

  const handleLogout = async () => {
    const token = localStorage.getItem('access_token');

    try {
      await fetch('http://localhost:8000/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    }


    //clear all data regarding the logged in user
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    navigate('/');
  }


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
        <button className="logout-btn" title={isCollapsed ? "Logout" : ""} onClick={handleLogout}>
          <span className="material-symbols-rounded">logout</span>
          {!isCollapsed && <span className="link-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;