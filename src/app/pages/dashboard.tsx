import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Package, AlertTriangle, TrendingUp, FileText, ArrowUp, ArrowDown } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAppStore } from "../store";
import { useState, useEffect } from "react";
import { api } from "../services/api";

const monthlyUsageData = [
  { month: "Jan", usage: 420 },
  { month: "Feb", usage: 380 },
  { month: "Mar", usage: 560 },
  { month: "Apr", usage: 490 },
  { month: "May", usage: 620 },
  { month: "Jun", usage: 580 },
  { month: "Jul", usage: 710 },
];

const categoryData = [
  { name: "Electronics", value: 450, color: "#4F46E5" },
  { name: "Lab Equipment", value: 380, color: "#06B6D4" },
  { name: "Books", value: 320, color: "#10B981" },
  { name: "Chemicals", value: 280, color: "#F59E0B" },
  { name: "Others", value: 200, color: "#EF4444" },
];

const inventoryTrendData = [
  { date: "Mon", stock: 2400, issued: 240 },
  { date: "Tue", stock: 2380, issued: 198 },
  { date: "Wed", stock: 2350, issued: 280 },
  { date: "Thu", stock: 2320, issued: 308 },
  { date: "Fri", stock: 2280, issued: 350 },
  { date: "Sat", stock: 2260, issued: 180 },
  { date: "Sun", stock: 2250, issued: 120 },
];

const recentActivity = [
  { action: "Added 50 units of Arduino Boards", time: "2 minutes ago", user: "John Doe" },
  { action: "Approved request for Chemistry Lab", time: "15 minutes ago", user: "Jane Smith" },
  { action: "Low stock alert: Resistors", time: "1 hour ago", user: "System" },
  { action: "New supplier added: Tech Solutions", time: "3 hours ago", user: "Admin" },
];

export default function Dashboard() {
  const { inventory, requests } = useAppStore();
  
  const [restockSuggestions, setRestockSuggestions] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingPredictions(true);
        const [preds, stats, trends, cats] = await Promise.all([
          api.getRestockSuggestions().catch(() => []),
          api.getAnalyticsOverview().catch(() => null),
          api.getMonthlyTrends().catch(() => []),
          api.getCategoryUsage().catch(() => [])
        ]);
        
        setRestockSuggestions(preds);
        setOverview(stats);
        
        // Map monthly trends (from backend: month "2023-11", type "ISSUE", total_quantity)
        const mappedTrends = trends
          .filter((t: any) => t.type === 'ISSUE')
          .map((t: any) => ({
            month: new Date(t.month + '-01').toLocaleString('default', { month: 'short' }),
            usage: t.total_quantity
          })).reverse();
        setMonthlyUsage(mappedTrends.length > 0 ? mappedTrends : monthlyUsageData);

        // Map Category array
        const catColors = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#6366F1"];
        const mappedCats = cats.map((c: any, i: number) => ({
          name: c.name || 'Uncategorized',
          value: Number(c.total_transactions) || Number(c.item_count) || 0,
          color: catColors[i % catColors.length]
        })).filter((c: any) => c.value > 0);
        
        setCategories(mappedCats.length > 0 ? mappedCats : categoryData);
        
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setIsLoadingPredictions(false);
      }
    };
    fetchData();
  }, []);

  const totalItems = overview?.totalItems || inventory.length;
  const lowStockCount = overview?.lowStockCount || inventory.filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock').length;
  const pendingRequests = overview?.pendingRequests || requests.filter(req => req.status === 'Pending').length;

  const statsCards = [
    {
      title: "Total Unique Items",
      value: totalItems.toString(),
      change: "+2",
      trend: "up",
      icon: Package,
      color: "text-[#4F46E5]",
      bgColor: "bg-[#4F46E5]/10",
    },
    {
      title: "Low Stock Items",
      value: lowStockCount.toString(),
      change: "Needs attention",
      trend: lowStockCount > 0 ? "down" : "up",
      icon: AlertTriangle,
      color: "text-[#F59E0B]",
      bgColor: "bg-[#F59E0B]/10",
    },
    {
      title: "Items Issued Today",
      value: overview?.totalTransactions?.toString() || "0",
      change: "Tracking live",
      trend: "up",
      icon: TrendingUp,
      color: "text-[#10B981]",
      bgColor: "bg-[#10B981]/10",
    },
    {
      title: "Pending Requests",
      value: pendingRequests.toString(),
      change: pendingRequests > 0 ? "Action needed" : "All clear",
      trend: "up",
      icon: FileText,
      color: "text-[#06B6D4]",
      bgColor: "bg-[#06B6D4]/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your inventory today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    stat.trend === "up" ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Usage Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyUsage} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="usage" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categories.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Trends (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={inventoryTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="stock"
                stroke="#4F46E5"
                strokeWidth={3}
                dot={{ fill: "#4F46E5", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="issued"
                stroke="#06B6D4"
                strokeWidth={3}
                dot={{ fill: "#06B6D4", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-accent/50 rounded-lg hover:bg-accent transition-colors cursor-default"
              >
                <div className="w-2 h-2 bg-[#4F46E5] rounded-full mt-2 shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{activity.action}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Predictive Restocking Alerts */}
      <Card className="border-[#F59E0B]">
        <CardHeader className="bg-[#F59E0B]/10">
          <CardTitle className="flex items-center gap-2 text-[#F59E0B]">
            <AlertTriangle className="w-5 h-5" />
            AI Predictive Restocking
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoadingPredictions ? (
            <div className="text-sm text-muted-foreground">Analyzing inventory...</div>
          ) : restockSuggestions.length === 0 ? (
            <div className="text-sm text-muted-foreground">Inventory is healthy. No immediate restock required.</div>
          ) : (
            <div className="space-y-4">
              {restockSuggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="flex flex-col gap-2 p-4 bg-accent/50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-lg">{suggestion.itemName || suggestion.item}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                      suggestion.priority === 'CRITICAL' || suggestion.urgency === 'Critical' ? 'bg-red-500/10 text-red-500' :
                      suggestion.priority === 'HIGH' || suggestion.urgency === 'High' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      Restock Priority: {suggestion.priority || suggestion.urgency || "HIGH"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-1">
                    <div>
                      <span className="font-medium text-foreground">Suggested Vendor:</span> {suggestion.supplier || "TechSupply Ltd"}
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-foreground">Estimated Cost:</span> ${suggestion.estimatedCost || 500}
                    </div>
                  </div>
                  <p className="text-sm border-t pt-2">{suggestion.reason || "Stock is below safe threshold based on historical usage rate."}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
