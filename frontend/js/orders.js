/* =====================================================================
 * ENIYA MART - order history (Order ID, status, items, totals)
 * ===================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (!EM.requireAuth()) return;   // guests are sent to the login page
    loadOrders();
  });

  // "Copy Order ID" button
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-copy-order]');
    if (!button) return;

    const orderNumber = button.getAttribute('data-copy-order');
    copyText(orderNumber);
  });

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => EM.toast('Order ID ' + text + ' copied to clipboard.', 'success'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      EM.toast('Order ID ' + text + ' copied to clipboard.', 'success');
    } catch (error) {
      EM.toast('Could not copy the Order ID.', 'error');
    }
    document.body.removeChild(input);
  }

  function skeleton(count) {
    let html = '';
    for (let i = 0; i < (count || 3); i++) {
      html += '<div class="em-order-card"><div class="em-order-head">' +
        '<div><span>Order</span><div class="em-skeleton em-skeleton-line w-75 mt-1" style="width:140px"></div></div>' +
        '<div><span>Total</span><div class="em-skeleton em-skeleton-line w-50 mt-1" style="width:80px"></div></div>' +
        '<div><span>Status</span><div class="em-skeleton em-skeleton-line w-50 mt-1" style="width:90px"></div></div>' +
        '</div><div class="em-order-body">' +
        '<div class="em-skeleton em-skeleton-line w-75"></div>' +
        '<div class="em-skeleton em-skeleton-line w-50"></div>' +
        '</div></div>';
    }
    return html;
  }

  async function loadOrders() {
    const holder = document.getElementById('ordersList');
    const info = document.getElementById('ordersInfo');

    holder.innerHTML = skeleton(3);

    try {
      const orders = await EM.api('/orders');

      if (!Array.isArray(orders) || orders.length === 0) {
        info.textContent = 'You have not placed any orders yet';
        holder.innerHTML = '<div class="em-empty text-center py-5">' +
          '<i class="bi bi-box-seam"></i>' +
          '<h5 class="mt-3">No orders yet</h5>' +
          '<p class="text-muted mb-3">When you place an order it will show up here with its Order ID.</p>' +
          '<a class="btn btn-em" href="/products.html">Start shopping</a>' +
          '</div>';
        return;
      }

      const itemCount = orders.reduce((sum, order) =>
        sum + order.items.reduce((s, item) => s + item.quantity, 0), 0);

      info.textContent = orders.length + ' order' + (orders.length === 1 ? '' : 's') +
        ' • ' + itemCount + ' item' + (itemCount === 1 ? '' : 's') + ' purchased';

      holder.innerHTML = orders.map(orderCard).join('');
      EM.applyImageFallbacks(holder);
    } catch (error) {
      if (error.status === 401) return;
      info.textContent = 'Could not load your orders';
      EM.showErrorState(holder, error.message, loadOrders);
    }
  }

  function orderCard(order) {
    const items = order.items || [];
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return '<article class="em-order-card">' +
      '<div class="em-order-head">' +
        '<div><span>Order placed</span><strong>' + EM.formatDate(order.createdAt) + '</strong></div>' +
        '<div><span>Total</span><strong>' + EM.formatPrice(order.total) + '</strong></div>' +
        '<div><span>Ship to</span><strong>' + EM.escapeHtml(order.addressFullName || '—') + '</strong></div>' +
        '<div class="ms-auto text-md-end">' +
          '<span>Order ID</span>' +
          '<strong class="text-primary">' + EM.escapeHtml(order.orderNumber) + '</strong>' +
        '</div>' +
      '</div>' +

      '<div class="em-order-body">' +
        '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">' +
          '<span class="em-status em-status--' + EM.escapeHtml(order.status) + '">' +
            '<i class="bi bi-circle-fill me-1" style="font-size:8px;vertical-align:middle"></i>' +
            EM.escapeHtml(order.status) +
          '</span>' +
          '<span class="small text-muted">' +
            quantity + ' item' + (quantity === 1 ? '' : 's') +
            ' • ' + paymentLabel(order.paymentMethod) +
          '</span>' +
        '</div>' +

        items.map((item) =>
          '<div class="em-order-item">' +
            '<img src="' + EM.escapeHtml(item.productImage || '/assets/images/placeholder.svg') + '" alt="' + EM.escapeHtml(item.productName) + '" data-fallback>' +
            '<div class="flex-grow-1">' +
              (item.productId
                ? '<a class="em-oi-name" href="/product-details.html?id=' + item.productId + '">' + EM.escapeHtml(item.productName) + '</a>'
                : '<span class="em-oi-name">' + EM.escapeHtml(item.productName) + '</span>') +
              '<div class="em-oi-meta">Qty: ' + item.quantity + ' • ' + EM.formatPrice(item.price) + ' each</div>' +
            '</div>' +
            '<div class="text-end">' +
              '<div class="fw-semibold">' + EM.formatPrice(item.totalPrice) + '</div>' +
            '</div>' +
          '</div>'
        ).join('') +

        '<div class="d-flex justify-content-between flex-wrap gap-2 pt-3 mt-2 border-top">' +
          '<div class="small text-muted">' +
            '<i class="bi bi-geo-alt"></i> ' +
            EM.escapeHtml([order.addressLine1, order.city, order.state, order.pincode].filter(Boolean).join(', ')) +
            (order.phone ? ' • ' + EM.escapeHtml(order.phone) : '') +
          '</div>' +
          '<div class="small">' +
            '<a href="/products.html" class="me-3">Buy it again</a>' +
            '<button class="em-delete" type="button" data-copy-order="' + EM.escapeHtml(order.orderNumber) + '">' +
              'Copy Order ID' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<div class="small text-muted mt-2">' +
          'Subtotal ' + EM.formatPrice(order.subtotal) +
          ' + shipping ' + (Number(order.shipping) === 0 ? 'FREE' : EM.formatPrice(order.shipping)) +
          ' = <strong>' + EM.formatPrice(order.total) + '</strong>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function paymentLabel(method) {
    return ({ COD: 'Cash on Delivery', CARD: 'Card payment', UPI: 'UPI payment' })[method] || method;
  }
})();
