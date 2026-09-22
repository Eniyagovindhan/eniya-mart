package com.eniyamart.service;

import com.eniyamart.dto.request.CheckoutRequest;
import com.eniyamart.dto.request.OrderItemRequest;
import com.eniyamart.dto.request.ShippingAddress;
import com.eniyamart.dto.response.OrderItemResponse;
import com.eniyamart.dto.response.OrderResponse;
import com.eniyamart.entity.CartItem;
import com.eniyamart.entity.Order;
import com.eniyamart.entity.OrderItem;
import com.eniyamart.entity.Product;
import com.eniyamart.entity.User;
import com.eniyamart.exception.BadRequestException;
import com.eniyamart.exception.OutOfStockException;
import com.eniyamart.exception.ResourceNotFoundException;
import com.eniyamart.repository.CartItemRepository;
import com.eniyamart.repository.OrderRepository;
import com.eniyamart.repository.ProductRepository;
import com.eniyamart.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

/**
 * Checkout, stock decrementing and order history.
 */
@Service
public class OrderService {

    private static final BigDecimal FREE_SHIPPING_THRESHOLD = new BigDecimal("50.00");
    private static final BigDecimal SHIPPING_FEE = new BigDecimal("4.99");

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;

    public OrderService(OrderRepository orderRepository,
                        ProductRepository productRepository,
                        CartItemRepository cartItemRepository,
                        UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.cartItemRepository = cartItemRepository;
        this.userRepository = userRepository;
    }

    /**
     * Places an order.
     * <ul>
     *   <li>When {@code request.items()} is empty the user's cart is used and then cleared.</li>
     *   <li>When {@code request.items()} is present ("Buy Now") only those items are ordered
     *       and the cart is left untouched.</li>
     * </ul>
     */
    @Transactional
    public OrderResponse placeOrder(Long userId, CheckoutRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean fromCart = request.items() == null || request.items().isEmpty();
        Map<Long, Integer> requested = fromCart ? null : mergeRequestedItems(request.items());

        List<CartLine> lines = fromCart ? cartLines(userId) : productLines(requested);
        if (lines.isEmpty()) {
            throw new BadRequestException(fromCart ? "Your cart is empty" : "No items to order");
        }

        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setUser(user);
        order.setPaymentMethod(request.paymentMethod());
        order.setStatus(Order.OrderStatus.PLACED);

        ShippingAddress address = request.address();
        order.setAddressFullName(address.fullName().trim());
        order.setAddressLine1(address.line1().trim());
        order.setAddressLine2(blankToNull(address.line2()));
        order.setCity(address.city().trim());
        order.setState(address.state().trim());
        order.setPincode(address.pincode().trim());
        order.setPhone(address.phone().trim());
        order.setNotes(blankToNull(request.notes()));

        BigDecimal subtotal = BigDecimal.ZERO;

        for (CartLine line : lines) {
            Product product = line.product();
            int stock = product.getStock() == null ? 0 : product.getStock();

            if (line.quantity() > stock) {
                throw new OutOfStockException("Only " + stock + " unit(s) of \"" + product.getName()
                        + "\" are left in stock. Please reduce the quantity.");
            }

            product.setStock(stock - line.quantity());
            productRepository.save(product);

            OrderItem item = new OrderItem(product, line.quantity());
            order.addItem(item);
            subtotal = subtotal.add(item.getTotalPrice());
        }

        BigDecimal shipping = subtotal.compareTo(FREE_SHIPPING_THRESHOLD) >= 0 ? BigDecimal.ZERO : SHIPPING_FEE;
        order.setSubtotal(subtotal);
        order.setShipping(shipping);
        order.setTotal(subtotal.add(shipping));

        order = orderRepository.save(order);

        if (fromCart) {
            cartItemRepository.deleteByUserId(userId);
        }

        return toDto(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> myOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(OrderService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> allOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream().map(OrderService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getByOrderNumber(Long userId, String orderNumber, boolean admin) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));

        if (!admin && (order.getUser() == null || !order.getUser().getId().equals(userId))) {
            throw new AccessDeniedException("This order belongs to another customer");
        }
        return toDto(order);
    }

    /* ------------------------------------------------- seller / admin ops */

    /**
     * Orders that contain at least one product of this seller.
     * Only the seller's own order items are returned (other sellers' lines stay hidden).
     */
    @Transactional(readOnly = true)
    public List<OrderResponse> sellerOrders(Long sellerId) {
        return orderRepository.findBySellerId(sellerId)
                .stream()
                .map(order -> toSellerDto(order, sellerId))
                .toList();
    }

    /** Admin: move an order to the next allowed status. */
    @Transactional
    public OrderResponse updateStatusByAdmin(String orderNumber, String status) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));
        applyTransition(order, status);
        return toDto(orderRepository.save(order));
    }

    /** Seller: move an order that contains this seller's products. */
    @Transactional
    public OrderResponse updateStatusBySeller(Long sellerId, String orderNumber, String status) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));

        boolean mine = order.getItems().stream()
                .anyMatch(item -> item.getProduct() != null
                        && item.getProduct().getSeller() != null
                        && sellerId.equals(item.getProduct().getSeller().getId()));
        if (!mine) {
            throw new ResourceNotFoundException("Order not found: " + orderNumber);
        }

        applyTransition(order, status);
        return toDto(orderRepository.save(order));
    }

    /** PLACED -> CONFIRMED/CANCELLED -> SHIPPED -> DELIVERED (terminal states cannot change). */
    private static final Map<Order.OrderStatus, java.util.Set<Order.OrderStatus>> TRANSITIONS = Map.of(
            Order.OrderStatus.PLACED, java.util.Set.of(Order.OrderStatus.CONFIRMED, Order.OrderStatus.CANCELLED),
            Order.OrderStatus.CONFIRMED, java.util.Set.of(Order.OrderStatus.SHIPPED, Order.OrderStatus.CANCELLED),
            Order.OrderStatus.SHIPPED, java.util.Set.of(Order.OrderStatus.DELIVERED),
            Order.OrderStatus.DELIVERED, java.util.Set.of(),
            Order.OrderStatus.CANCELLED, java.util.Set.of());

    private static void applyTransition(Order order, String rawStatus) {
        Order.OrderStatus target = parseStatus(rawStatus);
        Order.OrderStatus current = order.getStatus();
        if (target == current) {
            throw new BadRequestException("Order is already " + target.name());
        }
        if (!TRANSITIONS.getOrDefault(current, java.util.Set.of()).contains(target)) {
            throw new BadRequestException("Cannot change order status from " + current.name() + " to " + target.name());
        }
        order.setStatus(target);
    }

    private static Order.OrderStatus parseStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            throw new BadRequestException("Status is required");
        }
        try {
            return Order.OrderStatus.valueOf(rawStatus.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unknown order status: " + rawStatus);
        }
    }

    /** Same as {@link #toDto(Order)} but keeps only the items owned by this seller. */
    public static OrderResponse toSellerDto(Order order, Long sellerId) {
        List<OrderItemResponse> items = order.getItems().stream()
                .filter(item -> item.getProduct() != null
                        && item.getProduct().getSeller() != null
                        && sellerId.equals(item.getProduct().getSeller().getId()))
                .map(item -> new OrderItemResponse(
                        item.getId(),
                        item.getProduct().getId(),
                        item.getProductName(),
                        item.getProductImage(),
                        item.getPrice(),
                        item.getQuantity(),
                        item.getTotalPrice()))
                .toList();

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus() == null ? null : order.getStatus().name(),
                order.getPaymentMethod() == null ? null : order.getPaymentMethod().name(),
                order.getSubtotal(),
                order.getShipping(),
                order.getTotal(),
                items,
                order.getAddressFullName(),
                order.getAddressLine1(),
                order.getAddressLine2(),
                order.getCity(),
                order.getState(),
                order.getPincode(),
                order.getPhone(),
                order.getNotes(),
                order.getUser() != null ? order.getUser().getId() : null,
                order.getUser() != null ? order.getUser().getName() : null,
                order.getUser() != null ? order.getUser().getEmail() : null,
                order.getCreatedAt());
    }

    /* ------------------------------------------------------------------ */

    private record CartLine(Product product, int quantity) {
    }

    private List<CartLine> cartLines(Long userId) {
        List<CartItem> cartItems = cartItemRepository.findByUserIdOrderByProductId(userId);
        return cartItems.stream().map(ci -> new CartLine(ci.getProduct(), ci.getQuantity())).toList();
    }

    private Map<Long, Integer> mergeRequestedItems(List<OrderItemRequest> items) {
        Map<Long, Integer> merged = new LinkedHashMap<>();
        for (OrderItemRequest item : items) {
            if (item.productId() == null || item.quantity() == null || item.quantity() < 1) {
                throw new BadRequestException("Every order item needs a valid product and quantity");
            }
            merged.merge(item.productId(), item.quantity(), Integer::sum);
        }
        return merged;
    }

    private List<CartLine> productLines(Map<Long, Integer> requested) {
        return requested.entrySet().stream()
                .map(entry -> {
                    Product product = productRepository.findById(entry.getKey())
                            .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + entry.getKey()));
                    return new CartLine(product, entry.getValue());
                })
                .toList();
    }

    private String generateOrderNumber() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        Random random = new Random();
        String candidate;
        do {
            candidate = "EM-" + date + "-" + String.format("%06d", random.nextInt(1_000_000));
        } while (orderRepository.findByOrderNumber(candidate).isPresent());
        return candidate;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public static OrderResponse toDto(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(item -> new OrderItemResponse(
                        item.getId(),
                        item.getProduct() != null ? item.getProduct().getId() : null,
                        item.getProductName(),
                        item.getProductImage(),
                        item.getPrice(),
                        item.getQuantity(),
                        item.getTotalPrice()))
                .toList();

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus() == null ? null : order.getStatus().name(),
                order.getPaymentMethod() == null ? null : order.getPaymentMethod().name(),
                order.getSubtotal(),
                order.getShipping(),
                order.getTotal(),
                items,
                order.getAddressFullName(),
                order.getAddressLine1(),
                order.getAddressLine2(),
                order.getCity(),
                order.getState(),
                order.getPincode(),
                order.getPhone(),
                order.getNotes(),
                order.getUser() != null ? order.getUser().getId() : null,
                order.getUser() != null ? order.getUser().getName() : null,
                order.getUser() != null ? order.getUser().getEmail() : null,
                order.getCreatedAt());
    }
}
