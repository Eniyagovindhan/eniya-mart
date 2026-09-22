package com.eniyamart.controller;

import com.eniyamart.dto.request.AccountUpdateRequest;
import com.eniyamart.dto.request.ChangePasswordRequest;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.dto.response.UserResponse;
import com.eniyamart.security.CurrentUser;
import com.eniyamart.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * "My Account" API - always scoped to the authenticated user.
 */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final AccountService accountService;
    private final CurrentUser currentUser;

    public AccountController(AccountService accountService, CurrentUser currentUser) {
        this.accountService = accountService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ResponseEntity<UserResponse> profile() {
        return ResponseEntity.ok(accountService.getProfile(currentUser.id()));
    }

    @PutMapping
    public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody AccountUpdateRequest request) {
        return ResponseEntity.ok(accountService.updateProfile(currentUser.id(), request));
    }

    @PutMapping("/password")
    public ResponseEntity<MessageResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(accountService.changePassword(currentUser.id(), request));
    }
}
