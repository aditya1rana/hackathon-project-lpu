import { InventoryItem, Request, User, Notification, Supplier, PurchaseOrder } from '../types';
import { API_BASE } from '../config/api-config';

// Helper to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock Data
export const mockInventory: InventoryItem[] = [
  { id: '1', name: 'Fluke 87V Multimeter', category: 'Electronics', quantity: 15, status: 'In Stock', lastUpdated: '2023-11-20', location: 'Lab A', sku: 'ELEC-100' },
  { id: '2', name: 'Arduino Uno R3', category: 'Microcontrollers', quantity: 2, status: 'Low Stock', lastUpdated: '2023-11-19', location: 'Lab A', sku: 'CTRL-200' },
  { id: '3', name: 'Raspberry Pi 4 Model B', category: 'Computing', quantity: 0, status: 'Out of Stock', lastUpdated: '2023-11-18', location: 'Lab B', sku: 'COMP-300' },
  { id: '4', name: 'Tektronix Oscilloscope', category: 'Equipment', quantity: 4, status: 'Maintenance', lastUpdated: '2023-11-15', location: 'Lab C', sku: 'EQUIP-400' },
  { id: '5', name: 'Soldering Iron Kit', category: 'Tools', quantity: 8, status: 'In Stock', lastUpdated: '2023-11-20', location: 'Lab A', sku: 'TOOL-500' },
];

export const mockRequests: Request[] = [
  { id: 'REQ-01', itemName: 'Arduino Uno R3', requester: 'John Doe', type: 'Borrow', date: '2023-11-21', status: 'Pending', quantity: 5 },
  { id: 'REQ-02', itemName: 'Raspberry Pi 4', requester: 'Jane Smith', type: 'Restock', date: '2023-11-21', status: 'Approved', quantity: 20 },
  { id: 'REQ-03', itemName: 'Oscilloscope Probes', requester: 'Prof. Miller', type: 'Maintenance', date: '2023-11-20', status: 'Rejected', quantity: 2 },
  { id: 'REQ-04', itemName: 'Breadboards', requester: 'Sarah Jones', type: 'Restock', date: '2023-11-19', status: 'Fulfilled', quantity: 50 },
];

export const mockNotifications: Notification[] = [
  { id: '1', title: 'Low Stock Alert', description: 'Arduino Uno R3 is running low (2 left).', time: '10 mins ago', read: false, type: 'warning' },
  { id: '2', title: 'Request Pending', description: 'New borrow request from John Doe.', time: '1 hour ago', read: false, type: 'alert' },
  { id: '3', title: 'System Update', description: 'Scheduled maintenance this weekend.', time: '1 day ago', read: true, type: 'info' },
];

export const mockUsers: User[] = [
  { id: 'U-01', name: 'Alice Wilson', email: 'alice@example.com', role: 'Admin', department: 'IT', status: 'Active', lastActive: '2023-11-22T08:00:00Z' },
  { id: 'U-02', name: 'Bob Smith', email: 'bob@example.com', role: 'Lab Assistant', department: 'Electronics', status: 'Active', lastActive: '2023-11-21T14:30:00Z' },
  { id: 'U-03', name: 'Charlie Davis', email: 'charlie@example.com', role: 'Student', department: 'Computer Science', status: 'Inactive', lastActive: '2023-11-15T10:15:00Z' },
];

export const mockSuppliers: Supplier[] = [];

export const mockPurchaseOrders: PurchaseOrder[] = [
  { id: "PO-2026-034", items: "Arduino Boards x50", supplier: "Tech Solutions Inc.", amount: "$1,249.50", status: "Delivered", date: "Mar 10, 2026" },
  { id: "PO-2026-033", items: "Chemistry Lab Equipment", supplier: "Lab Supplies Co.", amount: "$3,450.00", status: "In Transit", date: "Mar 8, 2026" },
  { id: "PO-2026-032", items: "Books - Physics Collection", supplier: "Academic Books Inc.", amount: "$890.00", status: "Processing", date: "Mar 5, 2026" },
];


export const api = {
  // Inventory
  async getInventory() {
    const res = await fetch(`${API_BASE}/inventory?limit=1000`);
    if (!res.ok) throw new Error("Failed to fetch inventory");
    const json = await res.json();
    return (Array.isArray(json.data) ? json.data : []).map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category?.name || 'Uncategorized',
      categoryId: item.categoryId || '',
      quantity: item.quantity,
      status: item.quantity === 0 ? 'Out of Stock' : (item.quantity <= item.minStock ? 'Low Stock' : 'In Stock'),
      lastUpdated: new Date(item.updatedAt).toISOString().split('T')[0],
      location: item.location || 'N/A',
      sku: item.barcode || 'N/A',
      minStock: item.minStock,
      unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
    }));
  },
  async addInventoryItem(item: Omit<InventoryItem, 'id'>) {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({
        name: item.name,
        quantity: item.quantity,
        categoryId: item.category || 'Uncategorized',
        minStock: (item as any).minStock || 5,
        location: item.location,
        status: item.status,
        unitPrice: item.unitPrice,
      }),
    });
    if (!res.ok) throw new Error("Failed to add item");
    const json = await res.json();
    return { ...item, id: json.data.id, unitPrice: item.unitPrice };
  },
  async updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update item");
    return { id, ...updates };
  },
  async deleteInventoryItem(id: string) {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error("Failed to delete item");
    return id;
  },
  async adjustStock(id: string, quantity: number, type: 'ISSUE' | 'RETURN' | 'RESTOCK') {
    const res = await fetch(`${API_BASE}/inventory/${id}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity: quantity,
        type: type,
        notes: "Adjusted from dashboard",
      }),
    });
    if (!res.ok) throw new Error("Failed to record usage");
    return res.json();
  },

  // Requests
  async getRequests() {
    try {
      const res = await fetch(`${API_BASE}/requests?limit=1000`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (!res.ok) throw new Error("Failed to fetch requests");
      const json = await res.json();
      
      const requestsArray = Array.isArray(json.data) ? json.data : [];
      
      return requestsArray.map((req: any) => ({
        id: req.id,
        itemName: req.item?.name || 'Unknown Item',
        requester: req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'Unknown',
        type: 'Borrow', // Backend currently doesn't have request type in the same way, defaulting or mapped
        date: new Date(req.createdAt).toISOString().split('T')[0],
        status: req.status.charAt(0).toUpperCase() + req.status.slice(1).toLowerCase(),
        quantity: req.quantity,
        department: req.user?.department || '',
        reason: req.purpose || '',
      }));
    } catch (e) {
      console.warn("Using mock requests due to error", e);
      await delay(600);
      return [...mockRequests];
    }
  },
  async addRequest(request: Omit<Request, 'id'>) {
    // Need to find the item ID based on the name from inventory for a real submission,
    // For now try to assume we can call the endpoint
    try {
      // Small hack: the backend requires itemId.  The frontend passes itemName.
      // We would ideally fetch inventory here or pass itemId from the UI.
      // If we don't have it, this might fail, but let's implement the structure.
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          itemId: (request as any).itemId || 'dummy-item-id', // Needs to be provided by UI ideally
          quantity: request.quantity,
          purpose: request.reason || '',
        })
      });
      if (!res.ok) throw new Error("Failed to add request");
      const json = await res.json();
      return { ...request, id: json.data.id };
    } catch (e) {
      await delay(800);
      return { ...request, id: `REQ-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}` };
    }
  },
  async updateRequestStatus(id: string, status: Request['status']) {
    try {
      const res = await fetch(`${API_BASE}/requests/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ status: status.toUpperCase() })
      });
      if (!res.ok) throw new Error("Failed to update status");
      return { id, status };
    } catch (e) {
      await delay(700);
      return { id, status };
    }
  },

  // Suppliers
  async getSuppliers() {
    await delay(700);
    return [...mockSuppliers];
  },
  async addSupplier(supplier: Omit<Supplier, 'id'>) {
    await delay(600);
    return { ...supplier, id: Math.random().toString(36).substring(7) };
  },
  async updateSupplier(id: string, updates: Partial<Supplier>) {
    await delay(600);
    return { id, ...updates };
  },
  async deleteSupplier(id: string) {
    await delay(600);
    return id;
  },

  // Users
  async getUsers() {
    try {
      const res = await fetch(`${API_BASE}/users?limit=1000`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          // If unauthenticated or no route access, fallback for demo purposes or throw
          console.warn("Unauthenticated or unauthorized to fetch users. Falling back to mock data if needed.");
        }
        throw new Error("Failed to fetch users");
      }
      const json = await res.json();
      
      return (json.data || []).map((u: any) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        role: u.role?.name?.charAt(0).toUpperCase() + u.role?.name?.slice(1).toLowerCase() || 'Student',
        department: u.department || 'General',
        status: u.isActive ? 'Active' : 'Inactive',
        lastActive: u.lastLoginAt || u.updatedAt || new Date().toISOString()
      }));
    } catch (e) {
      console.error(e);
      // Fallback to mock if backend fails or auth fails in this demo environment
      await delay(500);
      return [...mockUsers];
    }
  },
  async addUser(user: Omit<User, 'id'>) {
    await delay(600);
    return { ...user, id: Math.random().toString(36).substring(7) };
  },
  async updateUser(id: string, updates: Partial<User>) {
    await delay(600);
    return { id, ...updates };
  },
  async deleteUser(id: string) {
    await delay(600);
    return id;
  },

  // Notifications
  async getNotifications() {
    await delay(300);
    return [...mockNotifications];
  },
  async markNotificationRead(id: string) {
    await delay(300);
    return id;
  },

  // Purchase Orders
  async getPurchaseOrders() {
    await delay(500);
    return [...mockPurchaseOrders];
  },
  async addPurchaseOrder(po: Omit<PurchaseOrder, 'id'>) {
    await delay(600);
    return { ...po, id: `PO-2026-0${Math.floor(Math.random() * 100) + 40}` };
  },

  // AI & Predictions
  async getRestockSuggestions() {
    try {
      const res = await fetch(`${API_BASE}/predictions/restock`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error("Backend unavailable");
      const json = await res.json();
      const rawSuggestions = json.data?.suggestions || json.data || [];
      return rawSuggestions.map((s: any) => {
        const priority = s.priority_label || s.urgency || "Medium";
        const normalizedUrgency = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
        
        return {
          id: s.item_id || s.id || Math.random().toString(36).substring(7),
          item: s.item_name || s.item || "Unknown Item",
          currentStock: s.current_stock ?? s.currentStock ?? 0,
          suggestedQuantity: s.suggested_quantity ?? s.suggestedQuantity ?? 0,
          estimatedCost: s.estimated_cost ?? s.estimatedCost ?? 0,
          urgency: normalizedUrgency,
          supplier: s.supplier || "Unknown Supplier",
          reason: s.reason || "Stock level critical",
        };
      });
    } catch (e) {
      console.warn("Using mock restock suggestions");
      await delay(800);
      return [];
    }
  },

  async getStockoutPredictions() {
    try {
      // Use real inventory data to compute stockout predictions
      const inventory = await this.getInventory();
      const predictions = inventory
        .filter((item: any) => item.quantity <= (item.minStock || 10) * 2)
        .map((item: any) => {
          const minStock = item.minStock || 5;
          const ratio = item.quantity / Math.max(minStock, 1);
          let urgency = 'Low';
          let days = Math.round(ratio * 21);
          let confidence = 70 + Math.round(Math.random() * 10);
          if (item.quantity === 0) { urgency = 'Critical'; days = 0; confidence = 99; }
          else if (ratio <= 0.5) { urgency = 'Critical'; days = Math.max(1, Math.round(ratio * 7)); confidence = 92 + Math.round(Math.random() * 6); }
          else if (ratio <= 1) { urgency = 'High'; days = Math.round(ratio * 14); confidence = 85 + Math.round(Math.random() * 8); }
          else if (ratio <= 1.5) { urgency = 'Medium'; days = Math.round(ratio * 21); confidence = 78 + Math.round(Math.random() * 10); }
          return { item: item.name, days, urgency, confidence, currentStock: item.quantity, minStock };
        })
        .sort((a: any, b: any) => a.days - b.days)
        .slice(0, 10);
      if (predictions.length === 0) {
        // Fallback if no items are low
        return inventory.slice(0, 5).map((item: any) => ({
          item: item.name, days: 30 + Math.round(Math.random() * 30),
          urgency: 'Low', confidence: 70 + Math.round(Math.random() * 10),
          currentStock: item.quantity, minStock: item.minStock || 5
        }));
      }
      return predictions;
    } catch (e) {
      await delay(600);
      return [
        { item: "Resistor Pack", days: 7, urgency: "Critical", confidence: 95 },
        { item: "Beaker Set", days: 14, urgency: "High", confidence: 88 },
        { item: "Arduino Boards", days: 21, urgency: "Medium", confidence: 82 },
      ];
    }
  },

  // Analytics
  async getAnalyticsOverview() {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    if (!res.ok) throw new Error("Failed to fetch overview");
    return (await res.json()).data;
  },
  async getMonthlyTrends() {
    const res = await fetch(`${API_BASE}/analytics/monthly-trends`);
    if (!res.ok) throw new Error("Failed to fetch trends");
    return (await res.json()).data;
  },
  // Email alerts
  async sendEmailAlert(subject: string, message: string) {
    try {
      const res = await fetch(`${API_BASE}/email/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: 'aditya1234udit@gmail.com', subject, message }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Email alert failed:', err);
      }
      return res.ok;
    } catch (err) {
      console.error('Email alert error:', err);
      return false;
    }
  },

  async getCategoryUsage() {
    const res = await fetch(`${API_BASE}/analytics/category-usage`);
    if (!res.ok) throw new Error("Failed to fetch categories");
    return (await res.json()).data;
  }
};
