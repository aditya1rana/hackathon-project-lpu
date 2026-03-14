import { Outlet, NavLink, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Package,
  Search,
  Moon,
  Sun,
  LogOut,
  User,
  LibraryBig,
  ClipboardList
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../store";

export default function UserLayout() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { currentUser, setCurrentUser } = useAppStore();

  const handleLogout = () => {
    setCurrentUser(null);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const navItems = [
    { path: "/user", label: "Catalog", icon: LibraryBig },
    { path: "/user/requests", label: "My Requests", icon: ClipboardList },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/user")}>
            <div className="w-10 h-10 bg-[#06B6D4] rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SmartInventory</h1>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/user"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-[#06B6D4] text-white"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${isSearchFocused ? "text-primary" : "text-muted-foreground"}`} />
              <Input
                placeholder="Search catalog items..."
                className="pl-10 bg-background border-border"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pl-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback className="bg-[#06B6D4] text-white">
                      {currentUser?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium">{currentUser?.name || "Student"}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">{currentUser?.email || "student@college.edu"}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser?.name || "Student"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{currentUser?.email || "Student Account"}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50 dark:focus:text-red-400" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
