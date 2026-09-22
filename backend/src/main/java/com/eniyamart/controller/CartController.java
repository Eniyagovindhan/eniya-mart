package com.eniyamart.controller;

import com.eniyamart.dto.request.CartItemRequest;
import com.eniyamart.dto.request.CartQuantityRequest;
import com.eniyamart.dto.response.CartResponse;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.security.CurrentUser;
import com.eniyamart.service.CartService;
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

/**
 * Shopping cart API (requires a valid JWT - handled by the security filter chain).
 */
@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;
    private final CurrentUser currentUser;

    public CartController(CartService cartService, CurrentUser currentUser) {
        this.cartService = cartService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ResponseEntity<CartResponse> getCart() {
        return ResponseEntity.ok(cartService.getCart(currentUser.id()));
    }

    @PostMapping
    public ResponseEntity<CartResponse> addToCart(@Valid @RequestBody CartItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cartService.addToCart(currentUser.id(), request));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<CartResponse> updateQuantity(@PathVariable Long productId,
                                                       @Valid @RequestBody CartQuantityRequest request) {
        return ResponseEntity.ok(cartService.updateQuantity(currentUser.id(), productId, request.quantity()));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<CartResponse> removeItem(@PathVariable Long productId) {
        return ResponseEntity.ok(cartService.removeItem(currentUser.id(), productId));
    }

    @DeleteMapping
    public ResponseEntity<MessageResponse> clearCart() {
        return ResponseEntity.ok(cartService.clear(currentUser.id()));
    }
}
