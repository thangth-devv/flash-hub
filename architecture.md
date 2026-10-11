# 🏗️ Kiến Trúc Hệ Thống: FlashHub Engine
> **Event-Driven Flash Sale & Order Fulfillment Platform**  
> Dự án mẫu ứng dụng **NestJS**, **GoF Design Patterns** và **Apache Kafka** để giải quyết bài toán chịu tải cao, nhất quán dữ liệu phân tán (Eventual Consistency) và Clean Code.

---

## 1. Tổng Quan Hệ Thống (System Overview)

FlashHub mô phỏng luồng xử lý đơn hàng Flash Sale tốc độ cao:
- **High Concurrency & Low Latency**: Tiếp nhận hàng nghìn request/s trong đợt mở bán, phản hồi `202 Accepted` ngay lập tức và đưa vào hàng đợi xử lý bất đồng bộ.
- **Event-Driven & Decoupled**: Các thành phần (Order, Inventory, Payment, Notification) giao tiếp phi tập trung qua **Apache Kafka**.
- **Design Pattern Driven**: Vận dụng tự nhiên các mẫu thiết kế GoF để code mở rộng linh hoạt (OCP), dễ test và bảo trì.

---

## 2. Sơ Đồ Kiến Trúc Tổng Thể (System Architecture)

```mermaid
flowchart TD
    Client["Client / Mobile App"] -->|"1. POST /orders/checkout"| Ingress["Order Controller (API Gateway/Modular)"]
    
    subgraph OrderModule ["Order Module (Ingestion & Orchestration)"]
        Ingress --> CorPipe["Chain of Responsibility (Validation Pipeline)"]
        CorPipe --> Facade["CheckoutFacade"]
        Facade --> Strategy["Discount & Shipping Strategy"]
        Facade --> State["Order State Machine (PENDING)"]
        Facade --> OutboxTable[("PostgreSQL (Order & Outbox Table)")]
    end

    OutboxTable -->|"Polling / CDC"| OutboxWorker["Outbox Publisher Worker"]
    OutboxWorker -->|"Publish Event (Key: order_id)"| KafkaCluster{{"Kafka Cluster"}}

    subgraph KafkaBroker ["Kafka Topics & Partitioning"]
        KafkaCluster --> T_OrderCreated["flashhub.order.created"]
        KafkaCluster --> T_InventoryReserved["flashhub.inventory.reserved"]
        KafkaCluster --> T_PaymentCompleted["flashhub.payment.completed"]
        KafkaCluster --> T_PaymentFailed["flashhub.payment.failed"]
        KafkaCluster --> T_OrderDLQ["flashhub.order.dlq"]
    end

    subgraph InventoryModule ["Inventory Module"]
        T_OrderCreated -->|"Consumer (Group: inventory-service)"| InvConsumer["Inventory Consumer"]
        InvConsumer --> RedisLock[("Redis (Distributed Lock & Stock Cache)")]
        InvConsumer --> InvDB[("PostgreSQL (Inventory Stock)")]
        InvConsumer -->|"Success / Out of stock"| KafkaCluster
    end

    subgraph PaymentModule ["Payment Module"]
        T_InventoryReserved -->|"Consumer (Group: payment-service)"| PayConsumer["Payment Consumer"]
        PayConsumer --> PayFactory["Payment Gateway Factory"]
        PayFactory --> PayAdapter["Payment Adapters (VNPay / MoMo / Stripe)"]
        PayAdapter -->|"Success / Failure"| KafkaCluster
    end

    subgraph NotificationModule ["Notification & Analytics Module"]
        T_PaymentCompleted --> NotiConsumer["Notification Consumer"]
        T_PaymentFailed --> NotiConsumer
        NotiConsumer --> NotiFactory["Notification Provider Factory (Mail/SMS/Telegram)"]
    end
```

---

## 3. Luồng Nghiệp Vụ Chính (Core Workflows)

### 3.1. Luồng Thành Công (Happy Path - Choreography Saga)

```mermaid
sequenceDiagram
    autonumber
    actor User as User Client
    participant Order as Order Module
    participant DB as Postgres (DB)
    participant Kafka as Kafka Broker
    participant Inv as Inventory Module
    participant Pay as Payment Module
    participant Noti as Notification Module

    User->>Order: POST /orders/checkout
    Note over Order: Chạy Chain of Responsibility & Strategy
    Order->>DB: Lưu Order (PENDING) + Event (Outbox) [Atomic Transaction]
    Order-->>User: 202 Accepted (Order ID & Tracking URL)

    Note over Order,Kafka: Outbox Worker đẩy event lên Kafka
    Order->>Kafka: Publish `order.created` (Key: order_id)

    Kafka->>Inv: Consume `order.created`
    Note over Inv: Kiểm tra Idempotency & trừ giữ kho (Reserve Stock)
    Inv->>Kafka: Publish `inventory.reserved`

    Kafka->>Pay: Consume `inventory.reserved`
    Note over Pay: Factory + Adapter gọi Payment Gateway
    Pay->>Kafka: Publish `payment.completed`

    par Order cập nhật trạng thái
        Kafka->>Order: Consume `payment.completed`
        Order->>DB: Update Order State -> PAID
    and Thông báo người dùng
        Kafka->>Noti: Consume `payment.completed`
        Noti->>User: Gửi email xác nhận đơn hàng thành công
    end
```

---

### 3.2. Luồng Bù Trừ Phân Tán (Saga Compensating / Rollback Flow)
Kịch bản: Đã giữ kho thành công nhưng **thanh toán thất bại**. Hệ thống phải tự động hoàn lại số lượng tồn kho.

```mermaid
sequenceDiagram
    autonumber
    participant Pay as Payment Module
    participant Kafka as Kafka Broker
    participant Inv as Inventory Module
    participant Order as Order Module

    Pay->>Pay: Thanh toán thất bại (Thẻ hết tiền / Timeout)
    Pay->>Kafka: Publish `payment.failed` (Key: order_id)

    par Hoàn lại kho (Compensating Action)
        Kafka->>Inv: Consume `payment.failed`
        Note over Inv: Execute Command: Release Reserved Stock
        Inv->>Inv: Cộng lại tồn kho sản phẩm
    and Hủy đơn hàng
        Kafka->>Order: Consume `payment.failed`
        Note over Order: State Machine: Chuyển sang CANCELLED
        Order->>Order: Ghi nhận lý do hủy đơn
    end
```

---

## 4. Chi Tiết Ứng Dụng GoF Design Patterns

### 4.1. Creational Patterns (Khởi Tạo)
* **Factory Method / Abstract Factory**:
  * *Vị trí*: `src/modules/payment/factories/payment-gateway.factory.ts`
  * *Mục đích*: Cung cấp cổng thanh toán tương ứng dựa theo enum (`VNPAY`, `MOMO`, `STRIPE`, `COD`). Dễ dàng thêm cổng mới mà không sửa logic cũ (Open/Closed Principle).
* **Builder Pattern**:
  * *Vị trí*: `src/modules/order/builders/order.builder.ts`
  * *Mục đích*: Xây dựng đối tượng Order phức tạp gồm: Customer Info, Line Items, Applied Discounts, Shipping Address, Billing Metadata, Snapshot giá lúc mua.

### 4.2. Structural Patterns (Cấu Trúc)
* **Adapter Pattern**:
  * *Vị trí*: `src/modules/payment/adapters/vnpay.adapter.ts`, `momo.adapter.ts`
  * *Mục đích*: Mỗi 3rd-party Payment SDK có format request/response khác nhau. Adapter chuyển đổi chúng về cùng chuẩn interface `IPaymentGateway` (`charge()`, `refund()`, `verifyWebhook()`).
* **Strategy Pattern**:
  * *Vị trí*: `src/modules/order/strategies/discount/` & `shipping/`
  * *Mục đích*:
    - **DiscountStrategy**: `PercentageDiscountStrategy`, `FixedAmountDiscountStrategy`, `VipTierDiscountStrategy`.
    - **ShippingStrategy**: `StandardShippingStrategy`, `ExpressShippingStrategy`.
* **Decorator Pattern**:
  * *Vị trí*: `src/common/decorators/idempotent.decorator.ts` & `kafka-retry.decorator.ts`
  * *Mục đích*:
    - `@Idempotent({ keyFrom: 'orderId', ttl: 3600 })`: Tự động check Redis trước khi chạy method, chặn duplicate message từ Kafka.
    - `@AuditLog()`: Tự động ghi lại metadata request/event.
* **Facade Pattern**:
  * *Vị trí*: `src/modules/order/facades/checkout.facade.ts`
  * *Mục đích*: Che giấu sự phức tạp của hệ thống con, cung cấp 1 hàm `executeCheckout(dto)` duy nhất cho Controller.

### 4.3. Behavioral Patterns (Hành Vi)
* **State Pattern**:
  * *Vị trí*: `src/modules/order/states/`
  * *Mục đích*: Quản lý vòng đời trạng thái của Order: `PendingState`, `ReservedState`, `PaidState`, `CancelledState`. Ngăn chặn chuyển đổi trạng thái phi logic (ví dụ: đã Cancelled thì không thể chuyển sang Shipped).
* **Chain of Responsibility**:
  * *Vị trí*: `src/modules/order/pipes/validation-chain/`
  * *Mục đích*: Tạo pipeline kiểm tra checkout:
    `UserBlacklistHandler` ➔ `FlashSaleLimitHandler` ➔ `StockAvailabilityHandler` ➔ `FraudRiskHandler`.
* **Command Pattern**:
  * *Vị trí*: `src/modules/inventory/commands/`
  * *Mục đích*: Đóng gói hành động `ReserveStockCommand` và hành động bồi hoàn `ReleaseStockCommand` (Undo).

---

## 5. Kiến Trúc Kafka & Distributed Patterns

### 5.1. Bảng Topic & Partitioning Strategy

| Topic Name | Key | Event Payload | Consumer Groups |
| :--- | :--- | :--- | :--- |
| `flashhub.order.created` | `order_id` | `OrderCreatedEvent` | `inventory-group`, `audit-group` |
| `flashhub.inventory.reserved` | `order_id` | `InventoryReservedEvent` | `payment-group`, `order-group` |
| `flashhub.inventory.failed` | `order_id` | `InventoryFailedEvent` | `order-group`, `notification-group` |
| `flashhub.payment.completed` | `order_id` | `PaymentCompletedEvent` | `order-group`, `notification-group` |
| `flashhub.payment.failed` | `order_id` | `PaymentFailedEvent` | `order-group`, `inventory-group` (compensate) |
| `flashhub.order.retry` | `order_id` | `RetryEnvelope<T>` | `order-retry-group` |
| `flashhub.order.dlq` | `order_id` | `DLQEnvelope<T>` | `ops-alert-group` |

> **Quy tắc Message Ordering**: Luôn dùng **`order_id`** làm Kafka Partition Key để tất cả các event của cùng 1 đơn hàng rơi vào cùng 1 Partition, bảo đảm đúng thứ tự xử lý tuyệt đối.

---

### 5.2. Transactional Outbox Pattern
Giải quyết bài toán **Dual-Write** (không thể đảm bảo vừa ghi Database vừa gửi Kafka thành công 100%):

```mermaid
flowchart LR
    subgraph SingleTransaction ["1 Transaction PostgreSQL duy nhất"]
        InsertOrder["INSERT INTO orders (...)"]
        InsertOutbox["INSERT INTO outbox_events (...)"]
    end
    
    InsertOrder --> InsertOutbox
    InsertOutbox --> Poller["Outbox Cron / CDC Debezium"]
    Poller --> KafkaTopic["Kafka Cluster"]
    KafkaTopic --> MarkDone["UPDATE outbox_events SET status = 'PUBLISHED'"]
```

---

### 5.3. Idempotent Consumer Pattern
Kafka đảm bảo *At-Least-Once Delivery*, nghĩa là Consumer có thể nhận 1 message nhiều lần (khi rebalance mạng hoặc crash).
* Bảng lưu trữ: `processed_messages (message_id PK, consumer_group, processed_at)` hoặc dùng Redis `SET key NX EX`.
* Trước khi xử lý event: Kiểm tra `message_id` đã tồn tại chưa. Nếu có rồi ➔ `ACK` ngay và bỏ qua xử lý nghiệp vụ.

---

### 5.4. Retry & Dead Letter Queue (DLQ)
Khi Consumer xử lý lỗi (ví dụ bên Payment timeout):
1. **Lần 1 - 3**: Retry với exponential backoff (đẩy sang topic `flashhub.*.retry`).
2. **Vượt quá số lần**: Đẩy sang `flashhub.*.dlq` để bảo vệ consumer không bị block partition, đồng thời gửi cảnh báo tới hệ thống giám sát.

---

## 6. Cấu Trúc Thư Mục Chuẩn (Clean Architecture trong NestJS)

```text
src/
├── common/                          # Dùng chung toàn hệ thống
│   ├── constants/
│   ├── decorators/                  # @Idempotent, @AuditLog
│   ├── filters/                     # AllExceptionsFilter
│   ├── interceptors/
│   └── kafka/                       # Kafka Client Base, Consumer Decorators
│       ├── kafka.producer.service.ts
│       └── kafka.consumer.abstract.ts
│
├── config/                          # Configuration (Kafka, Database, Redis)
│
├── modules/
│   ├── order/                       # ORDER MODULE
│   │   ├── controllers/             # OrderController (REST API)
│   │   ├── facades/                 # CheckoutFacade
│   │   ├── services/                # OrderService
│   │   ├── builders/                # OrderBuilder
│   │   ├── pipes/validation-chain/  # Chain of Responsibility handlers
│   │   ├── strategies/discount/     # DiscountStrategy implementations
│   │   ├── states/                  # Order State Machine (State Pattern)
│   │   ├── events/                  # OrderCreatedEvent...
│   │   ├── outbox/                  # Outbox Worker & Repository
│   │   └── entities/                # Order & Outbox Entity
│   │
│   ├── inventory/                   # INVENTORY MODULE
│   │   ├── consumers/               # InventoryKafkaConsumer
│   │   ├── services/                # StockReservationService
│   │   ├── commands/                # ReserveStockCommand, ReleaseStockCommand
│   │   └── entities/
│   │
│   ├── payment/                     # PAYMENT MODULE
│   │   ├── consumers/               # PaymentKafkaConsumer
│   │   ├── factories/               # PaymentGatewayFactory
│   │   ├── adapters/                # VNPayAdapter, MomoAdapter, StripeAdapter
│   │   └── interfaces/              # IPaymentGateway
│   │
│   └── notification/                # NOTIFICATION MODULE
│       ├── consumers/               # NotificationKafkaConsumer
│       └── factories/               # NotificationProviderFactory
│
├── app.module.ts
└── main.ts
```

---

## 7. Thiết Kế Cơ Sở Dữ Liệu (Core Schema)

```mermaid
erDiagram
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ OUTBOX_EVENTS : creates
    ORDERS {
        uuid id PK
        uuid user_id
        varchar status "PENDING | RESERVED | PAID | CANCELLED"
        decimal total_amount
        decimal discount_amount
        varchar payment_method
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id
        int quantity
        decimal unit_price
    }

    PRODUCTS_INVENTORY {
        uuid product_id PK
        int total_stock
        int reserved_stock
        int available_stock
        int version "Optimistic Locking"
    }

    OUTBOX_EVENTS {
        uuid id PK
        varchar aggregate_type "ORDER"
        uuid aggregate_id
        varchar event_type "OrderCreated"
        jsonb payload
        varchar status "PENDING | PUBLISHED | FAILED"
        timestamp created_at
    }

    PROCESSED_MESSAGES {
        varchar message_id PK
        varchar consumer_group PK
        timestamp processed_at
    }
```

---

## 8. Lộ Trình Triển Khai Chi Tiết (Implementation Roadmap)

- [x] **Giai đoạn 1: Môi trường & Hạ tầng**
  - Tạo `docker-compose.yml` gồm: Kafka (KRaft mode), Kafka UI, PostgreSQL, Redis.
  - Cấu hình `@nestjs/microservices` hoặc thư viện `kafkajs`.
- [ ] **Giai đoạn 2: Domain Logic & GoF Patterns**
  - Xây dựng `OrderModule` với **Chain of Responsibility** (validate checkout) và **Strategy Pattern** (tính discount).
  - Triển khai **State Pattern** cho quản lý trạng thái đơn hàng.
  - Xây dựng **Payment Factory & Adapters** cho các cổng thanh toán.
- [ ] **Giai đoạn 3: Event-Driven & Outbox Pattern**
  - Viết Transactional Outbox lưu DB và Worker bắn event sang Kafka.
  - Xử lý bài toán Idempotency bằng Redis Decorator.
- [ ] **Giai đoạn 4: Phân Tán & Bù Trừ (Saga Orchestration/Choreography)**
  - Hoàn thiện luồng: `Order` ➔ `Inventory` ➔ `Payment`.
  - Giả lập lỗi thanh toán để kích hoạt luồng hoàn tồn kho (Compensating action).
  - Triển khai cơ chế Non-blocking Retry và Dead Letter Queue (DLQ).

