package com.eniyamart.security;

import com.eniyamart.entity.User;
import com.eniyamart.exception.ResourceNotFoundException;
import com.eniyamart.exception.UnauthorizedException;
import com.eniyamart.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Resolves the currently authenticated user from the SecurityContext.
 */
@Component
public class CurrentUser {

    private final UserRepository userRepository;

    public CurrentUser(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public static String currentEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            throw new UnauthorizedException("You must be logged in to access this resource");
        }
        return authentication.getName();
    }

    public User entity() {
        return userRepository.findByEmail(currentEmail())
                .orElseThrow(() -> new UnauthorizedException("You must be logged in to access this resource"));
    }

    public Long id() {
        return entity().getId();
    }

    public boolean isAdmin() {
        return hasRole("ADMIN");
    }

    public boolean isSeller() {
        return hasRole("SELLER");
    }

    /** True when the current user has the given role (ADMIN / SELLER / CUSTOMER). */
    public boolean hasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(a -> ("ROLE_" + role).equals(a.getAuthority()));
    }

    /** Role name as a plain string (ADMIN / SELLER / CUSTOMER). */
    public String roleName() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) {
            return "CUSTOMER";
        }
        return authentication.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .findFirst()
                .orElse("CUSTOMER");
    }

    public User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
