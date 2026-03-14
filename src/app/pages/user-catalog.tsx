import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { api } from "../services/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Package, Search, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

export default function UserCatalog() {
  const { inventory, setInventory, currentUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Request Modal State
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [requestQty, setRequestQty] = useState("1");
  const [requestReason, setRequestReason] = useState("");

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        if (inventory.length === 0) {
          const data = await api.getInventory();
          setInventory(data);
        }
      } catch (error) {
        toast.error("Failed to load catalog");
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, [inventory.length, setInventory]);

  const categories = ["all", ...new Set(inventory.map((i) => i.category))];

  const filteredItems = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleRequestSubmit = async () => {
    if (!selectedItem) return;
    
    const qty = parseInt(requestQty, 10);
    if (isNaN(qty) || qty < 1 || qty > selectedItem.quantity) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    try {
      // Create request payload 
      const newRequest = await api.addRequest({
        itemName: selectedItem.name,
        requester: currentUser?.name || "Student",
        type: "Borrow",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: "Pending",
        quantity: qty,
        reason: requestReason
      });
      
      useAppStore.getState().addRequest(newRequest as any); // Update the global store
      toast.success(`Successfully requested ${qty}x ${selectedItem.name}`);
      setIsRequestOpen(false);
      setSelectedItem(null);
      setRequestQty("1");
      setRequestReason("");
    } catch (e) {
      toast.error("Failed to submit request.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Low Stock":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "Out of Stock":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "Maintenance":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Equipment Catalog</h1>
          <p className="text-muted-foreground">Browse lab inventory and request items to borrow.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search equipment by name or SKU..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground animate-pulse">Loading catalog...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-accent/30 rounded-lg">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No equipment found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden flex flex-col hover:border-[#06B6D4] transition-colors cursor-pointer group">
               <div className="h-32 bg-accent/50 flex items-center justify-center p-4 group-hover:bg-accent transition-colors">
                  <Package className="w-16 h-16 text-muted-foreground opacity-50" />
               </div>
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="mb-2">
                  <Badge variant="secondary" className="mb-2">{item.category}</Badge>
                  <h3 className="font-semibold text-lg line-clamp-1" title={item.name}>{item.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">SKU: {item.sku || "N/A"}</p>
                </div>
                
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Availability</span>
                    <Badge variant="outline" className={`mt-1 border-0 ${getStatusBadge(item.status)}`}>
                        {item.quantity} {item.status}
                    </Badge>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-[#06B6D4] hover:bg-[#0891b2] text-white"
                    disabled={item.status === 'Out of Stock' || item.status === 'Maintenance'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                      setIsRequestOpen(true);
                      setRequestQty("1"); // reset
                    }}
                  >
                    Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request Modal */}
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedItem && (
               <div className="p-4 bg-accent/50 rounded-lg mb-4">
                 <h4 className="font-semibold">{selectedItem.name}</h4>
                 <p className="text-sm text-muted-foreground mt-1">Available: {selectedItem.quantity}</p>
               </div>
            )}
            <div className="space-y-2">
              <Label>Quantity Needed</Label>
              <Input 
                type="number" 
                min="1" 
                max={selectedItem?.quantity || 1} 
                value={requestQty}
                onChange={(e) => setRequestQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Borrowing (Optional)</Label>
              <Input 
                placeholder="e.g. For ECE 301 Lab Project..." 
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsRequestOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#06B6D4] hover:bg-[#0891b2] text-white" onClick={handleRequestSubmit}>
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
