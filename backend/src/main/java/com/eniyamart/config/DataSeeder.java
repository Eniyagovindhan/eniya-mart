package com.eniyamart.config;

import com.eniyamart.entity.Product;
import com.eniyamart.entity.Role;
import com.eniyamart.entity.User;
import com.eniyamart.repository.ProductRepository;
import com.eniyamart.repository.UserRepository;
import com.eniyamart.service.CategoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;

/**
 * Seeds demo users and the sample catalogue so the shop works out of the box
 * even if database.sql was not executed. Safe to run repeatedly - every step
 * checks first (idempotent), so an existing database is upgraded in place:
 * <ul>
 *   <li>missing demo accounts are created (admin / demo customer / demo seller)</li>
 *   <li>products are seeded only when the table is empty</li>
 *   <li>on the first run after the 3-role upgrade, half of the products are
 *       assigned to the demo seller so the seller dashboard has data</li>
 *   <li>the categories table is synced from the product categories</li>
 * </ul>
 *
 * <pre>
 * Admin  : admin@eniyamart.com  / Admin@123   (ADMIN)
 * Demo   : demo@eniyamart.com   / Demo@123    (CUSTOMER)
 * Seller : seller@eniyamart.com / Seller@123  (SELLER)
 * </pre>
 */
@Configuration
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final PasswordEncoder passwordEncoder;

    public DataSeeder(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Bean
    public CommandLineRunner seedDatabase(UserRepository userRepository,
                                          ProductRepository productRepository,
                                          CategoryService categoryService) {
        return args -> {
            // ---- demo accounts (created only if missing) ----
            User admin = ensureUser(userRepository, "Eniya Admin", "admin@eniyamart.com", "Admin@123", "+1 555 010 1000", Role.ADMIN);
            User demo = ensureUser(userRepository, "Demo Customer", "demo@eniyamart.com", "Demo@123", "+1 555 010 2000", Role.CUSTOMER);
            User seller = ensureUser(userRepository, "Nova Store", "seller@eniyamart.com", "Seller@123", "+1 555 010 3000", Role.SELLER);

            // ---- sample catalogue ----
            if (productRepository.count() == 0) {
                productRepository.saveAll(sampleProducts());
                log.info("Seeded {} sample products", productRepository.count());
            }

            // ---- first run after the 3-role upgrade: give the demo seller a catalogue ----
            List<Product> allProducts = productRepository.findAll();
            boolean anyOwned = allProducts.stream().anyMatch(p -> p.getSeller() != null);
            if (!anyOwned && !allProducts.isEmpty()) {
                int i = 0;
                for (Product product : allProducts) {
                    if (i++ % 2 == 0) {
                        product.setSeller(seller);
                    }
                }
                productRepository.saveAll(allProducts);
                log.info("Assigned {} of {} products to demo seller {}", (allProducts.size() + 1) / 2,
                        allProducts.size(), seller.getEmail());
            }

            // ---- categories table stays in sync with product categories ----
            categoryService.syncFromProducts();

            log.info("Demo accounts - admin: {} / Admin@123 | customer: {} / Demo@123 | seller: {} / Seller@123",
                    admin.getEmail(), demo.getEmail(), seller.getEmail());
        };
    }

    /** Creates the account when the email does not exist yet; returns the (possibly existing) user. */
    private User ensureUser(UserRepository userRepository, String name, String email,
                            String rawPassword, String phone, Role role) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User user = new User();
            user.setName(name);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setPhone(phone);
            user.setRole(role);
            user.setEnabled(true);
            User saved = userRepository.save(user);
            log.info("Seeded {} account {}", role, email);
            return saved;
        });
    }

    private static final String IMG = "/assets/images/categories/";

    private List<Product> sampleProducts() {
        return List.of(
                // ------------------------- Electronics -------------------------
                p("Nova X2 Smartphone 5G", "6.6\" AMOLED display, 128GB storage, 5000mAh battery and a pro-grade triple camera.", "Nova", "Electronics", "699.00", "649.00", 25, IMG + "electronics.svg", "4.5", 1284, true),
                p("Zenith 43\" 4K Smart TV", "Ultra HD smart TV with built-in streaming apps, HDR10 and immersive stereo sound.", "Zenith", "Electronics", "429.00", "379.00", 14, IMG + "electronics.svg", "4.3", 862, true),
                p("PulsePods Wireless Earbuds", "Noise cancelling earbuds with 30-hour battery, Bluetooth 5.3 and wireless charging case.", "PulseAudio", "Electronics", "59.99", "49.99", 120, IMG + "electronics.svg", "4.4", 3210, false),

                // -------------------------- Clothing ---------------------------
                p("Classic Cotton Casual Shirt", "Breathable 100% cotton shirt with a modern fit - perfect for work or weekend.", "UrbanWeave", "Clothing", "34.99", "29.99", 60, IMG + "clothing.svg", "4.2", 540, false),
                p("Everyday Slim Fit Jeans", "Stretch denim jeans that keep their shape wash after wash.", "DenimCo", "Clothing", "49.99", "39.99", 45, IMG + "clothing.svg", "4.1", 430, true),
                p("Winter Fleece Hoodie", "Ultra-soft fleece hoodie with kangaroo pocket and drawstring hood.", "Norrland", "Clothing", "44.99", null, 38, IMG + "clothing.svg", "4.5", 289, false),

                // ------------------------- Groceries ---------------------------
                p("Organic Arabica Coffee Beans 1kg", "Medium roast whole beans with notes of chocolate and hazelnut. 100% organic.", "BrewCraft", "Groceries", "18.99", "15.99", 80, IMG + "groceries.svg", "4.6", 950, true),
                p("Extra Virgin Olive Oil 750ml", "Cold pressed olive oil from mediterranean olives - ideal for salads and cooking.", "TerraOliva", "Groceries", "12.49", null, 95, IMG + "groceries.svg", "4.4", 610, false),
                p("Wholegrain Breakfast Cereal 500g", "High fibre, low sugar cereal made with whole grains for a healthy start.", "GoldenField", "Groceries", "5.99", null, 150, IMG + "groceries.svg", "4.0", 320, false),

                // --------------------------- Books -----------------------------
                p("The Silent Meridian (Paperback)", "An award winning novel about friendship, distance and second chances.", "BlueLeaf Publishing", "Books", "16.99", "13.99", 55, IMG + "books.svg", "4.7", 1840, true),
                p("Python Programming Masterclass 3rd Ed.", "From beginner to job ready: 600 pages of practical Python with real projects.", "BlueLeaf Publishing", "Books", "39.99", "32.99", 40, IMG + "books.svg", "4.6", 2260, false),
                p("The Art of Simple Investing", "A jargon free guide to building long term wealth with index funds.", "GreenPage Books", "Books", "21.50", null, 30, IMG + "books.svg", "4.2", 470, false),

                // -------------------------- Footwear ---------------------------
                p("Sprint Pro Running Shoes", "Lightweight running shoes with responsive cushioning and breathable mesh.", "Velocity", "Footwear", "79.99", "64.99", 70, IMG + "footwear.svg", "4.5", 1520, true),
                p("Leather Casual Loafers", "Hand finished genuine leather loafers with a cushioned insole.", "Milano Steps", "Footwear", "69.00", "59.00", 35, IMG + "footwear.svg", "4.2", 380, false),
                p("TrailMax Hiking Boots", "Waterproof hiking boots with rugged grip for mountain trails.", "TerraGrip", "Footwear", "99.99", null, 25, IMG + "footwear.svg", "4.6", 640, false),

                // ---------------------- Home Appliances ------------------------
                p("AeroCirc 2000W Air Fryer", "8 litre air fryer with 8 presets, digital touch screen and dishwasher safe basket.", "HomeCore", "Home Appliances", "119.00", "99.00", 30, IMG + "appliances.svg", "4.6", 2110, true),
                p("SwiftClean Robotic Vacuum", "Self charging robot vacuum with app control and automatic carpet boost.", "HomeCore", "Home Appliances", "249.00", "219.00", 18, IMG + "appliances.svg", "4.3", 990, false),
                p("TurboMix 1200W Mixer Grinder", "3 stainless steel jars, overload protection and 4 speed control.", "KitchenPro", "Home Appliances", "74.99", null, 42, IMG + "appliances.svg", "4.1", 730, false),

                // -------------------------- Beauty -----------------------------
                p("Hydrating Face Moisture Cream 50ml", "Lightweight daily moisturiser with hyaluronic acid for all skin types.", "GlowLab", "Beauty", "24.99", "19.99", 90, IMG + "beauty.svg", "4.4", 1780, true),
                p("Vitamin C Brightening Serum 30ml", "15% vitamin C serum that fades dark spots and evens skin tone.", "GlowLab", "Beauty", "29.99", "25.99", 65, IMG + "beauty.svg", "4.5", 1440, false),
                p("Nourishing Argan Hair Oil 100ml", "Frizz controlling, heat protecting hair oil with pure argan extract.", "SilkRoot", "Beauty", "17.49", null, 75, IMG + "beauty.svg", "4.3", 860, false),

                // ------------------------ Accessories --------------------------
                p("Leather RFID Wallet", "Slim bifold wallet with RFID blocking and 8 card slots.", "CarryAll", "Accessories", "27.99", "22.99", 110, IMG + "accessories.svg", "4.3", 520, false),
                p("Stainless Steel Chrono Watch", "Classic chronograph watch with sapphire glass and 5ATM water resistance.", "TimeHaus", "Accessories", "129.00", "109.00", 22, IMG + "accessories.svg", "4.5", 730, true),
                p("USB-C 10-in-1 Hub Adapter", "HDMI 4K, 2x USB 3.0, SD, TF, ethernet and 100W power delivery.", "TechBridge", "Accessories", "44.99", "37.99", 58, IMG + "accessories.svg", "4.4", 690, false));
    }

    private Product p(String name, String description, String brand, String category,
                      String price, String discountPrice, int stock, String imageUrl,
                      String rating, int reviews, boolean featured) {
        Product product = new Product();
        product.setName(name);
        product.setDescription(description);
        product.setBrand(brand);
        product.setCategory(category);
        product.setPrice(new BigDecimal(price));
        product.setDiscountPrice(discountPrice == null ? null : new BigDecimal(discountPrice));
        product.setStock(stock);
        product.setImageUrl(imageUrl);
        product.setRating(new BigDecimal(rating).doubleValue());
        product.setReviewsCount(reviews);
        product.setFeatured(featured);
        return product;
    }
}
