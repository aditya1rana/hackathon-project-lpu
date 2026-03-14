import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAppStore } from "../store";
import { PurchaseOrder } from "../types";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  AlertCircle,
  Loader2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

export default function Procurement() {
  const { purchaseOrders, setPurchaseOrders, addPurchaseOrder } = useAppStore();
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Auto-Purchase Settings
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [autoPurchaseEnabled, setAutoPurchaseEnabled] = useState(true);
  const [spendingLimit, setSpendingLimit] = useState("5000");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch AI suggestions
        const suggestions = await api.getRestockSuggestions();
        setAiSuggestions(suggestions);
        
        // Fetch existing POs if empty
        if (purchaseOrders.length === 0) {
          const pos = await api.getPurchaseOrders();
          setPurchaseOrders(pos);
        }
      } catch (error) {
        toast.error("Failed to load procurement data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [purchaseOrders.length, setPurchaseOrders]);

  const handleCreatePO = async (suggestion: any) => {
    try {
      const newPO = await api.addPurchaseOrder({
        items: `${suggestion.item} x${suggestion.suggestedQuantity}`,
        supplier: suggestion.supplier,
        amount: `$${suggestion.estimatedCost.toFixed(2)}`,
        status: "Processing",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      });
      addPurchaseOrder(newPO as PurchaseOrder);
      setAiSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
      toast.success(`Purchase order created for ${suggestion.item}`);
    } catch (error) {
      toast.error("Failed to create purchase order");
    }
  };

  const handleDismissSuggestion = (id: any) => {
    setAiSuggestions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Suggestion dismissed");
  };

  const getUrgencyBadge = (urgency: string) => {
    const config = {
      Critical: "bg-[#EF4444]/10 text-[#EF4444]",
      High: "bg-[#F59E0B]/10 text-[#F59E0B]",
      Medium: "bg-[#06B6D4]/10 text-[#06B6D4]",
      Low: "bg-[#10B981]/10 text-[#10B981]",
    };
    return config[urgency as keyof typeof config];
  };

  const getStatusBadge = (status: string) => {
    const config = {
      Delivered: "bg-[#10B981]/10 text-[#10B981]",
      "In Transit": "bg-[#06B6D4]/10 text-[#06B6D4]",
      Processing: "bg-[#F59E0B]/10 text-[#F59E0B]",
    };
    return config[status as keyof typeof config];
  };

  const totalEstimatedCost = aiSuggestions.reduce(
    (sum, item) => sum + item.estimatedCost,
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Smart Procurement & AI Recommendations
        </h1>
        <p className="text-muted-foreground">
          AI-powered restocking suggestions and purchase order management.
        </p>
      </div>

      {/* AI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Suggestions</p>
                <p className="text-3xl font-bold">{loading ? "-" : aiSuggestions.length}</p>
              </div>
              <div className="bg-[#4F46E5]/10 text-[#4F46E5] p-3 rounded-lg">
                <Sparkles className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Items</p>
                <p className="text-3xl font-bold">
                  {loading ? "-" : aiSuggestions.filter((s) => s.urgency === "Critical").length}
                </p>
              </div>
              <div className="bg-[#EF4444]/10 text-[#EF4444] p-3 rounded-lg">
                <AlertCircle className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Estimated Budget
                </p>
                <p className="text-3xl font-bold">
                  ${loading ? "..." : totalEstimatedCost.toFixed(0)}
                </p>
              </div>
              <div className="bg-[#10B981]/10 text-[#10B981] p-3 rounded-lg">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active POs</p>
                <p className="text-3xl font-bold">
                  {loading ? "-" : purchaseOrders.length}
                </p>
              </div>
              <div className="bg-[#06B6D4]/10 text-[#06B6D4] p-3 rounded-lg">
                <ShoppingCart className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions */}
      <Card className="border-[#4F46E5]">
        <CardHeader className="bg-[#4F46E5]/5">
          <CardTitle className="flex items-center gap-2 text-[#4F46E5]">
            <Sparkles className="w-6 h-6" />
            AI-Recommended Restocking Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
             <div className="flex justify-center items-center py-12">
               <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" />
             </div>
          ) : aiSuggestions.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Inventory looks good! No AI restocking suggestions at this time.</p>
             </div>
          ) : (
            <div className="space-y-4">
              {aiSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">
                          {suggestion.item}
                        </h3>
                        <Badge className={getUrgencyBadge(suggestion.urgency)}>
                          {suggestion.urgency} Priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.reason}
                      </p>
                    </div>
                    <div className="bg-accent p-3 rounded-lg">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Current Stock
                      </p>
                      <p className="text-lg font-semibold">
                        {suggestion.currentStock}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Suggested Qty
                      </p>
                      <p className="text-lg font-semibold text-[#4F46E5]">
                        {suggestion.suggestedQuantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Estimated Cost
                      </p>
                      <p className="text-lg font-semibold">
                        ${suggestion.estimatedCost.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Supplier
                      </p>
                      <p className="text-sm font-medium">{suggestion.supplier}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="bg-[#4F46E5] hover:bg-[#4338CA]" 
                      onClick={() => handleCreatePO(suggestion)}
                    >
                      Create Purchase Order
                    </Button>
                    <Button variant="outline" onClick={() => toast.info("Viewing details for " + suggestion.item)}>
                      View Details
                    </Button>
                    <Button variant="ghost" onClick={() => handleDismissSuggestion(suggestion.id)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-gradient-to-r from-[#4F46E5]/10 to-[#06B6D4]/10 rounded-lg border border-[#4F46E5]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-[#4F46E5]" />
                <div>
                  <p className="font-semibold">{autoPurchaseEnabled ? "Auto-Purchase Enabled" : "Auto-Purchase Disabled"}</p>
                  <p className="text-sm text-muted-foreground">
                    {autoPurchaseEnabled 
                      ? `AI operates automatically for Critical items under $${spendingLimit}`
                      : "AI suggestions require manual review before purchasing"}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto Purchase Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Auto-Purchase Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Auto-Purchase</Label>
                <p className="text-sm text-muted-foreground">
                  Allow the AI to automatically create POs for Critical items.
                </p>
              </div>
              <Button
                variant={autoPurchaseEnabled ? "default" : "secondary"}
                className={autoPurchaseEnabled ? "bg-[#4F46E5]" : ""}
                onClick={() => setAutoPurchaseEnabled(!autoPurchaseEnabled)}
              >
                {autoPurchaseEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Max Spending Limit per Order ($)</Label>
              <Input 
                type="number" 
                value={spendingLimit}
                onChange={(e) => setSpendingLimit(e.target.value)}
                disabled={!autoPurchaseEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Orders above this amount will require manual approval regardless of urgency.
              </p>
            </div>

            <Button 
              className="w-full bg-[#4F46E5] hover:bg-[#4338CA]" 
              onClick={() => {
                toast.success("Auto-purchase rules updated");
                setIsConfigOpen(false);
              }}
            >
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Purchase Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">No purchase orders found.</div>
          ) : (
            <div className="space-y-4">
              {purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  className="flex items-center justify-between p-4 bg-accent/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold">{po.id}</h4>
                      <Badge className={getStatusBadge(po.status)}>
                        {po.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{po.items}</p>
                    <p className="text-sm text-muted-foreground">
                      {po.supplier} • {po.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{po.amount}</p>
                    <Button variant="ghost" size="sm" className="mt-2">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
