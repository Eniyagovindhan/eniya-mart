package com.eniyamart.service;

import com.eniyamart.dto.request.ForgotPasswordRequest;
import com.eniyamart.dto.request.LoginRequest;
import com.eniyamart.dto.request.RegisterRequest;
import com.eniyamart.dto.request.ResetPasswordRequest;
import com.eniyamart.dto.response.AuthResponse;
import com.eniyamart.dto.response.ForgotPasswordResponse;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.entity.PasswordResetToken;
import com.eniyamart.entity.Role;
import com.eniyamart.entity.User;
import com.eniyamart.exception.BadRequestException;
import com.eniyamart.exception.ResourceNotFoundException;
import com.eniyamart.exception.UnauthorizedException;
import com.eniyamart.repository.PasswordResetTokenRepository;
import com.eniyamart.repository.UserRepository;
import com.eniyamart.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

/**
 * Registration, login and password recovery (JWT + BCrypt).
 */
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       PasswordResetTokenRepository tokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       EmailService emailService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalize(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email already exists");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPhone(blankToNull(request.phone()));
        user.setRole(Role.CUSTOMER);
        user.setEnabled(true);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail(), user.getId(), user.getRole().name());
        return AuthResponse.bearer(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name(), user.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalize(request.email());

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (DisabledException ex) {
            throw new UnauthorizedException("This account has been disabled. Please contact support.");
        } catch (AuthenticationException ex) {
            throw new UnauthorizedException("Invalid email or password");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        String token = jwtService.generateToken(user.getEmail(), user.getId(), user.getRole().name());
        return AuthResponse.bearer(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name(), user.getCreatedAt());
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        String email = normalize(request.email());
        String genericMessage = "If an account exists for that email, a password reset link has been sent.";

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return new ForgotPasswordResponse(genericMessage, null);
        }

        String rawToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken resetToken = new PasswordResetToken(rawToken, user, LocalDateTime.now().plusMinutes(30));
        tokenRepository.save(resetToken);

        String resetUrl = baseUrl + "/reset-password.html?token=" + rawToken;
        boolean sent = emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), resetUrl);

        if (!sent) {
            // Development mode: no SMTP configured - the link is logged and returned.
            return new ForgotPasswordResponse(genericMessage + " (Development mode: use the link below.)", resetUrl);
        }
        return new ForgotPasswordResponse(genericMessage, null);
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = tokenRepository.findByToken(request.token().trim())
                .orElseThrow(() -> new BadRequestException("Invalid reset link. Please request a new one."));

        if (resetToken.isUsed()) {
            throw new BadRequestException("This reset link has already been used. Please request a new one.");
        }
        if (resetToken.isExpired()) {
            throw new BadRequestException("This reset link has expired. Please request a new one.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        return MessageResponse.of("Your password has been updated. You can now log in with your new password.");
    }

    public User requireUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
