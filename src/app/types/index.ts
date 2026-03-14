export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Maintenance';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  status: InventoryStatus;
  lastUpdated: string;
  unitPrice?: number;
  location?: string;
  sku?: string;
  supplier?: string;
  minQuantity?: number;
}

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';
export type RequestType = 'Borrow' | 'Restock' | 'Maintenance' | 'Disposal';

export interface Request {
  id: string;
  itemName: string;
  requester: string;
  type: RequestType;
  date: string;
  status: RequestStatus;
  quantity: number;
  department?: string;
  reason?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Librarian' | 'Lab Assistant' | 'Student';
  department: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'alert' | 'info' | 'success' | 'warning';
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  location: string;
  rating: number;
  totalOrders: number;
  status: 'Active' | 'Pending';
}

export type POStatus = 'Delivered' | 'In Transit' | 'Processing';

export interface PurchaseOrder {
  id: string;
  items: string;
  supplier: string;
  amount: string;
  status: POStatus;
  date: string;
}
