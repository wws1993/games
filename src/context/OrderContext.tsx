import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  calcCouponDiscount,
  getCouponById,
  getServiceDetail,
  initialMockOrders,
  type Order,
  type OrderInvoice,
  type OrderReview,
  type OrderStatus,
} from '../data/mock';
import { storageGet, storageSet } from '../lib/storage';
import { useAuth } from './AuthContext';

const ORDERS_KEY = 'orders';

interface PayOptions {
  couponId?: string;
}

interface OrderContextValue {
  orders: Order[];
  createOrder: (serviceId: string) => Order | null;
  payOrder: (orderId: string, options?: PayOptions) => void;
  cancelOrder: (orderId: string) => void;
  completeOrder: (orderId: string) => void;
  submitReview: (orderId: string, review: Omit<OrderReview, 'createdAt'>) => void;
  submitInvoice: (orderId: string, invoice: Omit<OrderInvoice, 'status' | 'createdAt'>) => void;
  getOrder: (orderId: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextValue | null>(null);

function loadOrders(userId: string | undefined): Order[] {
  if (!userId) return [];
  const saved = storageGet<Order[]>(`${ORDERS_KEY}_${userId}`);
  return saved ?? initialMockOrders;
}

function saveOrders(userId: string, orders: Order[]) {
  storageSet(`${ORDERS_KEY}_${userId}`, orders);
}

function patchOrder(orders: Order[], orderId: string, patch: Partial<Order>): Order[] {
  return orders.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => loadOrders(user?.id));

  const syncOrders = useCallback(
    (next: Order[]) => {
      setOrders(next);
      if (user) saveOrders(user.id, next);
    },
    [user],
  );

  useEffect(() => {
    setOrders(loadOrders(user?.id));
  }, [user?.id]);

  const createOrder = useCallback(
    (serviceId: string): Order | null => {
      if (!user) return null;
      const service = getServiceDetail(serviceId);
      if (!service) return null;

      const order: Order = {
        id: `ord_${Date.now()}`,
        serviceId: service.id,
        serviceName: service.name,
        categoryName: service.categoryName,
        amount: service.price,
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        progress: [
          { label: '提交订单', done: true, time: '刚刚' },
          { label: '支付费用', done: false },
          { label: '顾问接单', done: false },
          { label: '办理完成', done: false },
        ],
        advisor: '顾问小陈',
      };
      syncOrders([order, ...orders]);
      return order;
    },
    [user, orders, syncOrders],
  );

  const updateStatus = useCallback(
    (orderId: string, status: OrderStatus, extra?: Partial<Order>) => {
      const next = orders.map((o) => {
        if (o.id !== orderId) return o;
        const progress = [...o.progress];
        if (status === 'in_progress' || status === 'pending_service') {
          progress[1] = { label: '支付费用', done: true, time: '刚刚' };
          progress[2] = { label: '顾问接单', done: true, time: status === 'in_progress' ? '刚刚' : undefined };
        }
        if (status === 'completed') {
          progress.forEach((p, i) => {
            progress[i] = { ...p, done: true, time: p.time ?? '已完成' };
          });
        }
        return { ...o, status, progress, ...extra };
      });
      syncOrders(next);
    },
    [orders, syncOrders],
  );

  const payOrder = useCallback(
    (orderId: string, options?: PayOptions) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order || order.status !== 'pending_payment') return;

      let discountAmount = 0;
      let couponId: string | undefined;
      if (options?.couponId) {
        const coupon = getCouponById(options.couponId);
        if (coupon) {
          discountAmount = calcCouponDiscount(order.amount, coupon);
          couponId = coupon.id;
        }
      }

      updateStatus(orderId, 'in_progress', { discountAmount, couponId });
    },
    [orders, updateStatus],
  );

  const cancelOrder = useCallback(
    (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order || order.status === 'completed' || order.status === 'cancelled') return;
      updateStatus(orderId, 'cancelled');
    },
    [orders, updateStatus],
  );

  const completeOrder = useCallback(
    (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order || order.status !== 'in_progress') return;
      updateStatus(orderId, 'completed');
    },
    [orders, updateStatus],
  );

  const submitReview = useCallback(
    (orderId: string, review: Omit<OrderReview, 'createdAt'>) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order || order.status !== 'completed' || order.review) return;
      syncOrders(
        patchOrder(orders, orderId, {
          review: { ...review, createdAt: new Date().toISOString() },
        }),
      );
    },
    [orders, syncOrders],
  );

  const submitInvoice = useCallback(
    (orderId: string, invoice: Omit<OrderInvoice, 'status' | 'createdAt'>) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order || order.invoice) return;
      if (order.status !== 'completed' && order.status !== 'in_progress') return;
      syncOrders(
        patchOrder(orders, orderId, {
          invoice: {
            ...invoice,
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        }),
      );
    },
    [orders, syncOrders],
  );

  const getOrder = useCallback((orderId: string) => orders.find((o) => o.id === orderId), [orders]);

  const value = useMemo(
    () => ({
      orders,
      createOrder,
      payOrder,
      cancelOrder,
      completeOrder,
      submitReview,
      submitInvoice,
      getOrder,
    }),
    [orders, createOrder, payOrder, cancelOrder, completeOrder, submitReview, submitInvoice, getOrder],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used within OrderProvider');
  return ctx;
}
