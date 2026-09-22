/* =====================================================================
 * ENIYA MART - Customer dashboard (profile summary, stats, recent orders)
 * ===================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (!EM.requireRole('CUSTOMER')) return;
    loadProfile();
    loadStats();
    loadRecentOrders();
  });

  /* --------------------------------------------------------- profile */
  async function loadProfile() {
    try {
      const profile = await EM.api('/account', { silent: true });
      EM.Auth.updateUser(profile);

      document.getElementById('dashGreeting').textContent = 'Hello, ' + EM.firstName(profile.name);
      document.getElementById('dashName').textContent = profile.name || '—';
      document.getElementById('dashEmail').textContent = profile.email || '—';
      document.getElementById('dashEmailRow').textContent = profile.email || '—';
      document.getElementById('dashPhone').textContent = profile.phone || 'Not provided';
      document.getElementById('dashRole').textContent =
        profile.role === 'ADMIN' ? 'Administrator' : profile.role === 'SELLER' ? 'Seller' : 'Customer';
      document.getElementById('dashMember').textContent = EM.formatDate(profile.createdAt);
      document.getElementById('statMember').textContent =
        profile.createdAt ? new Date(profile.createdAt).getFullYear() : '—';
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      EM.toast(error.message, 'error');
    }
  }

  /* ----------------------------------------------------------- stats */
  async function loadStats() {
    try {
      const orders = await EM.api('/orders', { silent: true });
      const spent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      document.getElementById('statOrders').textContent = orders.length;
      document.getElementById('statSpent').textContent = EM.formatPrice(spent);
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      document.getElementById('statOrders').textContent = '—';
      document.getElementById('statSpent').textContent = '—';
    }

    try {
      const cart = await EM.api('/cart', { silent: true });
      document.getElementById('statCart').textContent = cart.totalItems || 0;
    } catch (error) {
      document.getElementById('statCart').textContent = '0';
    }
  }

  /* --------------------------------------------------- recent orders */
  async function loadRecentOrders() {
    const holder = document.getElementById('recentOrders');
    const info = document.getElementById('recentInfo');
    holder.innerHTML = skeleton(2);

    try {
      const orders = await EM.api('/orders');

      if (!Array.isArray(orders) || orders.length === 0) {
        info.textContent = 'No orders yet';
        holder.innerHTML =
          '<div class="em-empty text-center py-5">' +
          '<i class="bi bi-box-seam"></i>' +
          '<h5 class="mt-3">No orders yet</h5>' +
          '<p class="text-muted mb-3">Orders you place will show up here with their Order ID.</p>' +
          '<a class="btn btn-em" href="/products.html">Start shopping</a>' +
          '</div>';
        return;
      }

      const recent = orders.slice(0, 3);
      info.textContent = orders.length + ' order' + (orders.length === 1 ? '' : 's') + ' in total';
      holder.innerHTML = recent.map(miniCard).join('');
      EM.applyImageFallbacks(holder);
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      info.textContent = 'Could not load your orders';
      holder.innerHTML =
        '<div class="em-empty text-center py-5">' +
        '<i class="bi bi-cloud-slash text-danger"></i>' +
        '<h5 class="mt-3">Something went wrong</h5>' +
        '<p class="text-muted mb-2"></p>' +
        '<button class="btn btn-outline-dark" type="button" id="recentRetry">Try again</button>' +
        '</div>';
      holder.querySelector('p').textContent = error.message || 'Please try again.';
      const retry = document.getElementById('recentRetry');
      if (retry) retry.addEventListener('click', loadRecentOrders);
    }
  }

  function skeleton(count) {
    let html = '';
    for (let i = 0; i < (count || 2); i++) {
      html += '<div class="em-order-card"><div class="em-order-head">' +
        '<div><span>Order</span><div class="em-skeleton em-skeleton-line mt-1" style="width:150px"></div></div>' +
        '<div><span>Total</span><div class="em-skeleton em-skeleton-line mt-1" style="width:70px"></div></div>' +
        '<div><span>Status</span><div class="em-skeleton em-skeleton-line mt-1" style="width:90px"></div></div>' +
        '</div></div>';
    }
    return html;
  }

  function miniCard(order) {
    const quantity = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
    return '' +
      '<a class="em-mini-card-link" href="/orders.html">' +
      '<article class="em-order-card">' +
        '<div class="em-order-head">' +
          '<div><span>Order ID</span><strong class="text-primary">' + EM.escapeHtml(order.orderNumber) + '</strong></div>' +
          '<div><span>Placed</span><strong>' + EM.formatDate(order.createdAt) + '</strong></div>' +
          '<div><span>Total</span><strong>' + EM.formatPrice(order.total) + '</strong></div>' +
          '<div class="ms-auto text-md-end">' +
            '<span>Status</span>' +
            '<div><span class="em-status em-status--' + EM.escapeHtml(order.status) + '">' +
              EM.escapeHtml(order.status) +
            '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="em-order-body">' +
          '<div class="small text-muted">' +
            quantity + ' item' + (quantity === 1 ? '' : 's') +
            ' • Ship to ' + EM.escapeHtml([order.city, order.state].filter(Boolean).join(', ') || '—') +
          '</div>' +
        '</div>' +
      '</article>' +
      '</a>';
  }
})();
