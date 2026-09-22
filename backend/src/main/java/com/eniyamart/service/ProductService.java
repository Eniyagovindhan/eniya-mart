package com.eniyamart.service;

import com.eniyamart.dto.request.ProductRequest;
import com.eniyamart.dto.response.CategoryCountResponse;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.dto.response.PageResponse;
import com.eniyamart.dto.response.ProductResponse;
import com.eniyamart.entity.Product;
import com.eniyamart.exception.BadRequestException;
import com.eniyamart.exception.ResourceNotFoundException;
import com.eniyamart.repository.CartItemRepository;
import com.eniyamart.repository.OrderItemRepository;
import com.eniyamart.repository.ProductRepository;
import com.eniyamart.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Catalog: search, category filter, price range, sorting, pagination and admin CRUD.
 */
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final CartItemRepository cartItemRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ProductService(ProductRepository productRepository,
                          OrderItemRepository orderItemRepository,
                          UserRepository userRepository,
                          CartItemRepository cartItemRepository) {
        this.productRepository = productRepository;
        this.orderItemRepository = orderItemRepository;
        this.userRepository = userRepository;
        this.cartItemRepository = cartItemRepository;
    }

    /**
     * Paged product search.
     * sort: "featured" (default) | "price-asc" | "price-desc" | "rating" | "newest" | "name"
     */
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> search(String search,
                                                String category,
                                                BigDecimal minPrice,
                                                BigDecimal maxPrice,
                                                String sort,
                                                int page,
                                                int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 48);
        String safeSort = sort == null || sort.isBlank() ? "featured" : sort.trim();

        // ---- filter (main query) ----
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Product> query = cb.createQuery(Product.class);
        Root<Product> root = query.from(Product.class);
        query.where(cb.and(buildPredicates(root, cb, search, category, minPrice, maxPrice).toArray(new Predicate[0])));

        Expression<BigDecimal> effectivePrice = cb.coalesce(
                root.<BigDecimal>get("discountPrice"),
                root.<BigDecimal>get("price"));
        query.orderBy(buildOrderBy(cb, root, effectivePrice, safeSort));

        // ---- count query ----
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Product> countRoot = countQuery.from(Product.class);
        countQuery.select(cb.count(countRoot));
        countQuery.where(cb.and(buildPredicates(countRoot, cb, search, category, minPrice, maxPrice).toArray(new Predicate[0])));
        long total = entityManager.createQuery(countQuery).getSingleResult();

        // ---- page ----
        List<Product> products = entityManager.createQuery(query)
                .setFirstResult(safePage * safeSize)
                .setMaxResults(safeSize)
                .getResultList();

        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeSize);
        List<ProductResponse> content = products.stream().map(ProductResponse::from).toList();

        return new PageResponse<>(content, safePage, safeSize, total, totalPages);
    }

    private List<Predicate> buildPredicates(Root<Product> root,
                                            CriteriaBuilder cb,
                                            String search,
                                            String category,
                                            BigDecimal minPrice,
                                            BigDecimal maxPrice) {
        List<Predicate> predicates = new ArrayList<>();

        if (search != null && !search.isBlank()) {
            String like = "%" + search.trim().toLowerCase() + "%";
            predicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("brand")), like),
                    cb.like(cb.lower(root.get("category")), like),
                    cb.like(cb.lower(root.get("description")), like)));
        }

        if (category != null && !category.isBlank()) {
            predicates.add(cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase()));
        }

        if (minPrice != null) {
            predicates.add(cb.greaterThanOrEqualTo(
                    cb.coalesce(root.<BigDecimal>get("discountPrice"), root.<BigDecimal>get("price")), minPrice));
        }

        if (maxPrice != null) {
            predicates.add(cb.lessThanOrEqualTo(
                    cb.coalesce(root.<BigDecimal>get("discountPrice"), root.<BigDecimal>get("price")), maxPrice));
        }

        return predicates;
    }

    private List<Order> buildOrderBy(CriteriaBuilder cb,
                                     Root<Product> root,
                                     Expression<BigDecimal> effectivePrice,
                                     String sort) {
        return switch (sort.toLowerCase()) {
            case "price-asc" -> List.of(cb.asc(effectivePrice));
            case "price-desc" -> List.of(cb.desc(effectivePrice));
            case "rating" -> List.of(cb.desc(root.get("rating")), cb.asc(root.get("name")));
            case "newest" -> List.of(cb.desc(root.get("createdAt")));
            case "name" -> List.of(cb.asc(root.get("name")));
            default -> List.of(cb.desc(root.get("featured")), cb.desc(root.get("createdAt")));
        };
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> featured() {
        return productRepository.findByFeaturedTrueOrderByCreatedAtDesc()
                .stream()
                .limit(8)
                .map(ProductResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryCountResponse> categories() {
        return productRepository.countByCategory()
                .stream()
                .map(row -> new CategoryCountResponse(String.valueOf(row[0]), ((Number) row[1]).longValue()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getById(Long id) {
        return productRepository.findById(id)
                .map(ProductResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + id));
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        validate(request);
        Product product = new Product();
        apply(product, request);
        product = productRepository.save(product);
        return ProductResponse.from(product);
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        validate(request);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + id));
        apply(product, request);
        product = productRepository.save(product);
        return ProductResponse.from(product);
    }

    @Transactional
    public MessageResponse delete(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + id));

        if (!orderItemRepository.findByProductId(id).isEmpty()) {
            throw new BadRequestException("This product already exists in an order. Set its stock to 0 instead of deleting it.");
        }

        // remove the product from every shopping cart so the FK never blocks the delete
        cartItemRepository.deleteByProductId(id);
        productRepository.delete(product);
        return MessageResponse.of("Product deleted successfully");
    }

    private void validate(ProductRequest request) {
        if (request.discountPrice() != null && request.discountPrice().compareTo(request.price()) >= 0) {
            throw new BadRequestException("Discount price must be lower than the regular price");
        }
    }

    /* ------------------------------------------------------ seller scope */

    /** All products owned by one seller (newest first). */
    @Transactional(readOnly = true)
    public List<ProductResponse> sellerProducts(Long sellerId) {
        return productRepository.findBySellerIdOrderByCreatedAtDesc(sellerId)
                .stream()
                .map(ProductResponse::from)
                .toList();
    }

    /** Create a product owned by the given seller. */
    @Transactional
    public ProductResponse createAsSeller(Long sellerId, ProductRequest request) {
        validate(request);
        Product product = new Product();
        apply(product, request);
        product.setSeller(userRepository.getReferenceById(sellerId));
        product = productRepository.save(product);
        return ProductResponse.from(product);
    }

    /** Update a product only when it belongs to this seller. */
    @Transactional
    public ProductResponse updateAsSeller(Long sellerId, Long id, ProductRequest request) {
        validate(request);
        Product product = requireOwned(sellerId, id);
        apply(product, request);
        product = productRepository.save(product);
        return ProductResponse.from(product);
    }

    /** Delete a product only when it belongs to this seller. */
    @Transactional
    public MessageResponse deleteAsSeller(Long sellerId, Long id) {
        Product product = requireOwned(sellerId, id);

        if (!orderItemRepository.findByProductId(id).isEmpty()) {
            throw new BadRequestException("This product already exists in an order. Set its stock to 0 instead of deleting it.");
        }

        // remove the product from every shopping cart so the FK never blocks the delete
        cartItemRepository.deleteByProductId(id);
        productRepository.delete(product);
        return MessageResponse.of("Product deleted successfully");
    }

    /** 404 when the product does not exist or belongs to someone else. */
    private Product requireOwned(Long sellerId, Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + id));
        if (product.getSeller() == null || !sellerId.equals(product.getSeller().getId())) {
            throw new ResourceNotFoundException("Product not found with id " + id);
        }
        return product;
    }

    private void apply(Product product, ProductRequest request) {
        product.setName(request.name().trim());
        product.setDescription(request.description() == null ? null : request.description().trim());
        product.setBrand(request.brand() == null || request.brand().isBlank() ? null : request.brand().trim());
        product.setCategory(request.category().trim());
        product.setPrice(request.price());
        product.setDiscountPrice(request.discountPrice());
        product.setStock(request.stock());
        product.setImageUrl(request.imageUrl() == null || request.imageUrl().isBlank() ? null : request.imageUrl().trim());
        product.setRating(request.rating() == null ? 0.0 : request.rating().doubleValue());
        product.setReviewsCount(request.reviewsCount() == null ? 0 : request.reviewsCount());
        product.setFeatured(Boolean.TRUE.equals(request.featured()));
    }
}
