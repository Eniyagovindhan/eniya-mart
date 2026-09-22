# ENIYA MART

**Everything You Need. Easy Shopping.**

A complete Amazon-style e-commerce web application.

- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5
- **Backend:** Java 17, Spring Boot 3, Spring Security, JWT, BCrypt, JPA (Hibernate), Maven
- **Database:** MySQL 8

---

## 1. Folder Structure

```
eniya-mart/
│
├── backend/                              Spring Boot REST API + static site server
│   ├── pom.xml                           Maven build (also copies ../frontend into static/)
│   ├── database.sql                      Full schema + demo users + 24 sample products + categories
│   └── src/main/
│       ├── resources/
│       │   └── application.properties    DB, JWT, mail configuration
│       └── java/com/eniyamart/
│           ├── EniyaMartApplication.java     Application entry point
│           ├── config/                       SecurityConfig, JwtConfig, DataSeeder
│           ├── security/                     JwtService, JwtAuthenticationFilter,
│           │                                 UserDetailsServiceImpl, CurrentUser,
│           │                                 RestAuthenticationEntryPoint/AccessDeniedHandler
│           ├── entity/                       User, Product, Order, OrderItem, Category,
│           │                                 CartItem, PasswordResetToken, Role (ADMIN/SELLER/CUSTOMER)
│           ├── repository/                   UserRepository, ProductRepository, CategoryRepository,
│           │                                 OrderRepository, OrderItemRepository,
│           │                                 CartItemRepository, PasswordResetTokenRepository
│           ├── dto/                          Request/response records (RegisterRequest,
│           │                                 LoginRequest, CheckoutRequest, ProductDto, …)
│           ├── service/                      Auth, Product, Cart, Order, Account, Email,
│           │                                 Admin, Seller, Category services
│           ├── controller/                   Auth, Product, Cart, CartCount, Order,
│           │                                 Account, Admin, Seller controllers
│           └── exception/                    GlobalExceptionHandler + custom exceptions
│
├── frontend/                             Static site (served by Spring Boot at /)
│   ├── index.html                        Home: banner, categories, featured products
│   ├── login.html / register.html        Authentication
│   ├── forgot-password.html / reset-password.html
│   ├── products.html                     Search, category filter, price sorting
│   ├── product-details.html              Product page, add to cart / buy now
│   ├── cart.html                         Shopping cart
│   ├── checkout.html                     Address, payment, place order
│   ├── orders.html                       Order ID + order history
│   ├── account.html                      My account / profile
│   ├── customer-dashboard.html           Customer dashboard (stats, recent orders)
│   ├── seller-dashboard.html             Seller hub (products, orders, fulfilment)
│   ├── admin-dashboard.html              Admin console (products, categories,
│   │                                     customers, sellers, orders)
│   ├── 403.html                          Unauthorized page
│   ├── css/style.css                     Amazon-style theme + dashboard styles
│   ├── js/                               api.js (fetch wrapper), main.js (nav/search),
│   │                                     auth.js, home.js, products.js,
│   │                                     product-details.js, cart.js, checkout.js,
│   │                                     orders.js, account.js,
│   │                                     customer-dashboard.js, seller-dashboard.js,
│   │                                     admin-dashboard.js
│   └── assets/images/                    Logo, banner, category & placeholder SVGs
│
└── .vscode/                              VS Code tasks + debug launch config
```

---

## 2. Prerequisites

| Tool     | Version   |
|----------|-----------|
| JDK      | 17+       |
| Maven    | 3.9+      |
| MySQL    | 8.x       |

---

## 3. Database Setup

The app connects to MySQL on `localhost:3306`. Credentials are set in `backend/src/main/resources/application.properties` and can be overridden with the `DB_USERNAME` / `DB_PASSWORD` environment variables. The database `eniya_mart` is created automatically on first run (`createDatabaseIfNotExist=true`), and tables are created via JPA (`ddl-auto=update`).

To create everything manually instead (optional), run:

```bash
mysql -u root -p < backend/database.sql
```

`database.sql` also inserts the demo users (admin, demo customer, demo seller), the 24 sample products and the category list. If you skip it, the app seeds the same data automatically on first start (the seeder is idempotent — it only adds what is missing, so an existing database is upgraded in place).

---

## 4. Run the Project

```bash
mvn -f backend/pom.xml spring-boot:run
```

Then open **http://localhost:8080** — the frontend is packaged as static resources, so the site and the REST API are both served from port 8080.

> Any API call from a `file://` page works too: the JS falls back to `http://localhost:8080/api`.

### Demo accounts

| Role     | Email                 | Password   |
|----------|-----------------------|------------|
| Admin    | admin@eniyamart.com   | Admin@123  |
| Seller   | seller@eniyamart.com  | Seller@123 |
| Customer | demo@eniyamart.com    | Demo@123   |

Self-registration always creates a **CUSTOMER** account; sellers are created by an admin (Admin Console → Sellers). After login each role lands on its own dashboard: `/customer-dashboard.html`, `/seller-dashboard.html` or `/admin-dashboard.html`.

### Forgot password (no SMTP required)

`app.mail.enabled=false` by default. Requesting a reset link logs it to the console **and** returns `devResetUrl` in the API response; the forgot-password page shows the link directly in development mode.

---

## 5. Main REST API

Base URL: `http://localhost:8080/api`

| Method | Endpoint                  | Auth      | Description |
|--------|---------------------------|-----------|-------------|
| POST   | `/auth/register`          | Public    | Create account |
| POST   | `/auth/login`             | Public    | Login → JWT |
| POST   | `/auth/forgot-password`   | Public    | Send/reset link |
| POST   | `/auth/reset-password`    | Public    | Reset with token |
| GET    | `/products`               | Public    | Search + filter (`search`, `category`, `sort`, `minPrice`, `maxPrice`, `page`, `size`) |
| GET    | `/products/featured`      | Public    | Featured products |
| GET    | `/products/categories`    | Public    | Category list |
| GET    | `/products/{id}`          | Public    | Product details |
| POST/PUT/DELETE | `/products/**`  | Admin     | Manage products |
| GET/POST/PUT/DELETE | `/cart/**`  | User      | Server-side cart |
| GET    | `/cart/count`             | User      | Total items in cart (badge helper) |
| POST   | `/orders`                 | User      | Place order (cart or explicit items for Buy Now) |
| GET    | `/orders`                 | User      | Order history |
| GET    | `/orders/{orderNumber}`   | User      | Single order |
| GET/PUT | `/account`                | User      | My account (profile view/update) |
| PUT    | `/account/password`       | User      | Change password |
| GET    | `/seller/products`        | Seller    | Own products |
| POST/PUT/DELETE | `/seller/products/**` | Seller | Manage own products (404 if not owned) |
| GET    | `/seller/orders`          | Seller    | Orders containing own products (own items only) |
| PUT    | `/seller/orders/{orderNumber}/status` | Seller | Advance order status |
| GET    | `/seller/stats`           | Seller    | Dashboard statistics |
| GET    | `/admin/orders`           | Admin     | All orders |
| PUT    | `/admin/orders/{orderNumber}/status` | Admin | Advance order status |
| GET    | `/admin/stats`            | Admin     | Dashboard statistics |
| GET    | `/admin/customers`        | Admin     | List customers |
| PUT    | `/admin/customers/{id}/status` | Admin | Enable/disable a customer |
| GET/POST | `/admin/sellers`        | Admin     | List / create sellers |
| PUT    | `/admin/sellers/{id}/status` | Admin  | Enable/disable a seller |
| GET/POST | `/admin/categories`     | Admin     | List / create categories |
| PUT/DELETE | `/admin/categories/{id}` | Admin   | Rename (updates products) / delete (guarded) |

Errors return JSON: `{ "message": "...", "fieldErrors": { "field": "msg" } }`. Guests hitting protected endpoints receive **401**; wrong role receives **403** (e.g. customer calling `/api/seller/**` or `/api/admin/**`). Order statuses advance as `PLACED → CONFIRMED → SHIPPED → DELIVERED`, with `CANCELLED` allowed before delivery.

---

## 6. VS Code

Open the `eniya-mart` folder in VS Code.

- **Run:** `Terminal → Run Task → 🚀 Run ENIYA MART` (starts `mvn spring-boot:run`).
- **Build:** `Terminal → Run Task → 📦 Build (clean package)`.
- **Debug:** `Run and Debug → 🐞 Debug ENIYA MART` (attaches the debugger after the app starts).

Extensions recommended: *Extension Pack for Java*, *Spring Boot Extension Pack*.

---

## 7. Features

### Roles & dashboards
- Three roles — **CUSTOMER**, **SELLER**, **ADMIN** — enforced by JWT + Spring Security (`hasRole` on `/api/seller/**` and `/api/admin/**`)
- Registration always creates customers; admins create/enable/disable sellers
- **Customer dashboard:** profile, order/cart stats, recent orders
- **Seller hub:** add/edit/delete own products, fulfil orders (confirm → ship → deliver/cancel), own stats
- **Admin console:** products, categories (create/rename/delete), customers, sellers, orders, store statistics
- Role-aware navigation and post-login redirects; wrong role → `403.html`

### Storefront
- Register / Login / Forgot password / Logout with JWT + BCrypt
- Home banner, categories, featured products
- Product search, category filter, price range & sorting, pagination
- Product details with stock-aware Add to Cart / Buy Now
- Server-side cart (persists across devices/sessions)
- Checkout with address & payment validation, free shipping over $50
- Order placement with stock decrement, Order ID (`EM-yyyymmdd-xxxxxx`) and order history
- My Account: profile view/edit, change password
- Loading skeletons, empty states, toasts, form field errors, 401/403 handling
- Fully responsive Amazon-style UI
