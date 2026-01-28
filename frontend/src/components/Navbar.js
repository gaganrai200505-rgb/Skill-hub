import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BookOpen, Home, BarChart3 , MessageCircleMore, User, LogIn, LogOut } from "lucide-react";
import { useAuth } from "../state/AuthContext";


const Tab = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `inline-flex items-center gap-2 rounded-full px-4 py-2 transition ${
        isActive ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
      }`
    }
  >
    <Icon size={18} />
    <span className="hidden sm:inline">{label}</span>
  </NavLink>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3 mr-auto">
          <div className="h-9 w-9 rounded-xl bg-brand-600 grid place-items-center text-white shadow-card">
            <BookOpen size={18} />
          </div>
          <div className="font-semibold text-lg">SkillShare</div>
        </div>

        <nav className="flex items-center gap-2">
          <Tab to="/" icon={Home} label="Home" />
          <Tab to="/skills" icon={BookOpen} label="Skills" />
          <Tab to="/dashboard" icon={BarChart3} label="Dashboard" />
          <Tab to="/chat" icon={MessageCircleMore} label="Chat" />
          <Tab to="/profile" icon={User} label="Profile" />
        </nav>

        <div className="ml-3">
          {user ? (
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-full hover:bg-brand-700"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          ) : (
            <NavLink
              to="/login"
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-full hover:bg-brand-700"
            >
              <LogIn size={18} />
              <span className="hidden sm:inline">Login</span>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
