import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Database, MessageSquare } from 'lucide-react';
import { useSidebarStore } from '../store/useSidebarStore';

const Sidebar = () => {
  const isOpen = useSidebarStore((state) => state.isOpen);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Inventory', icon: Package, path: '/inventory' },
    { name: 'Barrels', icon: Database, path: '/barrels' },
    { name: 'Announcements', icon: MessageSquare, path: '/announcements' },
  ];

  return (
    <div className={`flex-shrink-0 transition-all duration-300 ${isOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-white border-r border-gray-200">
        <div className="flex-grow flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon
                  className="mr-3 h-6 w-6 flex-shrink-0 text-gray-500"
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;