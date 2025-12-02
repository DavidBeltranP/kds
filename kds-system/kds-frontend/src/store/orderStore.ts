import { create } from 'zustand';
import type { Order } from '../types';

interface OrderState {
  orders: Order[];
  currentPage: number;
  totalPages: number;
  lastFinishedOrderId: string | null;

  // Actions
  setOrders: (orders: Order[]) => void;
  addOrders: (orders: Order[]) => void;
  removeOrder: (orderId: string) => void;
  restoreOrder: (order: Order) => void;
  setPage: (page: number | 'next' | 'prev' | 'first' | 'last') => void;
  calculatePages: (ordersPerPage: number) => void;
  setTotalPages: (pages: number) => void;
  setLastFinished: (orderId: string | null) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  currentPage: 1,
  totalPages: 1,
  lastFinishedOrderId: null,

  setOrders: (orders) =>
    set({
      orders: orders.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    }),

  addOrders: (newOrders) =>
    set((state) => {
      const existingIds = new Set(state.orders.map((o) => o.id));
      const uniqueNewOrders = newOrders.filter((o) => !existingIds.has(o.id));

      return {
        orders: [...state.orders, ...uniqueNewOrders].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      };
    }),

  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== orderId),
      lastFinishedOrderId: orderId,
    })),

  restoreOrder: (order) =>
    set((state) => ({
      orders: [...state.orders, order].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
      lastFinishedOrderId: null,
    })),

  setPage: (page) =>
    set((state) => {
      let newPage = state.currentPage;

      if (typeof page === 'number') {
        newPage = page;
      } else if (page === 'next') {
        newPage = Math.min(state.currentPage + 1, state.totalPages);
      } else if (page === 'prev') {
        newPage = Math.max(state.currentPage - 1, 1);
      } else if (page === 'first') {
        newPage = 1;
      } else if (page === 'last') {
        newPage = state.totalPages;
      }

      return { currentPage: newPage };
    }),

  calculatePages: (ordersPerPage) =>
    set((state) => ({
      totalPages: Math.max(1, Math.ceil(state.orders.length / ordersPerPage)),
    })),

  setTotalPages: (pages) =>
    set({ totalPages: pages }),

  setLastFinished: (orderId) =>
    set({ lastFinishedOrderId: orderId }),
}));

// Selectores
export const useCurrentPageOrders = (ordersPerPage: number) =>
  useOrderStore((state) => {
    const start = (state.currentPage - 1) * ordersPerPage;
    const end = start + ordersPerPage;
    return state.orders.slice(start, end);
  });

export const useTotalOrders = () =>
  useOrderStore((state) => state.orders.length);

export const usePagination = () =>
  useOrderStore((state) => ({
    currentPage: state.currentPage,
    totalPages: state.totalPages,
  }));
