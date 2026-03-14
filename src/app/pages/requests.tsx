import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { CheckCircle, XCircle, Clock, User, Package, Loader2 } from "lucide-react";
import { useAppStore } from "../store";
import { api } from "../services/api";
import { Request } from "../types";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";

export default function Requests() {
  const { requests, setRequests, updateRequestStatus, inventory, updateInventoryItem, setInventory } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (requests.length === 0) {
          const data = await api.getRequests();
          setRequests(data);
        }
        if (inventory.length === 0) {
          const invData = await api.getInventory();
          setInventory(invData);
        }
      } catch (error) {
        toast.error("Failed to load requests");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [requests.length, setRequests, inventory.length, setInventory]);

  const getStatusBadge = (status: string) => {
    const config = {
      Pending: {
        icon: Clock,
        className: "bg-[#F59E0B]/10 text-[#F59E0B]",
      },
      Approved: {
        icon: CheckCircle,
        className: "bg-[#10B981]/10 text-[#10B981]",
      },
      Rejected: {
        icon: XCircle,
        className: "bg-[#EF4444]/10 text-[#EF4444]",
      },
      Fulfilled: {
        icon: CheckCircle,
        className: "bg-[#4F46E5]/10 text-[#4F46E5]",
      }
    };
    return config[status as keyof typeof config] || { icon: Clock, className: "bg-gray-100 text-gray-800" };
  };

  const filterRequests = (status: string) => {
    if (status === "all") return requests;
    return requests.filter((req) => req.status === status);
  };

  const handleAction = async (newStatus: Request["status"]) => {
    if (!selectedRequest) return;
    try {
      setIsSubmitting(true);

      if (newStatus === "Approved" && selectedRequest.type === "Borrow") {
        const item = inventory.find(i => i.name === selectedRequest.itemName);
        if (item) {
          if (item.quantity >= selectedRequest.quantity) {
             updateInventoryItem(item.id, { quantity: item.quantity - selectedRequest.quantity });
          } else {
             toast.error(`Not enough stock available to fulfill this request.`);
             setIsSubmitting(false);
             return; // Stop execution, do not approve
          }
        }
      }

      await api.updateRequestStatus(selectedRequest.id, newStatus);
      updateRequestStatus(selectedRequest.id, newStatus);
      toast.success(`Request ${newStatus.toLowerCase()} successfully`);
      setApprovalDialogOpen(false);
      setSelectedRequest(null);
      setNotes("");
    } catch (error) {
      toast.error(`Failed to ${newStatus.toLowerCase()} request`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Request Management</h1>
        <p className="text-muted-foreground">
          Review and manage item requests from students and staff.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : requests.filter((r) => r.status === "Pending").length}
                </p>
              </div>
              <div className="bg-[#F59E0B]/10 text-[#F59E0B] p-3 rounded-lg">
                <Clock className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : requests.filter((r) => r.status === "Approved").length}
                </p>
              </div>
              <div className="bg-[#10B981]/10 text-[#10B981] p-3 rounded-lg">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : requests.filter((r) => r.status === "Rejected").length}
                </p>
              </div>
              <div className="bg-[#EF4444]/10 text-[#EF4444] p-3 rounded-lg">
                <XCircle className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="Pending">Pending</TabsTrigger>
          <TabsTrigger value="Approved">Approved</TabsTrigger>
          <TabsTrigger value="Rejected">Rejected</TabsTrigger>
          <TabsTrigger value="Fulfilled">Fulfilled</TabsTrigger>
        </TabsList>

        {["all", "Pending", "Approved", "Rejected", "Fulfilled"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {isLoading ? (
              // Loading State skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                         <Skeleton className="w-14 h-14 rounded-lg" />
                         <div className="space-y-2 flex-1 pt-1">
                            <Skeleton className="h-6 w-[200px]" />
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-4 w-[250px]" />
                         </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filterRequests(tab).length === 0 ? (
              // Empty State
              <Card>
                 <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No requests found.</p>
                 </CardContent>
              </Card>
            ) : (
              filterRequests(tab).map((request) => {
                const statusConfig = getStatusBadge(request.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={request.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                        <div className="flex gap-4 flex-1 w-full">
                          <div className="bg-accent rounded-lg p-4 flex items-center justify-center h-14 w-14 shrink-0">
                            <User className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-semibold text-lg truncate flex-1 md:flex-none">
                                {request.requester}
                              </h3>
                              <Badge className={`${statusConfig.className} shrink-0`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {request.status}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p className="truncate">Request ID: {request.id}</p>
                              {request.department && <p className="truncate">Department: {request.department}</p>}
                              <div className="flex items-center gap-2 mt-2">
                                <Package className="w-4 h-4 shrink-0" />
                                <span className="font-medium text-foreground truncate">
                                  {request.quantity}x {request.itemName}
                                </span>
                              </div>
                              <p>Requested on: {request.date}</p>
                            </div>
                          </div>
                        </div>
                        
                        {request.status === "Pending" && (
                          <div className="shrink-0 self-end sm:self-auto w-full sm:w-auto">
                            <Dialog
                              open={approvalDialogOpen && selectedRequest?.id === request.id}
                              onOpenChange={(open) => {
                                setApprovalDialogOpen(open);
                                if (open) {
                                  setSelectedRequest(request);
                                  setNotes("");
                                } else {
                                  setSelectedRequest(null);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button className="bg-[#4F46E5] hover:bg-[#4338CA] w-full">
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Review Request</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <Label>Student/Requester</Label>
                                    <p className="mt-1 font-medium">{request.requester}</p>
                                  </div>
                                  <div>
                                    <Label>Department</Label>
                                    <p className="mt-1 font-medium">{request.department || "N/A"}</p>
                                  </div>
                                  <div>
                                    <Label>Items Requested</Label>
                                    <p className="mt-1 font-medium">{request.quantity}x {request.itemName}</p>
                                  </div>
                                  <div>
                                    <Label>Notes (Optional)</Label>
                                    <Textarea
                                      placeholder="Add approval/rejection notes..."
                                      className="mt-1"
                                      value={notes}
                                      onChange={(e) => setNotes(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      variant="outline"
                                      className="flex-1 border-[#EF4444] text-[#EF4444] hover:bg-red-50 hover:text-red-600"
                                      onClick={() => handleAction("Rejected")}
                                      disabled={isSubmitting}
                                    >
                                      Reject
                                    </Button>
                                    <Button
                                      className="flex-1 bg-[#10B981] hover:bg-[#059669]"
                                      onClick={() => handleAction("Approved")}
                                      disabled={isSubmitting}
                                    >
                                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                      Approve
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
