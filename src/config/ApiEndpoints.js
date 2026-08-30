const MAIN_URL = process.env.NEXT_PUBLIC_API_URL;

const API_ENDPOINTS = {
  BASE_URL: MAIN_URL,
  DASHBOARD: {
    ORDERS_STATIC: `/client/order-statistics`,
    RATIO_STATISTICS: `/client/ratio-statistics`,
    PIH_CHART: `/client/channel-statistics`,
    CHANNEL_RATIO_STATISTICS: `/client/channel/ratio-statistics`,
    ORDER_DELIVERY_REPORT: `/client/order-delivery-report`,
    SALES_TARGET: `/client/sales-target`,
  },
};
export { API_ENDPOINTS };
