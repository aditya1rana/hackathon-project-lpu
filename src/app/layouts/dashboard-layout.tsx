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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Brain,
  ShoppingCart,
  FileText,
  Users,
  FileBarChart,
  Settings,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  Truck,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { api } from "../services/api";
import { toast } from "sonner";
import Chatbot from "../components/chatbot";

export default function DashboardLayout() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { inventory, notifications, setNotifications, markNotificationRead } = useAppStore();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const unreadCount = notifications.filter(n => !n.read).length;

  // Generate real notifications from inventory state
  useEffect(() => {
    if (inventory.length === 0) return;
    
    const alerts: any[] = [];
    let idCounter = 1;
    
    inventory.forEach((item) => {
      if (item.status === 'Out of Stock') {
        alerts.push({
          id: `inv-alert-${idCounter++}`,
          title: '🚨 Out of Stock',
          description: `${item.name} is completely out of stock. Reorder immediately.`,
          time: 'Now',
          read: false,
          type: 'alert' as const,
        });
      } else if (item.status === 'Low Stock') {
        alerts.push({
          id: `inv-alert-${idCounter++}`,
          title: '⚠️ Low Stock Warning',
          description: `${item.name} is running low (${item.quantity} remaining).`,
          time: 'Now',
          read: false,
          type: 'warning' as const,
        });
      }
    });

    // Add a success notification if everything is well stocked
    const inStockCount = inventory.filter(i => i.status === 'In Stock').length;
    if (inStockCount > 0) {
      alerts.push({
        id: `inv-alert-${idCounter++}`,
        title: '✅ Inventory Summary',
        description: `${inStockCount} of ${inventory.length} items are fully stocked.`,
        time: 'Now',
        read: false,
        type: 'success' as const,
      });
    }

    if (alerts.length > 0) {
      setNotifications(alerts);
    }
  }, [inventory, setNotifications]);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/inventory?q=${encodeURIComponent(globalSearch.trim())}`);
      setGlobalSearch("");
    }
  };

  const handleNotificationClick = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      markNotificationRead(id);
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/inventory", label: "Inventory", icon: Package },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/predictions", label: "Predictions (AI)", icon: Brain },
    { path: "/procurement", label: "Procurement", icon: ShoppingCart },
    { path: "/requests", label: "Requests", icon: FileText },
    { path: "/suppliers", label: "Suppliers", icon: Truck },
    { path: "/users", label: "Users", icon: Users },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SmartInventory</h1>
              <p className="text-xs text-muted-foreground">v2.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-[#4F46E5] text-white"
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

        <div className="p-4 border-t border-border">
          <div className="bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] rounded-lg p-4 text-white">
            <h3 className="font-semibold mb-1">Upgrade to Pro</h3>
            <p className="text-xs opacity-90 mb-3">
              Get advanced AI predictions & analytics
            </p>
            <Button size="sm" variant="secondary" className="w-full" onClick={() => toast.success("Redirecting to upgrade page...")}>
              Upgrade Now
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex-1 max-w-md">
            <form onSubmit={handleGlobalSearch} className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${isSearchFocused ? "text-primary" : "text-muted-foreground"}`} />
              <Input
                placeholder="Search inventory, items, users..."
                className="pl-10 bg-background border-border"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </form>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-4">
            {/* Dark Mode Toggle */}
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

            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-[#EF4444]">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h4 className="font-semibold">Notifications</h4>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="bg-[#4F46E5]/10 text-[#4F46E5] hover:bg-[#4F46E5]/20 cursor-pointer" onClick={() => {
                        notifications.forEach(n => !n.read && handleNotificationClick(n.id));
                        toast.success("All caught up!");
                    }}>
                      Mark all as read
                    </Badge>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No notifications yet.
                    </div>
                  ) : notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer flex gap-3 ${!notification.read ? 'bg-primary/5' : ''}`}
                      onClick={() => !notification.read && handleNotificationClick(notification.id)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                         notification.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                         notification.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                         notification.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                         'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                         <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm font-medium truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>{notification.title}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{notification.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{notification.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pl-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-[#4F46E5] text-white">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium">Admin User</p>
                    <p className="text-xs text-muted-foreground">Administrator</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Admin User</p>
                    <p className="text-xs leading-none text-muted-foreground">admin@smartinventory.local</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50 dark:focus:text-red-400" onClick={() => {
                  toast.success("Logged out successfully");
                  navigate("/login");
                }}>
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

      {/* AI Chatbot */}
      <Chatbot />
    </div>
  );
}
