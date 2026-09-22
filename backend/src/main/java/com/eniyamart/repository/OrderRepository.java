package com.eniyamart.repository;

import com.eniyamart.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Order> findAllByOrderByCreatedAtDesc();

    Optional<Order> findByOrderNumber(String orderNumber);

    /** Orders that contain at least one product owned by this seller. */
    @Query("SELECT DISTINCT o FROM Order o JOIN o.items i JOIN i.product p "
            + "WHERE p.seller.id = :sellerId ORDER BY o.createdAt DESC")
    List<Order> findBySellerId(@Param("sellerId") Long sellerId);

    long countByStatus(Order.OrderStatus status);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o")
    BigDecimal totalRevenue();
}
