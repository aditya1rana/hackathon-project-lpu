import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Label } from "../components/ui/label";
import { Plus, Upload, Download, Search, Edit, Trash2, Eye, Loader2, FileSpreadsheet } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useAppStore } from "../store";
import { api } from "../services/api";
import { InventoryItem, InventoryStatus } from "../types";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";

// Zod Schema for Validation
const itemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(2, "Category is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative").optional(),
  status: z.enum(["In Stock", "Low Stock", "Out of Stock", "Maintenance"] as const),
  location: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export default function Inventory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { inventory, setInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val) {
      setSearchParams({ q: val }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modals state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema) as any,
    defaultValues: {
      name: "",
      category: "",
      quantity: 0,
      status: "In Stock",
      location: "",
    },
  });

  // Fetch initial data
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setIsLoading(true);
        // Only fetch if empty to avoid refetching on every return to page
        if (inventory.length === 0) {
          const data = await api.getInventory();
          setInventory(data);
        }
      } catch (error) {
        toast.error("Failed to load inventory");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, [inventory.length, setInventory]);

  // Open Edit Modal with data
  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    reset({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      status: item.status,
      location: item.location || "",
    });
  };

  // Close modals
  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingItem(null);
    reset();
  };

  // Submit handler (Add & Edit)
  const onSubmit = async (data: ItemFormValues) => {
    try {
      setIsSubmitting(true);
      if (editingItem) {
        // Edit logic
        const updated = await api.updateInventoryItem(editingItem.id, {
          ...data,
          lastUpdated: new Date().toISOString().split('T')[0],
        });
        updateInventoryItem(editingItem.id, updated);
        toast.success("Item updated successfully");
        // Send email alert for every edit
        await api.sendEmailAlert(
          `Item Updated: ${data.name}`,
          `The item "${data.name}" has been updated.\n\nUpdated details:\n• Quantity: ${data.quantity} units\n• Category: ${data.category}\n• Status: ${data.status}\n• Unit Price: $${data.unitPrice || 0}\n• Location: ${data.location || 'N/A'}`
        );
      } else {
        // Add logic
        const newItem = await api.addInventoryItem({
          ...data,
          lastUpdated: new Date().toISOString().split('T')[0],
        });
        addInventoryItem(newItem as InventoryItem);
        toast.success("Item added successfully");
        // Send email alert for new item
        await api.sendEmailAlert(
          `New Item Added: ${data.name}`,
          `A new item "${data.name}" has been added to the inventory.\n\n• Quantity: ${data.quantity} units\n• Category: ${data.category}\n• Status: ${data.status}\n• Unit Price: $${data.unitPrice || 0}\n• Location: ${data.location || 'N/A'}`
        );
      }
      handleCloseDialog();
    } catch (error) {
      toast.error(editingItem ? "Failed to update item" : "Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const deletedItem = inventory.find(i => i.id === itemToDelete);
    try {
      setIsSubmitting(true);
      await api.deleteInventoryItem(itemToDelete);
      deleteInventoryItem(itemToDelete);
      toast.success("Item deleted successfully");
      // Send email alert for deletion
      if (deletedItem) {
        await api.sendEmailAlert(
          `Item Deleted: ${deletedItem.name}`,
          `The item "${deletedItem.name}" has been permanently deleted from the inventory.\n\n• Quantity was: ${deletedItem.quantity} units\n• Category: ${deletedItem.category}\n• Status: ${deletedItem.status}`
        );
      }
    } catch (error) {
      toast.error("Failed to delete item");
    } finally {
      setIsSubmitting(false);
      setItemToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "In Stock": "bg-[#10B981]/10 text-[#10B981]",
      "Low Stock": "bg-[#F59E0B]/10 text-[#F59E0B]",
      "Out of Stock": "bg-[#EF4444]/10 text-[#EF4444]",
      "Maintenance": "bg-[#6366F1]/10 text-[#6366F1]"
    };
    return statusConfig[status as keyof typeof statusConfig] || "";
  };

  const filteredData = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage and track all inventory items across labs and libraries.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-[#4F46E5] hover:bg-[#4338CA]"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button variant="outline" onClick={() => toast.success("Export started")}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-card p-4 rounded-lg border border-border">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="pl-10"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Electronics">Electronics</SelectItem>
            <SelectItem value="Lab Equipment">Lab Equipment</SelectItem>
            <SelectItem value="Computing">Computing</SelectItem>
            <SelectItem value="Tools">Tools</SelectItem>
            <SelectItem value="Microcontrollers">Microcontrollers</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="In Stock">In Stock</SelectItem>
            <SelectItem value="Low Stock">Low Stock</SelectItem>
            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Table */}
      <div className="bg-card rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading State
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredData.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No inventory items found.
                </TableCell>
              </TableRow>
            ) : (
              // Data State
              filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${(item.unitPrice || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.location || "N/A"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.lastUpdated}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/inventory/${item.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditClick(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-[#EF4444]"
                        onClick={() => setItemToDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination (Mock visual) */}
      {!isLoading && filteredData.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {filteredData.length} of {inventory.length} items
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!editingItem} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input placeholder="Enter item name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={watch("category")} 
                onValueChange={(val) => setValue("category", val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Lab Equipment">Lab Equipment</SelectItem>
                  <SelectItem value="Computing">Computing</SelectItem>
                  <SelectItem value="Tools">Tools</SelectItem>
                  <SelectItem value="Microcontrollers">Microcontrollers</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" placeholder="0" {...register("quantity", { valueAsNumber: true })} />
                {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Unit Price ($)</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register("unitPrice", { valueAsNumber: true })} />
                {errors.unitPrice && <p className="text-xs text-red-500">{errors.unitPrice.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={watch("status")} 
                  onValueChange={(val: InventoryStatus) => setValue("status", val, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock</SelectItem>
                    <SelectItem value="Low Stock">Low Stock</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="e.g., Lab 1, Shelf A" {...register("location")} />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingItem ? "Save Changes" : "Add Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected inventory item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button 
              className="bg-red-500 hover:bg-red-600"
              disabled={isSubmitting}
              onClick={confirmDelete}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#4F46E5]" />
              Bulk Upload from Google Sheets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Google Sheets URL</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Share your Google Sheet as public (File → Share → Anyone with the link). 
                Columns should be: Name, Category, Quantity, Status, Location, Unit Price
              </p>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
            </div>
            <div className="bg-accent/50 rounded-lg p-3">
              <p className="text-xs font-medium mb-2">Expected Sheet Format:</p>
              <div className="text-xs text-muted-foreground font-mono">
                <div className="grid grid-cols-6 gap-1">
                  <span>Name</span><span>Category</span><span>Qty</span><span>Status</span><span>Location</span><span>Price</span>
                </div>
                <div className="grid grid-cols-6 gap-1 mt-1 text-foreground/60">
                  <span>Arduino</span><span>Electronics</span><span>50</span><span>In Stock</span><span>Lab A</span><span>25.00</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setIsBulkUploadOpen(false); setSheetUrl(""); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]"
                disabled={!sheetUrl.trim() || isBulkLoading}
                onClick={async () => {
                  try {
                    setIsBulkLoading(true);
                    // Extract Google Sheet ID and build CSV export URL
                    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (!match) { toast.error("Invalid Google Sheets URL"); return; }
                    const sheetId = match[1];
                    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
                    
                    const res = await fetch(csvUrl);
                    if (!res.ok) { toast.error("Could not fetch sheet. Make sure it's shared publicly."); return; }
                    const csvText = await res.text();
                    
                    // Parse CSV
                    const lines = csvText.split('\n').filter(l => l.trim());
                    if (lines.length < 2) { toast.error("Sheet appears empty"); return; }
                    
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
                    const nameIdx = headers.findIndex(h => h.includes('name'));
                    const catIdx = headers.findIndex(h => h.includes('categ'));
                    const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity'));
                    const statusIdx = headers.findIndex(h => h.includes('status'));
                    const locIdx = headers.findIndex(h => h.includes('location') || h.includes('loc'));
                    const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('cost'));
                    
                    if (nameIdx === -1) { toast.error("Could not find 'Name' column in sheet"); return; }
                    
                    let added = 0;
                    for (let i = 1; i < lines.length; i++) {
                      const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
                      const name = cols[nameIdx];
                      if (!name) continue;
                      
                      try {
                        const newItem = await api.addInventoryItem({
                          name,
                          category: catIdx >= 0 ? cols[catIdx] || 'General' : 'General',
                          quantity: qtyIdx >= 0 ? parseInt(cols[qtyIdx]) || 0 : 0,
                          status: (statusIdx >= 0 ? cols[statusIdx] || 'In Stock' : 'In Stock') as InventoryStatus,
                          location: locIdx >= 0 ? cols[locIdx] || '' : '',
                          unitPrice: priceIdx >= 0 ? parseFloat(cols[priceIdx]) || 0 : 0,
                          lastUpdated: new Date().toISOString().split('T')[0],
                        });
                        addInventoryItem(newItem as InventoryItem);
                        added++;
                      } catch { /* skip failed items */ }
                    }
                    
                    toast.success(`Successfully imported ${added} items!`);
                    setIsBulkUploadOpen(false);
                    setSheetUrl("");
                    
                    // Send email alert
                    api.sendEmailAlert(
                      'Bulk Import Complete',
                      `${added} items were imported from Google Sheets into the inventory.`
                    );
                  } catch (err) {
                    toast.error("Failed to import from Google Sheets");
                  } finally {
                    setIsBulkLoading(false);
                  }
                }}
              >
                {isBulkLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Import Items
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
