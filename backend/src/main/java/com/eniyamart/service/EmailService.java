package com.eniyamart.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Sends the password-reset e-mail when SMTP is configured.
 * When {@code app.mail.enabled=false} the reset link is logged instead,
 * so the forgot-password flow still works during local development.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.mail.from:no-reply@eniyamart.com}")
    private String from;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean sendPasswordResetEmail(String to, String customerName, String resetUrl) {
        if (!enabled) {
            log.info("Password reset link for {}: {}", to, resetUrl);
            return false;
        }

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("app.mail.enabled=true but no spring.mail.host is configured. Reset link: {}", resetUrl);
            return false;
        }

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("ENIYA MART - Reset your password");
            helper.setText(buildHtml(customerName, resetUrl), true);
            sender.send(message);
            log.info("Password reset e-mail sent to {}", to);
            return true;
        } catch (Exception ex) {
            log.error("Failed to send password reset e-mail to {}", to, ex);
            return false;
        }
    }

    private String buildHtml(String name, String resetUrl) {
        return """
                <div style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px">
                  <div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
                    <div style="background:#131921;color:#fff;padding:18px 24px;font-size:20px;font-weight:bold">
                      ENIYA <span style="color:#febd69">MART</span>
                    </div>
                    <div style="padding:24px;color:#111827">
                      <p>Hi %s,</p>
                      <p>We received a request to reset your ENIYA MART password.</p>
                      <p style="text-align:center;margin:28px 0">
                        <a href="%s" style="background:#ffb700;color:#131921;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Reset Password</a>
                      </p>
                      <p style="color:#6b7280;font-size:13px">This link expires in 30 minutes. If you did not request this, you can safely ignore this e-mail.</p>
                    </div>
                    <div style="background:#232f3e;color:#d1d5db;padding:14px 24px;font-size:12px">
                      Everything You Need. Easy Shopping.
                    </div>
                  </div>
                </div>
                """.formatted(name == null ? "there" : name, resetUrl);
    }
}
