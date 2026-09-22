package com.eniyamart.service;

import com.eniyamart.dto.request.ProductRequest;
import com.eniyamart.dto.request.StatusUpdateRequest;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.dto.response.OrderResponse;
import com.eniyamart.dto.response.ProductResponse;
import com.eniyamart.dto.response.SellerStatsResponse;
import com.eniyamart.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

/**
 * Seller dashboard operations: own product CRUD, own order fulfilment
 * and dashboard statistics. Every query is scoped to the seller id.
 */
@Service
public class SellerService {

    private static final int LOW_STOCK_THRESHOLD = 5;
    private static final Set<String> PENDING_STATUSES = Set.of("PLACED", "CONFIRMED");

    private final ProductService productService;
    private final OrderService orderService;
    private final ProductRepository productRepository;

    public SellerService(ProductService productService,
                         OrderService orderService,
                         ProductRepository productRepository) {
        this.productService = productService;
        this.orderService = orderService;
        this.productRepository = productRepository;
    }

    /* ---------------------------------------------------------- products */

    @Transactional(readOnly = true)
    public List<ProductResponse> products(Long sellerId) {
        return productService.sellerProducts(sellerId);
    }

    @Transactional
    public ProductResponse createProduct(Long sellerId, ProductRequest request) {
        return productService.createAsSeller(sellerId, request);
    }

    @Transactional
    public ProductResponse updateProduct(Long sellerId, Long productId, ProductRequest request) {
        return productService.updateAsSeller(sellerId, productId, request);
    }

    @Transactional
    public MessageResponse deleteProduct(Long sellerId, Long productId) {
        return productService.deleteAsSeller(sellerId, productId);
    }

    /* ------------------------------------------------------------- orders */

    @Transactional(readOnly = true)
    public List<OrderResponse> orders(Long sellerId) {
        return orderService.sellerOrders(sellerId);
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long sellerId, String orderNumber, StatusUpdateRequest request) {
        return orderService.updateStatusBySeller(sellerId, orderNumber, request.status());
    }

    /* ------------------------------------------------------------- stats */

    @Transactional(readOnly = true)
    public SellerStatsResponse stats(Long sellerId) {
        long products = productRepository.countBySellerId(sellerId);
        long lowStock = productRepository.countBySellerIdAndStockLessThanEqual(sellerId, LOW_STOCK_THRESHOLD);

        List<OrderResponse> orders = orderService.sellerOrders(sellerId);

        long pending = orders.stream()
                .map(OrderResponse::status)
                .filter(PENDING_STATUSES::contains)
                .count();

        long unitsSold = 0;
        BigDecimal revenue = BigDecimal.ZERO;
        for (OrderResponse order : orders) {
            if ("CANCELLED".equals(order.status())) {
                continue;
            }
            for (var item : order.items()) {
                unitsSold += item.quantity() == null ? 0 : item.quantity();
                if (item.totalPrice() != null) {
                    revenue = revenue.add(item.totalPrice());
                }
            }
        }

        return new SellerStatsResponse(products, lowStock, pending, unitsSold, revenue);
    }
}
