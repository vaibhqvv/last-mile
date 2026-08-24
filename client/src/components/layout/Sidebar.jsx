import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineViewGrid, HiOutlinePlusCircle, HiOutlineClipboardList,
  HiOutlineMap, HiOutlineCurrencyRupee, HiOutlineUserGroup,
  HiOutlineTruck, HiOutlineLogout, HiOutlineCog
} from 'react-icons/hi';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // get the first letter of the user's name for the avatar
  const initials = user?.name?.charAt(0)?.toUpperCase() || '?';

  // define navigation based on role
  const navItems = {
    customer: [
      { label: 'Dashboard', icon: <HiOutlineViewGrid />, path: '/dashboard' },
      { label: 'Place Order', icon: <HiOutlinePlusCircle />, path: '/place-order' },
      { label: 'My Orders', icon: <HiOutlineClipboardList />, path: '/orders' },
    ],
    agent: [
      { label: 'Dashboard', icon: <HiOutlineViewGrid />, path: '/dashboard' },
      { label: 'My Deliveries', icon: <HiOutlineTruck />, path: '/orders' },
    ],
    admin: [
      { section: 'Overview', items: [
        { label: 'Dashboard', icon: <HiOutlineViewGrid />, path: '/dashboard' },
      ]},
      { section: 'Orders', items: [
        { label: 'All Orders', icon: <HiOutlineClipboardList />, path: '/orders' },
        { label: 'Create Order', icon: <HiOutlinePlusCircle />, path: '/place-order' },
      ]},
      { section: 'Configuration', items: [
        { label: 'Zones', icon: <HiOutlineMap />, path: '/zones' },
        { label: 'Rate Cards', icon: <HiOutlineCurrencyRupee />, path: '/rate-cards' },
        { label: 'Agents', icon: <HiOutlineUserGroup />, path: '/agents' },
      ]},
    ],
  };

  const renderLink = (item) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
    >
      <span className="link-icon">{item.icon}</span>
      {item.label}
    </NavLink>
  );

  const renderNav = () => {
    const role = user?.role || 'customer';
    const items = navItems[role];

    if (role === 'admin') {
      return items.map((group, idx) => (
        <div key={idx} className="sidebar-section">
          <div className="sidebar-section-title">{group.section}</div>
          {group.items.map(renderLink)}
        </div>
      ));
    }

    return (
      <div className="sidebar-section">
        {items.map(renderLink)}
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>
          <span className="brand-icon" style={{ background: 'transparent', color: 'var(--primary)', fontSize: '1.5rem', marginRight: '-5px' }}>✽</span>
          Wellness Retreat
        </h2>
        <small>Delivery & Services</small>
      </div>

      <nav className="sidebar-nav">
        {renderNav()}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="btn-icon"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.1rem' }}
            title="Log out"
          >
            <HiOutlineLogout />
          </button>
        </div>
      </div>
    </aside>
  );
}
