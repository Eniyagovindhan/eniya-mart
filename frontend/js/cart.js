/* =====================================================================
 * ENIYA MART - shopping cart (quantity updates, remove, clear, summary)
 * ===================================================================== */
(function () {
  'use strict';

  const FREE_SHIPPING = 50;
  const SHIPPING_FEE = 4.99;

  document.addEventListener('DOMContentLoaded', () => {
    if (!EM.requireAuth()) return;   // 401 / signed out visitors go to login
    loadCart();
    bindClear();
    bindCheckout();
  });

  async function loadCart() {
    const holder = document.getElementById('cartItems');
    EM.showCartSkeleton ? EM.showCartSkeleton(holder) : renderSkeleton(holder);

    try {
      const cart = await EM.api('/cart');
      render(cart);
    } catch (error) {
      if (error.status === 401) return; // api() already redirecting
      holder.innerHTML = '';
      EM.showErrorState(holder, error.message, loadCart);
      document.getElementById('cartSubtitle').textContent = 'Could not load your cart.';
    }
  }

  function renderSkeleton(holder) {
    let html = '';
    for (let i = 0; i < 3; i++) {
      html += '<div class="em-cart-row">' +
        '<div class="em-skeleton" style="height:100px"></div>' +
        '<div><div class="em-skeleton em-skeleton-line w-75"></div>' +
        '<div class="em-skeleton em-skeleton-line w-50"></div>' +
        '<div class="em-skeleton em-skeleton-line w-40"></div></div>' +
        '<div class="em-skeleton em-skeleton-line w-40"></div>' +
        '</div>';
    }
    holder.innerHTML = html;
  }

  /* ------------------------------------------------------------ render */
  function render(cart) {
    const holder = document.getElementById('cartItems');
    const items = cart.items || [];

    /* header + summary */
    document.getElementById('cartSubtitle').textContent =
      items.length === 0
        ? 'Your cart is empty.'
        : 'Price and availability last updated just now.';
    document.getElementById('sumItems').textContent = cart.totalItems || 0;
    document.getElementById('sumSubtotal').textContent = EM.formatPrice(cart.subtotal);
    document.getElementById('cartBottomTotal').textContent = EM.formatPrice(cart.subtotal);

    const shippingEl = document.getElementById('sumShipping');
    const totalEl = document.getElementById('sumTotal');
    const hint = document.getElementById('freeShipHint');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const bottom = document.getElementById('cartBottom');
    const clearBtn = document.getElementById('clearCartBtn');

    if (items.length === 0) {
      shippingEl.textContent = '—';
      totalEl.textContent = EM.formatPrice(0);
      hint.textContent = 'Your cart is empty';
      checkoutBtn.disabled = true;
      clearBtn.classList.add('d-none');
      bottom.classList.add('d-none');
      document.getElementById('summaryPanel').classList.add('d-none');

      holder.innerHTML = '<div class="em-empty text-center py-5">' +
        '<i class="bi bi-cart-x"></i>' +
        '<h5 class="mt-3">Your cart is empty</h5>' +
        '<p class="text-muted mb-3">Looks like you have not added anything yet.</p>' +
        '<a class="btn btn-em" href="/products.html">Start shopping</a>' +
        '</div>';
      return;
    }

    document.getElementById('summaryPanel').classList.remove('d-none');
    clearBtn.classList.remove('d-none');
    bottom.classList.remove('d-none');
    checkoutBtn.disabled = false;

    const subtotal = Number(cart.subtotal || 0);
    const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
    shippingEl.innerHTML = shipping === 0
      ? '<span class="em-free">FREE</span>'
      : EM.formatPrice(shipping);
    totalEl.textContent = EM.formatPrice(subtotal + shipping);

    hint.innerHTML = shipping === 0
      ? '<i class="bi bi-check-circle text-success"></i> You unlocked <strong>FREE delivery</strong>'
      : 'Add <strong>' + EM.formatPrice(FREE_SHIPPING - subtotal) + '</strong> more for FREE delivery';

    /* rows */
    holder.innerHTML = items.map((item) => {
      const product = item.product;
      const maxStock = item.maxStock || product.stock || 1;
      const low = maxStock <= 5
        ? '<span class="em-low-stock ms-2">Only ' + maxStock + ' left</span>'
        : '';

      return '<div class="em-cart-row" data-row="' + product.id + '">' +
        '<a href="/product-details.html?id=' + product.id + '">' +
          '<img src="' + EM.escapeHtml(product.imageUrl || EM.categoryImage(product.category)) + '" alt="' + EM.escapeHtml(product.name) + '" data-fallback>' +
        '</a>' +
        '<div>' +
          '<h3><a href="/product-details.html?id=' + product.id + '">' + EM.escapeHtml(product.name) + '</a></h3>' +
          '<div class="em-brand">' + EM.escapeHtml(product.brand || product.category) + '</div>' +
          '<div class="my-1">' + EM.ratingHtml(product.rating, product.reviewsCount) + '</div>' +
          '<div class="em-in-stock"><i class="bi bi-check-circle"></i> In stock' + low + '</div>' +
          '<div class="d-flex align-items-center gap-3 mt-2 flex-wrap">' +
            '<div class="em-qty">' +
              '<button type="button" data-qty-minus="' + product.id + '" aria-label="Decrease">−</button>' +
              '<input type="number" value="' + item.quantity + '" min="1" max="' + maxStock + '" data-qty-input="' + product.id + '" aria-label="Quantity">' +
              '<button type="button" data-qty-plus="' + product.id + '" aria-label="Increase">+</button>' +
            '</div>' +
            '<button class="em-delete" type="button" data-remove="' + product.id + '">' +
              '<i class="bi bi-trash"></i> Remove</button>' +
          '</div>' +
        '</div>' +
        '<div class="em-cart-price">' +
          '<div class="em-price">' + EM.formatPrice(item.lineTotal) + '</div>' +
          '<div class="small text-muted">' + EM.formatPrice(product.effectivePrice) + ' each</div>' +
        '</div>' +
      '</div>';
    }).join('');

    EM.applyImageFallbacks(holder);
    bindRowActions(holder);
  }

  /* ------------------------------------------------------- row actions */
  function bindRowActions(holder) {
    holder.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', async () => {
        const productId = Number(button.dataset.remove);
        const row = holder.querySelector('[data-row="' + productId + '"]');
        button.disabled = true;
        try {
          const cart = await EM.api('/cart/' + productId, { method: 'DELETE' });
          EM.toast('Item removed from your cart', 'success');
          render(cart);
        } catch (error) {
          button.disabled = false;
          if (error.status !== 401) EM.toast(error.message, 'error');
        }
      });
    });

    holder.querySelectorAll('[data-qty-minus]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = Number(button.dataset.qtyMinus);
        const input = holder.querySelector('[data-qty-input="' + id + '"]');
        const next = Math.max(1, Number(input.value) - 1);
        if (next === Number(input.value)) { EM.toast('Use Remove to delete this item', 'info'); return; }
        updateQty(id, next);
      });
    });

    holder.querySelectorAll('[data-qty-plus]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = Number(button.dataset.qtyPlus);
        const input = holder.querySelector('[data-qty-input="' + id + '"]');
        const next = Number(input.value) + 1;
        updateQty(id, next);
      });
    });

    holder.querySelectorAll('[data-qty-input]').forEach((input) => {
      input.addEventListener('change', () => {
        const id = Number(input.dataset.qtyInput);
        updateQty(id, Number(input.value));
      });
    });
  }

  async function updateQty(productId, quantity) {
    if (!quantity || quantity < 1) {
      EM.toast('Quantity must be at least 1', 'warning');
      return loadCart();
    }
    try {
      const cart = await EM.api('/cart/' + productId, {
        method: 'PUT',
        body: { quantity: quantity }
      });
      render(cart);
    } catch (error) {
      if (error.status === 401) return;
      EM.toast(error.message, 'error');
      loadCart();   // re-sync with the server truth (e.g. stock limit)
    }
  }

  /* --------------------------------------------------------- clear all */
  function bindClear() {
    const button = document.getElementById('clearCartBtn');
    if (!button) return;
    button.addEventListener('click', async () => {
      if (!window.confirm('Remove every item from your cart?')) return;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Clearing…';
      try {
        await EM.api('/cart', { method: 'DELETE' });
        EM.toast('Your cart has been cleared', 'success');
        EM.updateCartBadge(0);
        loadCart();
      } catch (error) {
        if (error.status !== 401) EM.toast(error.message, 'error');
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    });
  }

  /* --------------------------------------------------------- checkout */
  function bindCheckout() {
    const button = document.getElementById('checkoutBtn');
    if (!button) return;
    button.addEventListener('click', () => {
      localStorage.removeItem(EM.BUY_NOW_KEY);
      window.location.href = '/checkout.html';
    });
  }
})();
