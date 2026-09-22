package com.eniyamart.entity;

/**
 * Application roles. Stored as a String in the users table.
 *
 * <ul>
 *   <li>{@code CUSTOMER} - shops the storefront (registration always creates this role)</li>
 *   <li>{@code SELLER}   - manages own products and orders (created by an admin)</li>
 *   <li>{@code ADMIN}    - full access to /api/admin/** and product management</li>
 * </ul>
 */
public enum Role {
    CUSTOMER,
    SELLER,
    ADMIN
}
