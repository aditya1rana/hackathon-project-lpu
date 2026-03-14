import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { api } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UserRequests() {
  const { requests, setRequests, currentUser } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        if (requests.length === 0) {
          const data = await api.getRequests();
          setRequests(data);
        }
      } catch (error) {
        toast.error("Failed to load requests");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [requests.length, setRequests]);

  // Filter requests to normally only show the logged-in user's requests.
  // We mock this by selecting a subset or just showing all for demo purposes.
  // In a real app: const myRequests = requests.filter(r => r.requesterId === currentUser?.id);
  const myRequests = requests.filter(r => r.type === 'Borrow' || r.type === 'Restock').slice(0, 3);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-100 text-emerald-800";
      case "Pending":
        return "bg-amber-100 text-amber-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      case "Fulfilled":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Requests</h1>
        <p className="text-muted-foreground">Track the status of your equipment borrow requests.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#06B6D4]" />
            Request History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center p-8">
               <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
             </div>
          ) : myRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              You haven't made any requests yet. Check out the Catalog!
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <div key={request.id} className="p-4 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                     <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">{request.itemName}</h3>
                        <Badge className={`border-0 ${getStatusBadge(request.status)}`}>{request.status}</Badge>
                     </div>
                     <p className="text-sm text-muted-foreground">Requested {request.date} • Qty: {request.quantity}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-medium">Req ID: {request.id}</p>
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
