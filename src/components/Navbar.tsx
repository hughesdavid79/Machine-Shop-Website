import React from 'react';
import { Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebarStore } from '../store/useSidebarStore';
import { useAuthStore } from '../store/useAuthStore';

const Navbar = () => {
  const toggle = useSidebarStore((state) => state.toggle);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-full mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <button 
              className="p-2 rounded-md text-gray-400 hover:text-gray-500"
              onClick={toggle}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-['Orbitron'] font-bold">
              Machine Shop at <span className="text-orange-500">RPO</span>
            </h1>
          </div>

          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;