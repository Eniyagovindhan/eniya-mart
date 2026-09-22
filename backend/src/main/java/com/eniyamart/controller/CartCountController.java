package com.eniyamart.controller;

import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.security.CurrentUser;
import com.eniyamart.service.CartService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Small helper used by the navigation bar cart badge.
 */
@RestController
@RequestMapping("/api/cart/count")
public class CartCountController {

    private final CartService cartService;
    private final CurrentUser currentUser;

    public CartCountController(CartService cartService, CurrentUser currentUser) {
        this.cartService = cartService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ResponseEntity<MessageResponse> count() {
        return ResponseEntity.ok(MessageResponse.of(String.valueOf(cartService.totalItems(currentUser.id()))));
    }
}
