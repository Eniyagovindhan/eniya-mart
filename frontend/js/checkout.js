/* =====================================================================
 * ENIYA MART - checkout: address + payment + "Place your order".
 * Supports the normal cart checkout and the "Buy Now" single item flow.
 * ===================================================================== */
(function () {
  'use strict';

  const FREE_SHIPPING = 50;
  const SHIPPING_FEE = 4.99;

  let mode = 'cart';
  let lines = [];          // [{ productId, quantity, product }]
  let submitting = false;

  document.addEventListener('DOMContentLoaded', () => {
    if (!EM.requireAuth()) return;

    mode = EM.qs('mode') === 'buy' ? 'buy' : 'cart';

    initPaymentOptions();
    initPlaceOrder();
    loadSummary();
  });

  /* ------------------------------------------------------ load summary */
  async function loadSummary() {
    const holder = document.getElementById('checkoutItems');
    const subtitle = document.getElementById('checkoutSubtitle');
    const button = document.getElementById('placeOrderBtn');

    try {
      if (mode === 'buy') {
        const raw = localStorage.getItem(EM.BUY_NOW_KEY);
        if (!raw) {
          goToCart('No Buy Now item found — showing your cart instead.');
          return;
        }
        const pending = JSON.parse(raw);
        const product = await EM.api('/products/' + pending.productId, { auth: false });
        const quantity = Math.max(1, Math.min(Number(pending.quantity || 1), Number(product.stock || 1)));

        lines = [{ productId: product.id, quantity: quantity, product: product }];
        if (subtitle) subtitle.textContent = 'Buy Now — this order contains one item and does not touch your cart.';
      } else {
        const cart = await EM.api('/cart');
        lines = (cart.items || []).map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          product: item.product
        }));

        if (lines.length === 0) {
          goToCart('Your cart is empty — add some products first.');
          return;
        }
        if (subtitle) subtitle.textContent = 'Review your items and enter the delivery address.';
      }

      renderSummary();
      button.disabled = false;
    } catch (error) {
      if (error.status === 401) return;
      holder.innerHTML = '<div class="em-empty text-center py-4">' +
        '<i class="bi bi-exclamation-circle text-danger"></i>' +
        '<h6 class="mt-2">Could not load your order</h6>' +
        '<p class="text-muted small mb-2"></p>' +
        '<a class="btn btn-em-outline btn-sm" href="/cart.html">Back to cart</a></div>';
      holder.querySelector('.em-empty p').textContent = error.message;
      button.disabled = true;
    }
  }

  function goToCart(message) {
    EM.toast(message, 'warning');
    localStorage.removeItem(EM.BUY_NOW_KEY);
    setTimeout(() => { window.location.href = '/cart.html'; }, 900);
  }

  /* ------------------------------------------------------ render summary */
  function renderSummary() {
    const holder = document.getElementById('checkoutItems');

    holder.innerHTML = lines.map((line) => {
      const p = line.product;
      const unit = Number(p.effectivePrice != null ? p.effectivePrice : p.price);
      const lineTotal = unit * line.quantity;
      const warning = p.inStock
        ? ''
        : '<div class="em-low-stock mt-1">Out of stock</div>';

      return '<div class="d-flex gap-2 py-2 border-bottom">' +
        '<img src="' + EM.escapeHtml(p.imageUrl || EM.categoryImage(p.category)) + '" alt="' + EM.escapeHtml(p.name) + '" ' +
          'style="width:54px;height:44px;object-fit:cover;border-radius:5px;border:1px solid #eee" data-fallback>' +
        '<div class="flex-grow-1">' +
          '<div style="font-size:14px;line-height:1.3">' + EM.escapeHtml(p.name) + '</div>' +
          '<div class="text-muted" style="font-size:12px">Qty: ' + line.quantity + '</div>' +
          warning +
        '</div>' +
        '<div style="font-size:14px;font-weight:600;white-space:nowrap">' + EM.formatPrice(lineTotal) + '</div>' +
      '</div>';
    }).join('');

    EM.applyImageFallbacks(holder);

    const subtotal = lines.reduce((sum, line) => {
      const unit = Number(line.product.effectivePrice != null ? line.product.effectivePrice : line.product.price);
      return sum + unit * line.quantity;
    }, 0);

    const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;

    document.getElementById('coItems').textContent = EM.formatPrice(subtotal);
    document.getElementById('coShipping').innerHTML = shipping === 0
      ? '<span class="em-free">FREE</span>'
      : EM.formatPrice(shipping);
    document.getElementById('coTotal').textContent = EM.formatPrice(subtotal + shipping);

    const unavailable = lines.some((line) => !line.product.inStock);
    if (unavailable) {
      EM.toast('One of your items is out of stock — please return to your cart.', 'error', 6000);
      document.getElementById('placeOrderBtn').disabled = true;
    }
  }

  /* ------------------------------------------------------ payment picker */
  function initPaymentOptions() {
    const cardBox = document.getElementById('cardDetails');
    const upiBox = document.getElementById('upiDetails');

    document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('.em-pay-option').forEach((option) => option.classList.remove('active'));
        radio.closest('.em-pay-option').classList.add('active');

        cardBox.classList.toggle('d-none', radio.value !== 'CARD');
        upiBox.classList.toggle('d-none', radio.value !== 'UPI');
      });
    });
  }

  /* ------------------------------------------------------ place order */
  function initPlaceOrder() {
    const button = document.getElementById('placeOrderBtn');
    const form = document.getElementById('checkoutForm');
    if (!button) return;

    button.addEventListener('click', async () => {
      if (submitting) return;
      EM.clearFormAlert(form);
      EM.clearFieldErrors(form);

      /* 1. address validation */
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        EM.showFormAlert(form, 'Please complete the highlighted fields.');
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      /* 2. payment validation */
      const payment = document.querySelector('input[name="paymentMethod"]:checked').value;

      if (payment === 'CARD') {
        const number = document.getElementById('cardNumber');
        const expiry = document.getElementById('cardExpiry');
        const cvv = document.getElementById('cardCvv');
        const fields = [number, expiry, cvv];
        let ok = true;
        fields.forEach((field) => {
          const valid = field.checkValidity() && field.value.trim() !== '';
          field.classList.toggle('is-invalid', !valid);
          if (!valid) ok = false;
        });
        if (!ok) {
          EM.showFormAlert(form, 'Please enter valid card details (demo mode — no real charge).');
          return;
        }
      }

      if (payment === 'UPI') {
        const upi = document.getElementById('upiId');
        const valid = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi.value.trim());
        upi.classList.toggle('is-invalid', !valid);
        if (!valid) {
          EM.showFormAlert(form, 'Please enter a valid UPI ID (e.g. name@bank).');
          return;
        }
      }

      if (lines.length === 0) {
        EM.showFormAlert(form, 'There are no items to order.');
        return;
      }

      /* 3. payload */
      const payload = {
        items: mode === 'buy' ? lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity
        })) : null,
        address: {
          fullName: document.getElementById('addrName').value.trim(),
          line1: document.getElementById('addrLine1').value.trim(),
          line2: document.getElementById('addrLine2').value.trim() || null,
          city: document.getElementById('addrCity').value.trim(),
          state: document.getElementById('addrState').value.trim(),
          pincode: document.getElementById('addrPincode').value.trim(),
          phone: document.getElementById('addrPhone').value.trim()
        },
        paymentMethod: payment,
        notes: document.getElementById('orderNotes').value.trim() || null
      };

      /* 4. send it */
      submitting = true;
      EM.setButtonLoading(button, true, 'Placing your order…');

      try {
        const order = await EM.api('/orders', { method: 'POST', body: payload });
        localStorage.removeItem(EM.BUY_NOW_KEY);
        if (mode !== 'buy') EM.updateCartBadge(0);
        showSuccess(order);
        EM.toast('Order placed successfully!', 'success');
      } catch (error) {
        submitting = false;
        EM.setButtonLoading(button, false);

        const applied = error.fieldErrors ? EM.setFieldErrors(form, error.fieldErrors) : false;
        if (!applied) EM.showFormAlert(form, error.message);
        EM.toast(error.message, error.status === 409 ? 'warning' : 'error', 6000);

        if (error.status === 409) {
          // stock changed while shopping - send the user back to the cart
          setTimeout(() => { window.location.href = '/cart.html'; }, 2500);
        }
      }
    });
  }

  /* ------------------------------------------------------ success view */
  function showSuccess(order) {
    document.getElementById('checkoutWrap').classList.add('d-none');
    const success = document.getElementById('orderSuccess');
    success.classList.remove('d-none');

    document.getElementById('successOrderId').textContent = order.orderNumber;
    document.getElementById('successTotal').textContent = EM.formatPrice(order.total);
    document.getElementById('successPayment').textContent = paymentLabel(order.paymentMethod);
    document.getElementById('successAddress').textContent =
      [order.city, order.state, order.pincode].filter(Boolean).join(', ');
    document.getElementById('successStatus').innerHTML =
      '<span class="em-status em-status--' + EM.escapeHtml(order.status) + '">' + EM.escapeHtml(order.status) + '</span>';
    document.getElementById('successMessage').textContent =
      'Order ' + order.orderNumber + ' for ' + EM.formatPrice(order.total) +
      ' (' + order.items.reduce((sum, item) => sum + item.quantity, 0) + ' item(s)) has been received.';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function paymentLabel(method) {
    return ({ COD: 'Cash on Delivery', CARD: 'Card', UPI: 'UPI' })[method] || method;
  }
})();
