import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "./schema";
import { OrderDetails } from "@/components/PaymentModal";
import { OrderMessageItem } from "@/components/NotificationBell";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface StoredCustomerOrder {
  id: string;
  publicMemo: string;
  clientToken: string;
  createdAt: string;
}

interface StoreState {
  // Cart
  cart: CartItem[];
  isCartOpen: boolean;
  addToCart: (product: Product, quantity: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Active Checkout Order & Payment Modal
  activeOrder: OrderDetails | null;
  isPaymentModalOpen: boolean;
  openPaymentModal: (order: OrderDetails) => void;
  closePaymentModal: () => void;

  // Ephemeral Message Delivery Modal
  selectedMessage: OrderMessageItem | null;
  activeClientToken: string | null;
  isMessageModalOpen: boolean;
  openMessageModal: (message: OrderMessageItem, token: string | null) => void;
  closeMessageModal: () => void;

  // Customer Stored Orders & Acknowledged message IDs
  customerOrders: StoredCustomerOrder[];
  acknowledgedMsgIds: string[];
  addCustomerOrder: (order: StoredCustomerOrder) => void;
  acknowledgeMessageId: (msgId: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Cart
      cart: [],
      isCartOpen: false,
      addToCart: (product, quantity) =>
        set((state) => {
          const existing = state.cart.find((item) => item.id === product.id);
          const newCart = existing
            ? state.cart.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            : [
                ...state.cart,
                {
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  quantity,
                  imageUrl: product.imageUrl || undefined,
                },
              ];
          return { cart: newCart, isCartOpen: true };
        }),
      updateQuantity: (id, delta) =>
        set((state) => ({
          cart: state.cart
            .map((item) => {
              if (item.id === id) {
                const next = item.quantity + delta;
                return next > 0 ? { ...item, quantity: next } : null;
              }
              return item;
            })
            .filter(Boolean) as CartItem[],
        })),
      removeFromCart: (id) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
        })),
      clearCart: () => set({ cart: [] }),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      // Payment Modal
      activeOrder: null,
      isPaymentModalOpen: false,
      openPaymentModal: (order) =>
        set({ activeOrder: order, isPaymentModalOpen: true, isCartOpen: false }),
      closePaymentModal: () =>
        set({ isPaymentModalOpen: false }),

      // Message Modal
      selectedMessage: null,
      activeClientToken: null,
      isMessageModalOpen: false,
      openMessageModal: (message, token) =>
        set({
          selectedMessage: message,
          activeClientToken: token,
          isMessageModalOpen: true,
        }),
      closeMessageModal: () =>
        set({
          isMessageModalOpen: false,
          selectedMessage: null,
          activeClientToken: null,
        }),

      // Customer storage
      customerOrders: [],
      acknowledgedMsgIds: [],
      addCustomerOrder: (order) =>
        set((state) => ({
          customerOrders: [...state.customerOrders, order],
        })),
      acknowledgeMessageId: (msgId) =>
        set((state) => ({
          acknowledgedMsgIds: state.acknowledgedMsgIds.includes(msgId)
            ? state.acknowledgedMsgIds
            : [...state.acknowledgedMsgIds, msgId],
        })),
    }),
    {
      name: "mmo_store_state",
      partialize: (state) => ({
        cart: state.cart,
        customerOrders: state.customerOrders,
        acknowledgedMsgIds: state.acknowledgedMsgIds,
      }),
    }
  )
);
