package com.eniyamart.service;

import com.eniyamart.dto.request.AccountUpdateRequest;
import com.eniyamart.dto.request.ChangePasswordRequest;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.dto.response.UserResponse;
import com.eniyamart.entity.User;
import com.eniyamart.exception.BadRequestException;
import com.eniyamart.exception.ResourceNotFoundException;
import com.eniyamart.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "My Account" operations.
 */
@Service
public class AccountService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public UserResponse getProfile(Long userId) {
        return UserResponse.from(requireUser(userId));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, AccountUpdateRequest request) {
        User user = requireUser(userId);
        user.setName(request.name().trim());
        user.setPhone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim());
        user = userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public MessageResponse changePassword(Long userId, ChangePasswordRequest request) {
        User user = requireUser(userId);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadRequestException("Your current password is incorrect");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new BadRequestException("The new password must be different from the current one");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        return MessageResponse.of("Your password has been changed successfully");
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
