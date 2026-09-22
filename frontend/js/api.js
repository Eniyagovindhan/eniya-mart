/* =====================================================================
 * ENIYA MART - Frontend API client, auth helpers and UI utilities
 * Every page loads this file first.
 * ===================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
   * Configuration
   * ------------------------------------------------------------- */
  const API_BASE = window.location.protocol === 'file:'
    ? 'http://localhost:8080/api'   // opened directly from disk (VS Code Live Server)
    : '/api';                        // served by Spring Boot

  const TOKEN_KEY = 'eniya_mart_token';
  const USER_KEY = 'eniya_mart_user';
  const BUY_NOW_KEY = 'eniya_mart_buy_now';

  /* ---------------------------------------------------------------
   * Auth state (JWT is stored in localStorage)
   * ------------------------------------------------------------- */
  const Auth = {
    token() { return localStorage.getItem(TOKEN_KEY); },
    user() {
      try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) { return null; }
    },
    save(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    updateUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); },
    clear() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(BUY_NOW_KEY);
    },
    isLoggedIn() { return !!this.token(); },
    isAdmin() { const u = this.user(); return !!u && u.role === 'ADMIN'; },
    isSeller() { const u = this.user(); return !!u && u.role === 'SELLER'; },
    isCustomer() { const u = this.user(); return !!u && u.role === 'CUSTOMER'; },
    role() { const u = this.user(); return u ? u.role : null; }
  };

  /* ---------------------------------------------------------------
   * Global loading bar
   * ------------------------------------------------------------- */
  let activeRequests = 0;

  function showLoader() {
    activeRequests++;
    let bar = document.getElementById('em-loader');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'em-loader';
      bar.className = 'em-loader';
      document.body.appendChild(bar);
    }
    requestAnimationFrame(() => bar.classList.add('active'));
  }

  function hideLoader() {
    activeRequests = Math.max(0, activeRequests - 1);
    if (activeRequests === 0) {
      const bar = document.getElementById('em-loader');
      if (bar) {
        bar.classList.add('done');
        setTimeout(() => bar.classList.remove('active', 'done'), 400);
      }
    }
  }

  /* ---------------------------------------------------------------
   * Toast notifications
   * ------------------------------------------------------------- */
  const TOAST_ICONS = {
    success: 'check-circle-fill',
    error: 'x-octagon-fill',
    warning: 'exclamation-triangle-fill',
    info: 'info-circle-fill'
  };

  function toast(message, type, timeout) {
    type = type || 'info';
    timeout = timeout || 3500;

    let container = document.getElementById('em-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'em-toast-container';
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className = 'em-toast em-toast--' + type;
    el.setAttribute('role', 'status');
    el.innerHTML = '<i class="bi bi-' + (TOAST_ICONS[type] || TOAST_ICONS.info) + '"></i><span></span>';
    el.querySelector('span').textContent = message;
    el.addEventListener('click', () => el.remove());

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, timeout);
  }

  /* ---------------------------------------------------------------
   * Core fetch() wrapper
   * ------------------------------------------------------------- */
  async function api(path, options) {
    options = options || {};
    const method = options.method || 'GET';
    const body = options.body;
    const params = options.params;
    const auth = options.auth !== false;
    const silent = !!options.silent;

    let url = API_BASE + path;

    if (params) {
      const query = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') query.append(key, value);
      });
      const qs = query.toString();
      if (qs) url += (url.indexOf('?') === -1 ? '?' : '&') + qs;
    }

    const headers = { 'Accept': 'application/json' };
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';
    const token = Auth.token();
    if (auth && token) headers['Authorization'] = 'Bearer ' + token;

    if (!silent) showLoader();

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined && body !== null ? JSON.stringify(body) : undefined
      });

      const raw = await response.text();
      let data = null;
      if (raw) {
        try { data = JSON.parse(raw); } catch (e) { data = { message: raw }; }
      }

      /* ---------- 401 : unauthenticated / expired token ---------- */
      if (response.status === 401) {
        const hadToken = !!token;
        if (hadToken) Auth.clear();

        const error = new Error((data && data.message) || 'Please sign in to continue');
        error.status = 401;
        error.data = data;

        if (hadToken && !silent) {
          toast('Your session has expired. Please sign in again.', 'error');
          const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
          setTimeout(() => { window.location.href = '/login.html?returnTo=' + returnTo; }, 700);
        }
        throw error;
      }

      /* ---------- 403 : authorized but forbidden ---------------- */
      if (response.status === 403) {
        const error = new Error((data && data.message) || 'You do not have permission to do that');
        error.status = 403;
        error.data = data;
        throw error;
      }

      /* ---------- other errors ---------------------------------- */
      if (!response.ok) {
        const error = new Error((data && data.message) || ('Request failed (' + response.status + ')'));
        error.status = response.status;
        error.data = data;
        error.fieldErrors = data ? data.fieldErrors : null;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.status !== undefined) throw error;
      const networkError = new Error('Cannot reach the ENIYA MART server. Please make sure it is running and try again.');
      networkError.status = 0;
      throw networkError;
    } finally {
      if (!silent) hideLoader();
    }
  }

  /* ---------------------------------------------------------------
   * Formatting helpers
   * ------------------------------------------------------------- */
  function formatPrice(value) {
    const amount = Number(value || 0);
    return '$' + amount.toFixed(2);
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function starsHtml(rating) {
    const value = Number(rating || 0);
    const filled = Math.round(value);
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += '<span class="' + (i <= filled ? 'on' : '') + '">★</span>';
    }
    return '<span class="em-stars" aria-label="' + value.toFixed(1) + ' out of 5">' + html + '</span>';
  }

  function ratingHtml(rating, reviews) {
    const value = Number(rating || 0);
    let html = '<span class="em-rating">' + starsHtml(value) +
      '<span class="em-rating-num">' + value.toFixed(1) + '</span>';
    if (reviews !== undefined && reviews !== null) {
      html += '<span class="em-rating-count">(' + Number(reviews).toLocaleString() + ')</span>';
    }
    return html + '</span>';
  }

  function priceHtml(product) {
    const effective = product.effectivePrice != null ? product.effectivePrice : product.price;
    let html = '<span class="em-price">' + formatPrice(effective) + '</span>';
    if (product.discountPrice != null) {
      html = '<span class="em-price-deal">' + formatPrice(effective) + '</span>' +
        ' <span class="em-price-was">' + formatPrice(product.price) + '</span>';
    }
    return html;
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function firstName(fullName) {
    if (!fullName) return '';
    return String(fullName).trim().split(/\s+/)[0];
  }

  function productUrl(product) {
    return '/product-details.html?id=' + encodeURIComponent(product.id);
  }

  function imageFallback(img) {
    if (!img) return;
    img.addEventListener('error', function handler() {
      img.removeEventListener('error', handler);
      img.src = '/assets/images/placeholder.svg';
    });
  }

  function applyImageFallbacks(root) {
    (root || document).querySelectorAll('img[data-fallback]').forEach((img) => imageFallback(img));
  }

  /* ---------------------------------------------------------------
   * Auth guards / navigation helpers
   * ------------------------------------------------------------- */
  function loginUrl() {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    return '/login.html?returnTo=' + returnTo;
  }

  function requireAuth() {
    if (!Auth.isLoggedIn()) {
      toast('Please sign in to continue', 'warning');
      setTimeout(() => { window.location.href = loginUrl(); }, 500);
      return false;
    }
    return true;
  }

  /** Home page for each role (used after login / logout redirects). */
  function dashboardFor(role) {
    if (role === 'ADMIN') return '/admin-dashboard.html';
    if (role === 'SELLER') return '/seller-dashboard.html';
    return '/customer-dashboard.html';
  }

  /**
   * Guard for dashboard pages: EM.requireRole('SELLER', 'ADMIN').
   * Guests are sent to the login page, wrong roles to the 403 page.
   */
  function requireRole() {
    const roles = Array.prototype.slice.call(arguments);
    if (!requireAuth()) return false;
    const role = Auth.role();
    if (role && roles.indexOf(role) !== -1) return true;
    toast('You do not have permission to view this page', 'error');
    setTimeout(() => { window.location.href = '/403.html'; }, 700);
    return false;
  }

  function redirectIfLoggedIn() {
    if (Auth.isLoggedIn()) {
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('returnTo') || dashboardFor(Auth.role());
      return true;
    }
    return false;
  }

  function afterLoginRedirect() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('returnTo');
    window.location.href = target && target.startsWith('/') ? target : dashboardFor(Auth.role());
  }

  /* ---------------------------------------------------------------
   * Form helpers (validation feedback + loading buttons)
   * ------------------------------------------------------------- */
  function clearFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    form.querySelectorAll('[data-error-for]').forEach((el) => { el.textContent = ''; el.classList.add('d-none'); });
  }

  function setFieldErrors(form, fieldErrors) {
    if (!form || !fieldErrors) return false;
    let applied = false;
    Object.keys(fieldErrors).forEach((field) => {
      const tail = field.indexOf('.') === -1 ? field : field.slice(field.lastIndexOf('.') + 1);
      const input = form.querySelector('[name="' + field + '"]') ||
        form.querySelector('[name="' + tail + '"]') ||
        form.querySelector('[data-field="' + field + '"]') ||
        form.querySelector('[data-field="' + tail + '"]');
      if (input) {
        input.classList.add('is-invalid');
        const holder = form.querySelector('[data-error-for="' + field + '"]') ||
          form.querySelector('[data-error-for="' + tail + '"]');
        if (holder) {
          holder.textContent = fieldErrors[field];
          holder.classList.remove('d-none');
        }
        applied = true;
      }
    });
    return applied;
  }

  function showFormAlert(form, message) {
    if (!form) return;
    let alert = form.querySelector('.em-form-alert');
    if (!alert) {
      alert = document.createElement('div');
      alert.className = 'alert alert-danger em-form-alert';
      alert.setAttribute('role', 'alert');
      form.prepend(alert);
    }
    alert.textContent = message;
    alert.classList.remove('d-none');
  }

  function clearFormAlert(form) {
    if (!form) return;
    const alert = form.querySelector('.em-form-alert');
    if (alert) alert.classList.add('d-none');
  }

  function setButtonLoading(button, loading, loadingLabel) {
    if (!button) return;
    if (loading) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>' +
        (loadingLabel || 'Please wait…');
    } else {
      button.disabled = false;
      if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    }
  }

  function showSkeletons(container, count) {
    if (!container) return;
    let html = '';
    for (let i = 0; i < (count || 8); i++) {
      html += '<div class="col-6 col-md-4 col-lg-3">' +
        '<div class="em-skeleton-card">' +
        '<div class="em-skeleton em-skeleton-img"></div>' +
        '<div class="em-skeleton em-skeleton-line w-75"></div>' +
        '<div class="em-skeleton em-skeleton-line w-50"></div>' +
        '<div class="em-skeleton em-skeleton-line w-40"></div>' +
        '</div></div>';
    }
    container.innerHTML = html;
  }

  function showEmptyState(container, icon, title, text, actionHtml) {
    if (!container) return;
    container.innerHTML =
      '<div class="col-12"><div class="em-empty text-center py-5">' +
      '<i class="bi bi-' + icon + '"></i>' +
      '<h5 class="mt-3">' + escapeHtml(title) + '</h5>' +
      '<p class="text-muted mb-3">' + escapeHtml(text) + '</p>' +
      (actionHtml || '') +
      '</div></div>';
  }

  function showErrorState(container, message, retry) {
    if (!container) return;
    container.innerHTML =
      '<div class="col-12"><div class="em-empty text-center py-5">' +
      '<i class="bi bi-cloud-slash text-danger"></i>' +
      '<h5 class="mt-3">Something went wrong</h5>' +
      '<p class="text-muted mb-3"></p>' +
      '<button class="btn btn-outline-dark" id="em-retry-btn" type="button">Try again</button>' +
      '</div></div>';
    container.querySelector('.em-empty p').textContent = message || 'Please try again.';
    const btn = container.querySelector('#em-retry-btn');
    if (btn && typeof retry === 'function') btn.addEventListener('click', retry);
  }

  function debounce(fn, delay) {
    let timer;
    return function () {
      const args = arguments;
      const self = this;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(self, args), delay || 400);
    };
  }

  /* ---------------------------------------------------------------
   * Shared product helpers
   * ------------------------------------------------------------- */
  const CATEGORY_IMAGES = {
    'electronics': 'electronics',
    'clothing': 'clothing',
    'groceries': 'groceries',
    'books': 'books',
    'footwear': 'footwear',
    'home appliances': 'appliances',
    'beauty': 'beauty',
    'accessories': 'accessories'
  };

  function categoryImage(category) {
    const key = String(category || '').toLowerCase().trim();
    return '/assets/images/categories/' + (CATEGORY_IMAGES[key] || 'placeholder') + '.svg';
  }

  /** Returns the HTML markup of a catalog product card. */
  function productCard(product) {
    const deal = product.discountPrice != null ? '<span class="em-deal-badge">DEAL</span>' : '';
    const outOfStock = product.inStock ? '' : '<span class="em-out-badge">Out of stock</span>';
    const image = product.imageUrl || categoryImage(product.category);

    return '' +
      '<div class="em-product-card">' +
        '<div class="em-thumb">' + deal + outOfStock +
          '<a href="' + productUrl(product) + '">' +
            '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy" data-fallback>' +
          '</a>' +
        '</div>' +
        '<div class="em-body">' +
          '<span class="em-brand">' + escapeHtml(product.brand || product.category) + '</span>' +
          '<h3><a href="' + productUrl(product) + '">' + escapeHtml(product.name) + '</a></h3>' +
          ratingHtml(product.rating, product.reviewsCount) +
          '<div>' + priceHtml(product) + '</div>' +
          '<div class="em-card-actions">' +
            '<button type="button" class="btn btn-em" data-add-to-cart="' + product.id + '"' +
              (product.inStock ? '' : ' disabled') + '>' +
              (product.inStock ? 'Add to Cart' : 'Sold Out') +
            '</button>' +
            '<a class="btn btn-em-outline" href="' + productUrl(product) + '">Details</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function updateCartBadge(count) {
    const badge = document.getElementById('cartCount');
    if (!badge) return;
    const value = Number(count || 0);
    badge.textContent = value > 99 ? '99+' : String(value);
    badge.classList.toggle('em-cart-badge--hidden', value === 0);
  }

  /** Adds a product to the server side cart (asks the visitor to sign in first). */
  async function addToCart(productId, quantity, button) {
    if (!Auth.isLoggedIn()) {
      toast('Please sign in to add items to your cart', 'warning');
      setTimeout(() => { window.location.href = loginUrl(); }, 600);
      return false;
    }
    const qty = Number(quantity || 1);
    try {
      if (button) setButtonLoading(button, true, 'Adding…');
      const cart = await api('/cart', { method: 'POST', body: { productId: productId, quantity: qty } });
      if (button) setButtonLoading(button, false);
      updateCartBadge(cart.totalItems);
      toast(qty > 1 ? qty + ' × added to your cart' : 'Added to your cart', 'success');
      return true;
    } catch (error) {
      if (button) setButtonLoading(button, false);
      toast(error.message, error.status ? 'error' : 'warning');
      return false;
    }
  }

  /** Wires up every [data-add-to-cart] button inside a container. */
  function bindAddToCart(root) {
    (root || document).querySelectorAll('[data-add-to-cart]').forEach((button) => {
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        addToCart(Number(button.dataset.addToCart), Number(button.dataset.qty || 1), button);
      });
    });
    applyImageFallbacks(root || document);
  }

  /* ---------------------------------------------------------------
   * Public API of this module
   * ------------------------------------------------------------- */
  window.EM = {
    API_BASE,
    Auth,
    api,
    toast,
    formatPrice,
    formatDate,
    formatDateTime,
    starsHtml,
    ratingHtml,
    priceHtml,
    qs,
    escapeHtml,
    firstName,
    productUrl,
    imageFallback,
    applyImageFallbacks,
    categoryImage,
    productCard,
    updateCartBadge,
    addToCart,
    bindAddToCart,
    requireAuth,
    requireRole,
    dashboardFor,
    loginUrl,
    redirectIfLoggedIn,
    afterLoginRedirect,
    clearFieldErrors,
    setFieldErrors,
    showFormAlert,
    clearFormAlert,
    setButtonLoading,
    showSkeletons,
    showEmptyState,
    showErrorState,
    debounce,
    BUY_NOW_KEY
  };
})();
