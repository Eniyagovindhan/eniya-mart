package com.eniyamart.service;

import com.eniyamart.dto.request.CategoryRequest;
import com.eniyamart.dto.response.CategoryResponse;
import com.eniyamart.dto.response.MessageResponse;
import com.eniyamart.entity.Category;
import com.eniyamart.exception.BadRequestException;
import com.eniyamart.exception.ResourceNotFoundException;
import com.eniyamart.repository.CategoryRepository;
import com.eniyamart.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Admin category management (table: categories).
 *
 * <p>Products store the category name as a plain string, so renaming a
 * category also renames it on every product that uses it, and deleting a
 * category is blocked while products still reference it. This keeps the
 * storefront search/filter behaviour completely unchanged.</p>
 */
@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CategoryService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : productRepository.countByCategory()) {
            counts.put(String.valueOf(row[0]).toLowerCase(Locale.ROOT), (Long) row[1]);
        }
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(c -> CategoryResponse.from(c, counts.getOrDefault(c.getName().toLowerCase(Locale.ROOT), 0L)))
                .toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String name = normalize(request.name());
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Category \"" + name + "\" already exists");
        }
        Category saved = categoryRepository.save(new Category(name));
        return CategoryResponse.from(saved, 0L);
    }

    @Transactional
    public CategoryResponse rename(Long categoryId, CategoryRequest request) {
        Category category = require(categoryId);
        String oldName = category.getName();
        String newName = normalize(request.name());

        if (!oldName.equalsIgnoreCase(newName) && categoryRepository.existsByNameIgnoreCase(newName)) {
            throw new BadRequestException("Category \"" + newName + "\" already exists");
        }

        int updatedProducts = 0;
        if (!oldName.equalsIgnoreCase(newName)) {
            // keep every product in sync with the new category name
            updatedProducts = productRepository.renameCategory(oldName.toLowerCase(Locale.ROOT), newName);
        }
        category.setName(newName);
        Category saved = categoryRepository.save(category);
        return CategoryResponse.from(saved, updatedProducts);
    }

    @Transactional
    public MessageResponse delete(Long categoryId) {
        Category category = require(categoryId);
        long inUse = productRepository.countByCategory().stream()
                .filter(row -> String.valueOf(row[0]).equalsIgnoreCase(category.getName()))
                .mapToLong(row -> (Long) row[1])
                .sum();
        if (inUse > 0) {
            throw new BadRequestException(
                    "Cannot delete \"" + category.getName() + "\" - " + inUse
                            + " product(s) still use it. Move or delete those products first.");
        }
        categoryRepository.delete(category);
        return MessageResponse.of("Category \"" + category.getName() + "\" deleted");
    }

    /** Used by the data seeder: create one categories row per product category. */
    @Transactional
    public void syncFromProducts() {
        for (String name : productRepository.findDistinctCategories()) {
            if (name != null && !name.isBlank() && !categoryRepository.existsByNameIgnoreCase(name.trim())) {
                categoryRepository.save(new Category(name.trim()));
            }
        }
    }

    private Category require(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id " + categoryId));
    }

    private String normalize(String name) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Category name is required");
        }
        return name.trim();
    }
}
