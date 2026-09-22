-- =====================================================================
--  ENIYA MART  -  "Everything You Need. Easy Shopping."
--  MySQL 8 database script
--
--  Usage:
--    mysql -u root -p < database.sql
--    (or run it from MySQL Workbench / DBeaver)
--
--  NOTE: You can also skip this file - the Spring Boot application
--  creates the schema automatically (spring.jpa.hibernate.ddl-auto=update)
--  and seeds the demo users + sample products when the tables are empty.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS eniya_mart
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE eniya_mart;

-- ---------------------------------------------------------------------
-- 1. USERS  (login / registration / my account)
--    role: 'CUSTOMER' (self registration) | 'SELLER' (created by admin)
--          | 'ADMIN'
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(80)  NOT NULL,
    email      VARCHAR(150) NOT NULL,
    password   VARCHAR(255) NOT NULL COMMENT 'BCrypt hash',
    phone      VARCHAR(20)  NULL,
    role       VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    enabled    TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Demo accounts (password is BCrypt hashed)
--   admin@eniyamart.com  / Admin@123   (ADMIN)
--   demo@eniyamart.com   / Demo@123    (CUSTOMER)
--   seller@eniyamart.com / Seller@123  (SELLER)
INSERT INTO users (name, email, password, phone, role, enabled)
SELECT 'Eniya Admin', 'admin@eniyamart.com',
       '$2b$10$Htn5p9dOIjJvQakpDoMsmOPeTOx0I82CZQL5lAOy.93ip/Xv8ymAS',
       '+1 555 010 1000', 'ADMIN', 1
WHERE NOT EXISTS(SELECT 1 FROM users WHERE email = 'admin@eniyamart.com');

INSERT INTO users (name, email, password, phone, role, enabled)
SELECT 'Demo Customer', 'demo@eniyamart.com',
       '$2b$10$eUZwGfAw2Sy2PmQcudOXTObbfKaIcmulTPEv3WR0i.AG5bjDuEGZS',
       '+1 555 010 2000', 'CUSTOMER', 1
WHERE NOT EXISTS(SELECT 1 FROM users WHERE email = 'demo@eniyamart.com');

INSERT INTO users (name, email, password, phone, role, enabled)
SELECT 'Nova Store', 'seller@eniyamart.com',
       '$2b$10$4xS0cw4gk/ZiOfzq7J1qf.lv4Akv776YWl4.LyzoPChg.jwIEpy66',
       '+1 555 010 3000', 'SELLER', 1
WHERE NOT EXISTS(SELECT 1 FROM users WHERE email = 'seller@eniyamart.com');

-- ---------------------------------------------------------------------
-- 2. PRODUCTS  (catalog: search / category / price filter / sort)
--    seller_id = owning seller, NULL = sold by the store (admin owned)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    name           VARCHAR(150)  NOT NULL,
    description    TEXT          NULL,
    brand          VARCHAR(80)   NULL,
    category       VARCHAR(60)   NOT NULL,
    price          DECIMAL(12, 2) NOT NULL,
    discount_price DECIMAL(12, 2) NULL,
    stock          INT           NOT NULL DEFAULT 0,
    image_url      VARCHAR(500)  NULL,
    rating         DECIMAL(3, 2) NULL,
    reviews_count  INT           NULL,
    featured       TINYINT(1)    NOT NULL DEFAULT 0,
    seller_id      BIGINT        NULL,
    created_at     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_products_category (category),
    KEY idx_products_featured (featured),
    KEY idx_products_price (price),
    KEY idx_products_seller (seller_id),
    CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Upgrade helper: adds products.seller_id when running this script on an
-- existing database that was created before the 3-role release.
-- (no-op when the column already exists)
SET @upgrade_sql := (
    SELECT IF(COUNT(*) = 0,
              'ALTER TABLE products ADD COLUMN seller_id BIGINT NULL, ADD KEY idx_products_seller (seller_id)',
              'SELECT 1')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'eniya_mart'
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'seller_id'
);
PREPARE upgrade_stmt FROM @upgrade_sql;
EXECUTE upgrade_stmt;
DEALLOCATE PREPARE upgrade_stmt;

INSERT INTO products (name, description, brand, category, price, discount_price, stock, image_url, rating, reviews_count, featured)
SELECT * FROM (
    -- Electronics
    SELECT 'Nova X2 Smartphone 5G' AS n, '6.6" AMOLED display, 128GB storage, 5000mAh battery and a pro-grade triple camera.' AS d, 'Nova' AS b, 'Electronics' AS c, 699.00 AS p, 649.00 AS dp, 25 AS s, '/assets/images/categories/electronics.svg' AS img, 4.5 AS r, 1284 AS rc, 1 AS f
    UNION ALL SELECT 'Zenith 43" 4K Smart TV', 'Ultra HD smart TV with built-in streaming apps, HDR10 and immersive stereo sound.', 'Zenith', 'Electronics', 429.00, 379.00, 14, '/assets/images/categories/electronics.svg', 4.3, 862, 1
    UNION ALL SELECT 'PulsePods Wireless Earbuds', 'Noise cancelling earbuds with 30-hour battery, Bluetooth 5.3 and wireless charging case.', 'PulseAudio', 'Electronics', 59.99, 49.99, 120, '/assets/images/categories/electronics.svg', 4.4, 3210, 0
    -- Clothing
    UNION ALL SELECT 'Classic Cotton Casual Shirt', 'Breathable 100% cotton shirt with a modern fit - perfect for work or weekend.', 'UrbanWeave', 'Clothing', 34.99, 29.99, 60, '/assets/images/categories/clothing.svg', 4.2, 540, 0
    UNION ALL SELECT 'Everyday Slim Fit Jeans', 'Stretch denim jeans that keep their shape wash after wash.', 'DenimCo', 'Clothing', 49.99, 39.99, 45, '/assets/images/categories/clothing.svg', 4.1, 430, 1
    UNION ALL SELECT 'Winter Fleece Hoodie', 'Ultra-soft fleece hoodie with kangaroo pocket and drawstring hood.', 'Norrland', 'Clothing', 44.99, NULL, 38, '/assets/images/categories/clothing.svg', 4.5, 289, 0
    -- Groceries
    UNION ALL SELECT 'Organic Arabica Coffee Beans 1kg', 'Medium roast whole beans with notes of chocolate and hazelnut. 100% organic.', 'BrewCraft', 'Groceries', 18.99, 15.99, 80, '/assets/images/categories/groceries.svg', 4.6, 950, 1
    UNION ALL SELECT 'Extra Virgin Olive Oil 750ml', 'Cold pressed olive oil from mediterranean olives - ideal for salads and cooking.', 'TerraOliva', 'Groceries', 12.49, NULL, 95, '/assets/images/categories/groceries.svg', 4.4, 610, 0
    UNION ALL SELECT 'Wholegrain Breakfast Cereal 500g', 'High fibre, low sugar cereal made with whole grains for a healthy start.', 'GoldenField', 'Groceries', 5.99, NULL, 150, '/assets/images/categories/groceries.svg', 4.0, 320, 0
    -- Books
    UNION ALL SELECT 'The Silent Meridian (Paperback)', 'An award winning novel about friendship, distance and second chances.', 'BlueLeaf Publishing', 'Books', 16.99, 13.99, 55, '/assets/images/categories/books.svg', 4.7, 1840, 1
    UNION ALL SELECT 'Python Programming Masterclass 3rd Ed.', 'From beginner to job ready: 600 pages of practical Python with real projects.', 'BlueLeaf Publishing', 'Books', 39.99, 32.99, 40, '/assets/images/categories/books.svg', 4.6, 2260, 0
    UNION ALL SELECT 'The Art of Simple Investing', 'A jargon free guide to building long term wealth with index funds.', 'GreenPage Books', 'Books', 21.50, NULL, 30, '/assets/images/categories/books.svg', 4.2, 470, 0
    -- Footwear
    UNION ALL SELECT 'Sprint Pro Running Shoes', 'Lightweight running shoes with responsive cushioning and breathable mesh.', 'Velocity', 'Footwear', 79.99, 64.99, 70, '/assets/images/categories/footwear.svg', 4.5, 1520, 1
    UNION ALL SELECT 'Leather Casual Loafers', 'Hand finished genuine leather loafers with a cushioned insole.', 'Milano Steps', 'Footwear', 69.00, 59.00, 35, '/assets/images/categories/footwear.svg', 4.2, 380, 0
    UNION ALL SELECT 'TrailMax Hiking Boots', 'Waterproof hiking boots with rugged grip for mountain trails.', 'TerraGrip', 'Footwear', 99.99, NULL, 25, '/assets/images/categories/footwear.svg', 4.6, 640, 0
    -- Home Appliances
    UNION ALL SELECT 'AeroCirc 2000W Air Fryer', '8 litre air fryer with 8 presets, digital touch screen and dishwasher safe basket.', 'HomeCore', 'Home Appliances', 119.00, 99.00, 30, '/assets/images/categories/appliances.svg', 4.6, 2110, 1
    UNION ALL SELECT 'SwiftClean Robotic Vacuum', 'Self charging robot vacuum with app control and automatic carpet boost.', 'HomeCore', 'Home Appliances', 249.00, 219.00, 18, '/assets/images/categories/appliances.svg', 4.3, 990, 0
    UNION ALL SELECT 'TurboMix 1200W Mixer Grinder', '3 stainless steel jars, overload protection and 4 speed control.', 'KitchenPro', 'Home Appliances', 74.99, NULL, 42, '/assets/images/categories/appliances.svg', 4.1, 730, 0
    -- Beauty
    UNION ALL SELECT 'Hydrating Face Moisture Cream 50ml', 'Lightweight daily moisturiser with hyaluronic acid for all skin types.', 'GlowLab', 'Beauty', 24.99, 19.99, 90, '/assets/images/categories/beauty.svg', 4.4, 1780, 1
    UNION ALL SELECT 'Vitamin C Brightening Serum 30ml', '15% vitamin C serum that fades dark spots and evens skin tone.', 'GlowLab', 'Beauty', 29.99, 25.99, 65, '/assets/images/categories/beauty.svg', 4.5, 1440, 0
    UNION ALL SELECT 'Nourishing Argan Hair Oil 100ml', 'Frizz controlling, heat protecting hair oil with pure argan extract.', 'SilkRoot', 'Beauty', 17.49, NULL, 75, '/assets/images/categories/beauty.svg', 4.3, 860, 0
    -- Accessories
    UNION ALL SELECT 'Leather RFID Wallet', 'Slim bifold wallet with RFID blocking and 8 card slots.', 'CarryAll', 'Accessories', 27.99, 22.99, 110, '/assets/images/categories/accessories.svg', 4.3, 520, 0
    UNION ALL SELECT 'Stainless Steel Chrono Watch', 'Classic chronograph watch with sapphire glass and 5ATM water resistance.', 'TimeHaus', 'Accessories', 129.00, 109.00, 22, '/assets/images/categories/accessories.svg', 4.5, 730, 1
    UNION ALL SELECT 'USB-C 10-in-1 Hub Adapter', 'HDMI 4K, 2x USB 3.0, SD, TF, ethernet and 100W power delivery.', 'TechBridge', 'Accessories', 44.99, 37.99, 58, '/assets/images/categories/accessories.svg', 4.4, 690, 0
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM products);

-- First run after the 3-role release: hand half of the catalogue to the
-- demo seller so the seller dashboard has data (skipped when any product
-- already has an owner).
SET @any_owned := (SELECT COUNT(*) FROM products WHERE seller_id IS NOT NULL);
UPDATE products p
JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM products) x ON x.id = p.id
SET p.seller_id = (SELECT id FROM users WHERE email = 'seller@eniyamart.com')
WHERE @any_owned = 0
  AND p.seller_id IS NULL
  AND x.rn % 2 = 1
  AND EXISTS (SELECT 1 FROM users WHERE email = 'seller@eniyamart.com');

-- ---------------------------------------------------------------------
-- 3. ORDERS  (one row per checkout, belongs to a user)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                BIGINT         NOT NULL AUTO_INCREMENT,
    order_number      VARCHAR(40)    NOT NULL,
    user_id           BIGINT         NOT NULL,
    subtotal          DECIMAL(12, 2) NOT NULL,
    shipping          DECIMAL(12, 2) NOT NULL,
    total             DECIMAL(12, 2) NOT NULL,
    status            VARCHAR(20)    NOT NULL DEFAULT 'PLACED',
    payment_method    VARCHAR(20)    NOT NULL DEFAULT 'COD',
    address_full_name VARCHAR(100)   NULL,
    address_line1     VARCHAR(200)   NULL,
    address_line2     VARCHAR(200)   NULL,
    city              VARCHAR(80)    NULL,
    state             VARCHAR(80)    NULL,
    pincode           VARCHAR(12)    NULL,
    phone             VARCHAR(20)    NULL,
    notes             VARCHAR(500)   NULL,
    created_at        DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_orders_order_number (order_number),
    KEY idx_orders_user (user_id),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. ORDER ITEMS  (products inside an order - snapshot of name/price)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id            BIGINT         NOT NULL AUTO_INCREMENT,
    order_id      BIGINT         NOT NULL,
    product_id    BIGINT         NOT NULL,
    product_name  VARCHAR(150)   NOT NULL,
    product_image VARCHAR(500)   NULL,
    price         DECIMAL(12, 2) NOT NULL,
    quantity      INT            NOT NULL,
    total_price   DECIMAL(12, 2) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_product (product_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. CART ITEMS  (one server side cart per user)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
    id         BIGINT NOT NULL AUTO_INCREMENT,
    user_id    BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity   INT    NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cart_user_product (user_id, product_id),
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. PASSWORD RESET TOKENS  (forgot password flow)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    token       VARCHAR(100) NOT NULL,
    user_id     BIGINT       NOT NULL,
    expiry_date DATETIME(6)  NOT NULL,
    used        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_password_reset_tokens_token (token),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. CATEGORIES  (admin managed category names)
--    Products keep storing the category name as a string; this table is
--    the admin-editable list (rename also updates every product).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    name       VARCHAR(60) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_categories_name (name)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

INSERT INTO categories (name)
SELECT * FROM (
    SELECT 'Electronics'
    UNION ALL SELECT 'Clothing'
    UNION ALL SELECT 'Groceries'
    UNION ALL SELECT 'Books'
    UNION ALL SELECT 'Footwear'
    UNION ALL SELECT 'Home Appliances'
    UNION ALL SELECT 'Beauty'
    UNION ALL SELECT 'Accessories'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM categories);
