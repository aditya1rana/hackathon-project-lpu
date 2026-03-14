import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
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
import { Plus, Search, Edit, Trash2, Shield, User as UserIcon, Loader2 } from "lucide-react";
import { useAppStore } from "../store";
import { api } from "../services/api";
import { User } from "../types";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["Admin", "Librarian", "Lab Assistant", "Student"] as const),
  department: z.string().min(2, "Department is required"),
  status: z.enum(["Active", "Inactive"] as const),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function Users() {
  const { users, setUsers, addUser, updateUser, deleteUser } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "Student",
      department: "",
      status: "Active",
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        if (users.length === 0) {
          const data = await api.getUsers();
          setUsers(data);
        }
      } catch (error) {
        toast.error("Failed to load users");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [users.length, setUsers]);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    reset({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
    });
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = async (data: UserFormValues) => {
    try {
      setIsSubmitting(true);
      if (editingUser) {
        const updated = await api.updateUser(editingUser.id, data);
        updateUser(editingUser.id, updated);
        toast.success("User updated successfully");
      } else {
        const newUser = await api.addUser({
          ...data,
          lastActive: new Date().toISOString(),
        });
        addUser(newUser as User);
        toast.success("User added successfully");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error(editingUser ? "Failed to update user" : "Failed to add user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsSubmitting(true);
      await api.deleteUser(userToDelete);
      deleteUser(userToDelete);
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setIsSubmitting(false);
      setUserToDelete(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const config = {
      Admin: "bg-[#EF4444]/10 text-[#EF4444]",
      Librarian: "bg-[#4F46E5]/10 text-[#4F46E5]",
      "Lab Assistant": "bg-[#06B6D4]/10 text-[#06B6D4]",
      Student: "bg-[#10B981]/10 text-[#10B981]",
    };
    return config[role as keyof typeof config] || "bg-gray-100 text-gray-800";
  };

  const getInitials = (name: string) => {
    return name?.split(" ")?.map((n) => n[0])?.join("")?.toUpperCase() || "U";
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions across the system.
          </p>
        </div>
        <Button 
          className="bg-[#4F46E5] hover:bg-[#4338CA]"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : users.length}
              </p>
            </div>
            <div className="bg-[#4F46E5]/10 text-[#4F46E5] p-3 rounded-lg">
              <UserIcon className="w-8 h-8" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-3xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : users.filter((u) => u.role === "Admin").length}
              </p>
            </div>
            <div className="bg-[#EF4444]/10 text-[#EF4444] p-3 rounded-lg">
              <Shield className="w-8 h-8" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-3xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : users.filter((u) => u.status === "Active").length}
              </p>
            </div>
            <div className="bg-[#10B981]/10 text-[#10B981] p-3 rounded-lg">
              <UserIcon className="w-8 h-8" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Students</p>
              <p className="text-3xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : users.filter((u) => u.role === "Student").length}
              </p>
            </div>
            <div className="bg-[#06B6D4]/10 text-[#06B6D4] p-3 rounded-lg">
              <UserIcon className="w-8 h-8" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-card p-4 rounded-lg border border-border">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Librarian">Librarian</SelectItem>
            <SelectItem value="Lab Assistant">Lab Assistant</SelectItem>
            <SelectItem value="Student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <Skeleton className="h-4 w-[120px]" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-[70px] ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                   No users found.
                 </TableCell>
               </TableRow>
            ) : (
             filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-[#4F46E5]/10 text-[#4F46E5]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge className={getRoleBadge(user.role)}>{user.role}</Badge>
                </TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      user.status === "Active"
                        ? "bg-[#10B981]/10 text-[#10B981]"
                        : "bg-[#6B7280]/10 text-[#6B7280]"
                    }
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.lastActive).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-[#EF4444]" onClick={() => setUserToDelete(user.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!editingUser} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Enter full name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="user@college.edu" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={watch("role")} onValueChange={(val: any) => setValue("role", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Librarian">Librarian</SelectItem>
                    <SelectItem value="Lab Assistant">Lab Assistant</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(val: any) => setValue("status", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-red-500">{errors.status.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input placeholder="e.g., Computer Science" {...register("department")} />
              {errors.department && <p className="text-xs text-red-500">{errors.department.message}</p>}
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
                {editingUser ? "Save Changes" : "Add User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user's account and remove their data from our servers.
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
    </div>
  );
}
