import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Plus, Search, Mail, Phone, MapPin, Star, Package, Edit, Trash2, Loader2 } from "lucide-react";
import { useAppStore } from "../store";
import { api } from "../services/api";
import { Supplier } from "../types";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";

const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required"),
  category: z.string().min(2, "Category is required"),
  contact: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number is required"),
  location: z.string().min(2, "Location is required"),
  status: z.enum(["Active", "Pending"] as const),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export default function Suppliers() {
  const { suppliers, setSuppliers, addSupplier, updateSupplier, deleteSupplier } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      category: "",
      contact: "",
      phone: "",
      location: "",
      status: "Active",
    },
  });

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setIsLoading(true);
        if (suppliers.length === 0) {
          const data = await api.getSuppliers();
          setSuppliers(data);
        }
      } catch (error) {
        toast.error("Failed to load suppliers");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSuppliers();
  }, [suppliers.length, setSuppliers]);

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    reset({
      name: supplier.name,
      category: supplier.category,
      contact: supplier.contact,
      phone: supplier.phone,
      location: supplier.location,
      status: supplier.status,
    });
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingSupplier(null);
    reset();
  };

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      setIsSubmitting(true);
      if (editingSupplier) {
        const updated = await api.updateSupplier(editingSupplier.id, data);
        updateSupplier(editingSupplier.id, updated);
        toast.success("Supplier updated successfully");
      } else {
        const newSupplier = await api.addSupplier({
          ...data,
          rating: 0,
          totalOrders: 0,
        });
        addSupplier(newSupplier as Supplier);
        toast.success("Supplier added successfully");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error(editingSupplier ? "Failed to update supplier" : "Failed to add supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      setIsSubmitting(true);
      await api.deleteSupplier(supplierToDelete);
      deleteSupplier(supplierToDelete);
      toast.success("Supplier deleted successfully");
    } catch (error) {
      toast.error("Failed to delete supplier");
    } finally {
      setIsSubmitting(false);
      setSupplierToDelete(null);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Supplier Management</h1>
          <p className="text-muted-foreground">
            Manage relationships with your inventory suppliers.
          </p>
        </div>
        <Button 
          className="bg-[#4F46E5] hover:bg-[#4338CA]"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers by name or category..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <div className="space-y-3 mb-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="pt-4 border-t border-border flex justify-between">
                   <Skeleton className="h-10 w-[45%]" />
                   <Skeleton className="h-10 w-[45%]" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-1 md:col-span-2 text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">No suppliers found matching your search.</p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
          <Card key={supplier.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {supplier.name}
                  </h3>
                  <Badge
                    className={
                      supplier.status === "Active"
                        ? "bg-[#10B981]/10 text-[#10B981]"
                        : "bg-[#F59E0B]/10 text-[#F59E0B]"
                    }
                  >
                    {supplier.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />
                  <span className="font-semibold">{supplier.rating}</span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-[#4F46E5]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-[#4F46E5]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Category</p>
                    <p className="font-medium truncate">{supplier.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-[#06B6D4]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-[#06B6D4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="font-medium truncate">{supplier.contact}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-[#10B981]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Phone</p>
                    <p className="font-medium truncate">{supplier.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Location</p>
                    <p className="font-medium truncate">{supplier.location}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    Total Orders
                  </span>
                  <span className="text-lg font-bold">{supplier.totalOrders}</span>
                </div>
                <div className="flex gap-2 mb-3">
                   <Button variant="outline" className="flex-1" onClick={() => handleEditClick(supplier)}>
                     <Edit className="w-4 h-4 mr-2" />
                     Edit
                   </Button>
                   <Button variant="outline" className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setSupplierToDelete(supplier.id)}>
                     <Trash2 className="w-4 h-4 mr-2" />
                     Delete
                   </Button>
                </div>
                <div className="flex gap-2">
                  <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA]" onClick={() => toast.info("Creating order for " + supplier.name)}>
                    Create Order
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )))}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!editingSupplier} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input placeholder="Enter supplier name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input placeholder="e.g., Electronics" {...register("category")} />
                {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(val: any) => setValue("status", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-red-500">{errors.status.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" placeholder="contact@supplier.com" {...register("contact")} />
              {errors.contact && <p className="text-xs text-red-500">{errors.contact.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+1 (555) 000-0000" {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="City, State" {...register("location")} />
              {errors.location && <p className="text-xs text-red-500">{errors.location.message}</p>}
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
                {editingSupplier ? "Save Changes" : "Add Supplier"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the supplier and all their product associations from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button 
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
              disabled={isSubmitting}
              onClick={confirmDelete}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
