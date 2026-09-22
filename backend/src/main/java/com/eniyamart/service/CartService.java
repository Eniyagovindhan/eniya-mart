package com.eniyamart.service;

import com.eniyamart.dto.request.CartItemRequest;
import com.eniyamart.dto.response.CartItemResponse;
import com.eniyamart.dto.response.CartResponse;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.dto.response.ProductResponse;
import com.eniyamart.entity.CartItem;
import com.eniyamart.entity.Product;
import com.eniyamart.entity.User;
import com.eniyamart.exception.BadRequestException;
import com.eniyamart.exception.OutOfStockException;
import com.eniyamart.exception.ResourceNotFoundException;
import com.eniyamart.repository.CartItemRepository;
import com.eniyamart.repository.ProductRepository;
import com.eniyamart.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Server side shopping cart (table: cart_items) - one cart per user.
 */
@Service
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartService(CartItemRepository cartItemRepository,
                       ProductRepository productRepository,
                       UserRepository userRepository) {
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdOrderByProductId(userId);

        List<CartItemResponse> lines = items.stream().map(item -> {
            Product product = item.getProduct();
            BigDecimal unit = effectivePrice(product);
            BigDecimal lineTotal = unit.multiply(BigDecimal.valueOf(item.getQuantity()));
            return new CartItemResponse(
                    item.getId(),
                    ProductResponse.from(product),
                    item.getQuantity(),
                    lineTotal,
                    product.getStock());
        }).toList();

        BigDecimal subtotal = lines.stream().map(CartItemResponse::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        int totalItems = lines.stream().mapToInt(CartItemResponse::quantity).sum();

        return new CartResponse(lines, totalItems, subtotal);
    }

    @Transactional
    public CartResponse addToCart(Long userId, CartItemRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + request.productId()));

        int stock = product.getStock() == null ? 0 : product.getStock();
        if (stock <= 0) {
            throw new OutOfStockException("\"" + product.getName() + "\" is currently out of stock");
        }

        CartItem item = cartItemRepository.findByUserIdAndProductId(userId, product.getId()).orElse(null);
        int currentQty = item == null ? 0 : item.getQuantity();
        int newQty = currentQty + request.quantity();

        if (newQty > stock) {
            throw new BadRequestException("Only " + stock + " unit(s) of \"" + product.getName() + "\" are available");
        }

        if (item == null) {
            item = new CartItem(user, product, newQty);
        } else {
            item.setQuantity(newQty);
        }
        cartItemRepository.save(item);

        return getCart(userId);
    }

    @Transactional
    public CartResponse updateQuantity(Long userId, Long productId, Integer quantity) {
        CartItem item = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("That item is not in your cart"));

        int stock = item.getProduct().getStock() == null ? 0 : item.getProduct().getStock();
        if (quantity > stock) {
            throw new BadRequestException("Only " + stock + " unit(s) of \"" + item.getProduct().getName() + "\" are available");
        }

        item.setQuantity(quantity);
        cartItemRepository.save(item);
        return getCart(userId);
    }

    @Transactional
    public CartResponse removeItem(Long userId, Long productId) {
        CartItem item = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("That item is not in your cart"));
        cartItemRepository.delete(item);
        return getCart(userId);
    }

    @Transactional
    public MessageResponse clear(Long userId) {
        cartItemRepository.deleteByUserId(userId);
        return MessageResponse.of("Your cart has been emptied");
    }

    @Transactional(readOnly = true)
    public int totalItems(Long userId) {
        return cartItemRepository.findByUserIdOrderByProductId(userId)
                .stream()
                .mapToInt(CartItem::getQuantity)
                .sum();
    }

    public static BigDecimal effectivePrice(Product product) {
        return product.getDiscountPrice() != null ? product.getDiscountPrice() : product.getPrice();
    }
}
