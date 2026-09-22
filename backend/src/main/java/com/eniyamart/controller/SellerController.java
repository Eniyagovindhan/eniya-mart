package com.eniyamart.controller;

import com.eniyamart.dto.request.ProductRequest;
import com.eniyamart.dto.request.StatusUpdateRequest;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.dto.response.OrderResponse;
import com.eniyamart.dto.response.ProductResponse;
import com.eniyamart.dto.response.SellerStatsResponse;
import com.eniyamart.security.CurrentUser;
import com.eniyamart.service.SellerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Seller dashboard API (ROLE_SELLER enforced by SecurityConfig).
 * Every endpoint is scoped to the logged-in seller's own data.
 */
@RestController
@RequestMapping("/api/seller")
public class SellerController {

    private final SellerService sellerService;
    private final CurrentUser currentUser;

    public SellerController(SellerService sellerService, CurrentUser currentUser) {
        this.sellerService = sellerService;
        this.currentUser = currentUser;
    }

    /* --------------------------------------------------------- products */

    @GetMapping("/products")
    public ResponseEntity<List<ProductResponse>> myProducts() {
        return ResponseEntity.ok(sellerService.products(currentUser.id()));
    }

    @PostMapping("/products")
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductRequest request) {
        ProductResponse product = sellerService.createProduct(currentUser.id(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<ProductResponse> updateProduct(@PathVariable Long id,
                                                         @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(sellerService.updateProduct(currentUser.id(), id, request));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<MessageResponse> deleteProduct(@PathVariable Long id) {
        return ResponseEntity.ok(sellerService.deleteProduct(currentUser.id(), id));
    }

    /* ------------------------------------------------------------ orders */

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponse>> myOrders() {
        return ResponseEntity.ok(sellerService.orders(currentUser.id()));
    }

    @PutMapping("/orders/{orderNumber}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(@PathVariable String orderNumber,
                                                           @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(sellerService.updateOrderStatus(currentUser.id(), orderNumber, request));
    }

    /* ------------------------------------------------------------- stats */

    @GetMapping("/stats")
    public ResponseEntity<SellerStatsResponse> stats() {
        return ResponseEntity.ok(sellerService.stats(currentUser.id()));
    }
}
