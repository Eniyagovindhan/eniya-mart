package com.eniyamart.repository;

import com.eniyamart.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    List<Product> findByFeaturedTrueOrderByCreatedAtDesc();

    List<Product> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    long countBySellerId(Long sellerId);

    long countBySellerIdAndStockLessThanEqual(Long sellerId, Integer stock);

    @Query("SELECT p.category, COUNT(p) FROM Product p GROUP BY p.category ORDER BY p.category")
    List<Object[]> countByCategory();

    @Query("SELECT DISTINCT p.category FROM Product p ORDER BY p.category")
    List<String> findDistinctCategories();

    /** Used by admin category rename - keeps products in sync with the categories table. */
    @Modifying
    @Query("UPDATE Product p SET p.category = :newName WHERE LOWER(p.category) = :oldName")
    int renameCategory(@Param("oldName") String oldName, @Param("newName") String newName);
}
