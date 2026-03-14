import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  TrendingDown,
  AlertTriangle,
  Edit,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api } from "../services/api";
import { toast } from "sonner";
import { API_BASE } from "../config/api-config";
const stockData = [
  { date: "Jan", stock: 50 },
  { date: "Feb", stock: 48 },
  { date: "Mar", stock: 45 },
  { date: "Apr", stock: 47 },
  { date: "May", stock: 45 },
  { date: "Jun", stock: 45 },
];

const usageHistory = [
  {
    id: 1,
    action: "Issued 5 units",
    user: "Prof. John Smith",
    department: "Electronics Lab",
    date: "Mar 10, 2026",
    time: "10:30 AM",
  },
  {
    id: 2,
    action: "Returned 2 units",
    user: "Alice Johnson",
    department: "Computer Science Lab",
    date: "Mar 8, 2026",
    time: "2:15 PM",
  },
  {
    id: 3,
    action: "Issued 3 units",
    user: "Prof. Sarah Williams",
    department: "Robotics Lab",
    date: "Mar 5, 2026",
    time: "11:00 AM",
  },
  {
    id: 4,
    action: "Stock added: 20 units",
    user: "Admin",
    department: "Procurement",
    date: "Mar 1, 2026",
    time: "9:00 AM",
  },
];

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [usageQty, setUsageQty] = useState(1);
  const [usageType, setUsageType] = useState<"ISSUE" | "RETURN" | "RESTOCK">("ISSUE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/inventory/${id}`);
      const data = await res.json();
      setItem(data.data);
    } catch (e) {
      toast.error("Failed to load item specifics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleRecordUsage = async () => {
    if (!id) return;
    try {
      setIsSubmitting(true);
      let multiplier = usageType === 'ISSUE' ? -1 : 1;
      await api.adjustStock(id, usageQty * multiplier, usageType);
      toast.success("Usage recorded successfully");
      setIsUsageDialogOpen(false);
      fetchDetails(); // Reload data
    } catch (e) {
      toast.error("Failed to record usage");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !item) return <div className="p-8">Loading details...</div>;

  const usageHistory = item.usageLogs?.map((log: any) => ({
    id: log.id,
    action: `${log.action} ${log.quantity} units`,
    user: log.performedBy || "System User",
    department: 'General',
    date: new Date(log.createdAt).toLocaleDateString(),
    time: new Date(log.createdAt).toLocaleTimeString(),
  })) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/inventory")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">{item.name}</h1>
            <p className="text-muted-foreground">
              Item ID: #{item.id?.substring(0,8)} • SKU: {item.barcode || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsUsageDialogOpen(true)} className="border-[#4F46E5] text-[#4F46E5]">
            <TrendingDown className="w-4 h-4 mr-2" />
            Record Usage
          </Button>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" className="text-[#EF4444]">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Item Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#4F46E5]/10 text-[#4F46E5] p-3 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">45</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#06B6D4]/10 text-[#06B6D4] p-3 rounded-lg">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="text-lg font-semibold">Lab 1, Shelf A</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#10B981]/10 text-[#10B981] p-3 rounded-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-lg font-semibold">2 hours ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Badge className="bg-[#10B981]/10 text-[#10B981] text-base px-4 py-2">
              In Stock
            </Badge>
            <p className="text-sm text-muted-foreground mt-3">Status</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
               <p className="text-sm text-muted-foreground mb-1">Category</p>
                <p className="font-medium">{item.category?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Supplier</p>
                <p className="font-medium">{item.supplier?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Unit Price
                </p>
                <p className="font-medium">${item.unitPrice || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Value
                </p>
                <p className="font-medium">${(item.quantity * (item.unitPrice || 0)).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Minimum Stock Level
                </p>
                <p className="font-medium">{item.minStock} units</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Status
                </p>
                <p className="font-medium">{item.quantity <= 0 ? 'Out of Stock' : (item.quantity <= item.minStock ? 'Low Stock' : 'In Stock')}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-muted-foreground">
                {item.description || "No description provided."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prediction Card */}
        <Card className="border-[#F59E0B]">
          <CardHeader className="bg-[#F59E0B]/10">
            <CardTitle className="flex items-center gap-2 text-[#F59E0B]">
              <AlertTriangle className="w-5 h-5" />
              AI Prediction & Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#F59E0B]/10 text-[#F59E0B] p-3 rounded-lg">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock Depletion Prediction</p>
                <p className="text-xl font-bold">Analysis Ready</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Restock Priority: <span className="font-bold text-[#F59E0B]">HIGH</span></p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full mt-1.5"></span>
                  <span>Suggested Vendor: TechSupply Ltd</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full mt-1.5"></span>
                  <span>Estimated Cost: $500</span>
                </li>
              </ul>
            </div>
            <Button className="w-full bg-[#F59E0B] hover:bg-[#D97706]" onClick={() => toast.success("Purchase order initialized")}>
              Create Purchase Order
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stock Level Graph */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Level Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="stock"
                stroke="#4F46E5"
                strokeWidth={3}
                dot={{ fill: "#4F46E5", r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Usage History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {usageHistory.map((entry: any, index: number) => (
              <div key={entry.id} className="relative">
                {index !== usageHistory.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border"></div>
                )}
                <div className="flex gap-4">
                  <div className="relative z-10 w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 bg-accent/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{entry.action}</h4>
                      <span className="text-sm text-muted-foreground">
                        {entry.time}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.user} • {entry.department}
                    </p>
                    <p className="text-sm text-muted-foreground">{entry.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Record Usage Dialog */}
      <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Usage for {item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={usageType} onValueChange={(v: any) => setUsageType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ISSUE">Issue / Consume</SelectItem>
                  <SelectItem value="RETURN">Return to Inventory</SelectItem>
                  <SelectItem value="RESTOCK">Restock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input 
                type="number" 
                min={1} 
                value={usageQty} 
                onChange={(e) => setUsageQty(Number(e.target.value))} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUsageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordUsage} disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
