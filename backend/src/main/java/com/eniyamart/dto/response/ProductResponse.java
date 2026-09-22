package com.eniyamart.dto.response;

import com.eniyamart.entity.Product;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ProductResponse(
        Long id,
        String name,
        String description,
        String brand,
        String category,
        BigDecimal price,
        BigDecimal discountPrice,
        BigDecimal effectivePrice,
        Integer stock,
        boolean inStock,
        String imageUrl,
        Double rating,
        Integer reviewsCount,
        boolean featured,
        LocalDateTime createdAt,
        Long sellerId,
        String sellerName) {

    public static ProductResponse from(Product p) {
        BigDecimal effective = p.getDiscountPrice() != null ? p.getDiscountPrice() : p.getPrice();
        boolean available = p.getStock() != null && p.getStock() > 0;
        Long sellerId = p.getSeller() != null ? p.getSeller().getId() : null;
        String sellerName = p.getSeller() != null ? p.getSeller().getName() : null;
        return new ProductResponse(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getBrand(),
                p.getCategory(),
                p.getPrice(),
                p.getDiscountPrice(),
                effective,
                p.getStock(),
                available,
                p.getImageUrl(),
                p.getRating(),
                p.getReviewsCount(),
                p.isFeatured(),
                p.getCreatedAt(),
                sellerId,
                sellerName);
    }

    public static PageResponse<ProductResponse> page(Page<Product> page) {
        List<ProductResponse> content = page.getContent().stream().map(ProductResponse::from).toList();
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
