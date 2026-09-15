import { create } from 'zustand';

export const useAdminOrdersStore = create((set, get) => ({
  todayProcessing: [],
  todayPrepared: [],
  tomorrowProcessing: [],
  tomorrowPrepared: [],
  drivers: [],
  capacityInfo: null,
  loading: false,
  error: null,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setTodayOrders: ({ processing = [], prepared = [] }) =>
    set({
      todayProcessing: processing,
      todayPrepared: prepared,
    }),

  setTomorrowOrders: ({ processing = [], prepared = [] }) =>
    set({
      tomorrowProcessing: processing,
      tomorrowPrepared: prepared,
    }),

  setDrivers: (drivers = []) => set({ drivers }),
  setCapacityInfo: (capacityInfo) => set({ capacityInfo }),

  /**
   * Optimistically update order status or properties in the active list
   */
  updateOrderLocally: (orderId, updates) =>
    set((state) => {
      const updateList = (list) =>
        list.map((order) =>
          Number(order.id) === Number(orderId) ? { ...order, ...updates } : order
        );

      return {
        todayProcessing: updateList(state.todayProcessing),
        todayPrepared: updateList(state.todayPrepared),
        tomorrowProcessing: updateList(state.tomorrowProcessing),
        tomorrowPrepared: updateList(state.tomorrowPrepared),
      };
    }),

  /**
   * Remove order locally when completed/cancelled
   */
  removeOrderLocally: (orderId) =>
    set((state) => ({
      todayProcessing: state.todayProcessing.filter(
        (o) => Number(o.id) !== Number(orderId)
      ),
      todayPrepared: state.todayPrepared.filter(
        (o) => Number(o.id) !== Number(orderId)
      ),
      tomorrowProcessing: state.tomorrowProcessing.filter(
        (o) => Number(o.id) !== Number(orderId)
      ),
      tomorrowPrepared: state.tomorrowPrepared.filter(
        (o) => Number(o.id) !== Number(orderId)
      ),
    })),

  /**
   * Move an order from tomorrow to today optimistically
   */
  moveTomorrowToToday: (orderId) =>
    set((state) => {
      const movedProc = state.tomorrowProcessing.find(
        (o) => Number(o.id) === Number(orderId)
      );
      const movedPrep = state.tomorrowPrepared.find(
        (o) => Number(o.id) === Number(orderId)
      );

      return {
        tomorrowProcessing: state.tomorrowProcessing.filter(
          (o) => Number(o.id) !== Number(orderId)
        ),
        tomorrowPrepared: state.tomorrowPrepared.filter(
          (o) => Number(o.id) !== Number(orderId)
        ),
        todayProcessing: movedProc
          ? [...state.todayProcessing, { ...movedProc, assigned_date: 'today' }]
          : state.todayProcessing,
        todayPrepared: movedPrep
          ? [...state.todayPrepared, { ...movedPrep, assigned_date: 'today' }]
          : state.todayPrepared,
      };
    }),

  /**
   * Handle real-time socket order update event
   */
  handleSocketOrderEvent: (eventData) => {
    if (!eventData?.orderId) return;
    const { orderId, status, driverId, ...rest } = eventData;
    get().updateOrderLocally(orderId, {
      ...(status ? { status } : {}),
      ...(driverId ? { driver_id: driverId } : {}),
      ...rest,
    });
  },
}));
