export const KAFKA_TOPICS = {
  ORDER_CREATED: 'flashhub.order.created',
  INVENTORY_RESERVED: 'flashhub.inventory.reserved',
  INVENTORY_FAILED: 'flashhub.inventory.failed',
  PAYMENT_COMPLETED: 'flashhub.payment.completed',
  PAYMENT_FAILED: 'flashhub.payment.failed',
  ORDER_RETRY: 'flashhub.order.retry',
  ORDER_DLQ: 'flashhub.order.dlq',
} as const;

export const KAFKA_CONSUMER_GROUPS = {
  INVENTORY_SERVICE: 'flashhub-inventory-group',
  PAYMENT_SERVICE: 'flashhub-payment-group',
  ORDER_SERVICE: 'flashhub-order-group',
  NOTIFICATION_SERVICE: 'flashhub-notification-group',
  ORDER_RETRY_SERVICE: 'flashhub-order-retry-group',
  OPS_ALERT_SERVICE: 'flashhub-ops-alert-group',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
export type KafkaConsumerGroup =
  (typeof KAFKA_CONSUMER_GROUPS)[keyof typeof KAFKA_CONSUMER_GROUPS];

