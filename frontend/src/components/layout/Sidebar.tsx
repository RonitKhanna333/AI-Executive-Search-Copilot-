import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, Brain, MessageSquare,
  BarChart3, LogOut, Sparkles, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Candidates", href: "/candidates", icon: Users },
  { label: "Job Analyzer", href: "/jobs", icon: Briefcase },
  { label: "Company Brain", href: "/company-brain", icon: Brain },
  { label: "Copilot Chat", href: "/copilot", icon: MessageSquare },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-white border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold leading-none">AI Search</div>
          <div className="text-xs text-slate-400 mt-0.5">Copilot</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-xs font-bold flex-shrink-0">
            {user?.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.full_name}</div>
            <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1 text-slate-400 hover:text-white hover:bg-slate-800 justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
