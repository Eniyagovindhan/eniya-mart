package com.eniyamart.controller;

import com.eniyamart.dto.request.CategoryRequest;
import com.eniyamart.dto.request.SellerCreateRequest;
import com.eniyamart.dto.request.StatusUpdateRequest;
import com.eniyamart.dto.request.UserStatusRequest;
import com.eniyamart.dto.response.AdminStatsResponse;
import com.eniyamart.dto.response.CategoryResponse;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.dto.response.OrderResponse;
import com.eniyamart.dto.response.UserResponse;
import com.eniyamart.security.CurrentUser;
import com.eniyamart.service.AdminService;
import com.eniyamart.service.CategoryService;
import com.eniyamart.service.OrderService;
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
 * Admin dashboard API: orders, customers, sellers, categories and statistics
 * (ROLE_ADMIN enforced by SecurityConfig).
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final OrderService orderService;
    private final AdminService adminService;
    private final CategoryService categoryService;
    private final CurrentUser currentUser;

    public AdminController(OrderService orderService,
                           AdminService adminService,
                           CategoryService categoryService,
                           CurrentUser currentUser) {
        this.orderService = orderService;
        this.adminService = adminService;
        this.categoryService = categoryService;
        this.currentUser = currentUser;
    }

    /* ------------------------------------------------------------ orders */

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponse>> allOrders() {
        return ResponseEntity.ok(orderService.allOrders());
    }

    @PutMapping("/orders/{orderNumber}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(@PathVariable String orderNumber,
                                                           @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(orderService.updateStatusByAdmin(orderNumber, request.status()));
    }

    /* --------------------------------------------------------- customers */

    @GetMapping("/customers")
    public ResponseEntity<List<UserResponse>> customers() {
        return ResponseEntity.ok(adminService.customers());
    }

    @PutMapping("/customers/{id}/status")
    public ResponseEntity<UserResponse> setCustomerStatus(@PathVariable Long id,
                                                          @Valid @RequestBody UserStatusRequest request) {
        return ResponseEntity.ok(adminService.setCustomerEnabled(id, request, currentUser.id()));
    }

    /* ------------------------------------------------------------ sellers */

    @GetMapping("/sellers")
    public ResponseEntity<List<UserResponse>> sellers() {
        return ResponseEntity.ok(adminService.sellers());
    }

    @PostMapping("/sellers")
    public ResponseEntity<UserResponse> createSeller(@Valid @RequestBody SellerCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createSeller(request));
    }

    @PutMapping("/sellers/{id}/status")
    public ResponseEntity<UserResponse> setSellerStatus(@PathVariable Long id,
                                                        @Valid @RequestBody UserStatusRequest request) {
        return ResponseEntity.ok(adminService.setSellerEnabled(id, request, currentUser.id()));
    }

    /* --------------------------------------------------------- categories */

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryResponse>> categories() {
        return ResponseEntity.ok(categoryService.list());
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(request));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<CategoryResponse> renameCategory(@PathVariable Long id,
                                                           @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.rename(id, request));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<MessageResponse> deleteCategory(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.delete(id));
    }

    /* -------------------------------------------------------------- stats */

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> stats() {
        return ResponseEntity.ok(adminService.stats());
    }

    /** Admin test endpoint - proves role based access is enforced. */
    @GetMapping("/ping")
    public ResponseEntity<MessageResponse> ping() {
        return ResponseEntity.ok(MessageResponse.of("Hello admin " + currentUser.entity().getName()));
    }
}
