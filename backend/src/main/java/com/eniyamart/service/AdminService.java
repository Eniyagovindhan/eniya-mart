package com.eniyamart.service;

import com.eniyamart.dto.request.SellerCreateRequest;
import com.eniyamart.dto.request.UserStatusRequest;
import com.eniyamart.dto.response.AdminStatsResponse;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.dto.response.UserResponse;
import com.eniyamart.entity.Order;
import com.eniyamart.entity.Role;
import com.eniyamart.entity.User;
import com.eniyamart.exception.BadRequestException;
import com.eniyamart.exception.ResourceNotFoundException;
import com.eniyamart.repository.CategoryRepository;
import com.eniyamart.repository.OrderRepository;
import com.eniyamart.repository.ProductRepository;
import com.eniyamart.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

/**
 * Admin management of customers, sellers and dashboard statistics.
 */
@Service
public class AdminService {

    private static final int LOW_STOCK_THRESHOLD = 5;

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(UserRepository userRepository,
                        ProductRepository productRepository,
                        OrderRepository orderRepository,
                        CategoryRepository categoryRepository,
                        PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.categoryRepository = categoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /* ------------------------------------------------------------ users */

    @Transactional(readOnly = true)
    public List<UserResponse> customers() {
        return userRepository.findByRoleOrderByCreatedAtDesc(Role.CUSTOMER).stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> sellers() {
        return userRepository.findByRoleOrderByCreatedAtDesc(Role.SELLER).stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse createSeller(SellerCreateRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email already exists");
        }
        User seller = new User();
        seller.setName(request.name().trim());
        seller.setEmail(email);
        seller.setPassword(passwordEncoder.encode(request.password()));
        seller.setPhone(blankToNull(request.phone()));
        seller.setRole(Role.SELLER);
        seller.setEnabled(true);
        return UserResponse.from(userRepository.save(seller));
    }

    @Transactional
    public UserResponse setCustomerEnabled(Long userId, UserStatusRequest request, Long currentUserId) {
        return setEnabled(userId, request, Role.CUSTOMER, currentUserId);
    }

    @Transactional
    public UserResponse setSellerEnabled(Long userId, UserStatusRequest request, Long currentUserId) {
        return setEnabled(userId, request, Role.SELLER, currentUserId);
    }

    private UserResponse setEnabled(Long userId, UserStatusRequest request, Role expectedRole, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + userId));
        if (user.getRole() != expectedRole) {
            throw new BadRequestException("This account is not a " + expectedRole.name().toLowerCase(Locale.ROOT));
        }
        if (Boolean.FALSE.equals(request.enabled()) && userId.equals(currentUserId)) {
            throw new BadRequestException("You cannot disable your own account");
        }
        user.setEnabled(Boolean.TRUE.equals(request.enabled()));
        return UserResponse.from(userRepository.save(user));
    }

    /* ------------------------------------------------------------ stats */

    @Transactional(readOnly = true)
    public AdminStatsResponse stats() {
        long pending = orderRepository.countByStatus(Order.OrderStatus.PLACED)
                + orderRepository.countByStatus(Order.OrderStatus.CONFIRMED);
        BigDecimal revenue = orderRepository.totalRevenue();
        return new AdminStatsResponse(
                userRepository.findByRoleOrderByCreatedAtDesc(Role.CUSTOMER).size(),
                userRepository.findByRoleOrderByCreatedAtDesc(Role.SELLER).size(),
                productRepository.count(),
                categoryRepository.count(),
                orderRepository.count(),
                pending,
                revenue == null ? BigDecimal.ZERO : revenue);
    }

    /* ----------------------------------------------------------- helper */

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
