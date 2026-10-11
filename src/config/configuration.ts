export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'flashhub',
    password: process.env.DB_PASSWORD || 'flashhub_secret',
    database: process.env.DB_DATABASE || 'flashhub_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:29092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'flashhub-engine',
    groupId: process.env.KAFKA_GROUP_ID || 'flashhub-order-group',
  },
});

