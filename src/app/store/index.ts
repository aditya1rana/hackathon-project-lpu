import { create } from 'zustand';
import { InventoryItem, Request, User, Notification, Supplier, PurchaseOrder } from '../types';

interface AppState {
  // Authentication
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Inventory
  inventory: InventoryItem[];
  setInventory: (items: InventoryItem[]) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updatedItem: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;

  // Requests
  requests: Request[];
  setRequests: (reqs: Request[]) => void;
  addRequest: (req: Request) => void;
  updateRequestStatus: (id: string, status: Request['status']) => void;

  // Users
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updatedUser: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifs: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  
  // Suppliers
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updatedSupplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Purchase Orders
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: (pos: PurchaseOrder[]) => void;
  addPurchaseOrder: (po: PurchaseOrder) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  inventory: [],
  setInventory: (items) => set({ inventory: items }),
  addInventoryItem: (item) =>
    set((state) => ({ inventory: [...state.inventory, item] })),
  updateInventoryItem: (id, updatedItem) =>
    set((state) => ({
      inventory: state.inventory.map((item) =>
        item.id === id ? { ...item, ...updatedItem } : item
      ),
    })),
  deleteInventoryItem: (id) =>
    set((state) => ({
      inventory: state.inventory.filter((item) => item.id !== id),
    })),

  requests: [],
  setRequests: (reqs) => set({ requests: reqs }),
  addRequest: (req) => set((state) => ({ requests: [req, ...state.requests] })),
  updateRequestStatus: (id, status) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, status } : r
      ),
    })),

  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (id, updatedUser) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...updatedUser } : u)),
    })),
  deleteUser: (id) =>
    set((state) => ({ users: state.users.filter((u) => u.id !== id) })),

  notifications: [],
  setNotifications: (notifs) => set({ notifications: notifs }),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  suppliers: [],
  setSuppliers: (suppliers) => set({ suppliers }),
  addSupplier: (supplier) => set((state) => ({ suppliers: [...state.suppliers, supplier] })),
  updateSupplier: (id, updatedSupplier) =>
    set((state) => ({
      suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...updatedSupplier } : s)),
    })),
  deleteSupplier: (id) =>
    set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) })),

  purchaseOrders: [],
  setPurchaseOrders: (pos) => set({ purchaseOrders: pos }),
  addPurchaseOrder: (po) => set((state) => ({ purchaseOrders: [po, ...state.purchaseOrders] })),
}));
