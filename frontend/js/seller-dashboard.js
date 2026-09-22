/* =====================================================================
 * ENIYA MART - Seller dashboard
 * Own product CRUD, own order fulfilment (status updates) and stats.
 * ===================================================================== */
(function () {
  'use strict';

  /* Allowed order status transitions (mirrors the backend validation). */
  const NEXT_STATUS = {
    PLACED: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: []
  };

  let editingId = null;
  let productsCache = [];

  document.addEventListener('DOMContentLoaded', () => {
    if (!EM.requireRole('SELLER')) return;

    bindProductForm();
    bindProductActions();
    bindOrderActions();

    document.getElementById('btnAddProduct').addEventListener('click', openAddModal);
    document.getElementById('btnAddProduct2').addEventListener('click', openAddModal);

    loadGreeting();
    loadStats();
    loadCategories();
    loadProducts();
    loadOrders();
  });

  function loadGreeting() {
    const user = EM.Auth.user();
    if (user) {
      document.getElementById('sellerGreeting').textContent = 'Hello, ' + EM.firstName(user.name);
    }
  }

  /* ----------------------------------------------------------- stats */
  async function loadStats() {
    try {
      const stats = await EM.api('/seller/stats', { silent: true });
      document.getElementById('stProducts').textContent = stats.products;
      document.getElementById('stLowStock').textContent = stats.lowStock;
      document.getElementById('stPending').textContent = stats.pendingOrders;
      document.getElementById('stUnits').textContent = stats.unitsSold;
      document.getElementById('stRevenue').textContent = EM.formatPrice(stats.revenue);
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      EM.toast(error.message, 'error');
    }
  }

  /* ------------------------------------------------------ categories */
  async function loadCategories() {
    try {
      const categories = await EM.api('/products/categories', { auth: false, silent: true });
      const list = document.getElementById('categoryList');
      list.innerHTML = (categories || []).map((c) =>
        '<option value="' + EM.escapeHtml(c.category) + '"></option>'
      ).join('');
    } catch (error) {
      // datalist is optional decoration
    }
  }

  /* -------------------------------------------------------- products */
  async function loadProducts() {
    const body = document.getElementById('productsBody');
    const holder = document.getElementById('productsHolder');
    const empty = document.getElementById('productsEmpty');
    const info = document.getElementById('productsInfo');

    body.innerHTML =
      '<tr><td colspan="7"><div class="em-skeleton em-skeleton-line w-50 my-2"></div></td></tr>' +
      '<tr><td colspan="7"><div class="em-skeleton em-skeleton-line w-75 my-2"></div></td></tr>';

    try {
      const products = await EM.api('/seller/products');
      productsCache = Array.isArray(products) ? products : [];

      if (productsCache.length === 0) {
        holder.classList.add('d-none');
        empty.classList.remove('d-none');
        empty.innerHTML =
          '<div class="em-empty text-center py-5">' +
          '<i class="bi bi-box-seam"></i>' +
          '<h5 class="mt-3">No products yet</h5>' +
          '<p class="text-muted mb-3">Add your first product to start selling on ENIYA MART.</p>' +
          '<button class="btn btn-em" type="button" id="emptyAddBtn">Add Product</button>' +
          '</div>';
        const btn = document.getElementById('emptyAddBtn');
        if (btn) btn.addEventListener('click', openAddModal);
        info.textContent = '0 products';
        return;
      }

      holder.classList.remove('d-none');
      empty.classList.add('d-none');
      info.textContent = productsCache.length + ' product' + (productsCache.length === 1 ? '' : 's') + ' in your store';

      body.innerHTML = productsCache.map((product) => {
        const low = product.stock != null && product.stock <= 5;
        return '<tr>' +
          '<td><img class="em-thumb-sm" src="' + EM.escapeHtml(product.imageUrl || EM.categoryImage(product.category)) +
            '" alt="' + EM.escapeHtml(product.name) + '" data-fallback></td>' +
          '<td><strong>' + EM.escapeHtml(product.name) + '</strong>' +
            (product.brand ? '<div class="small text-muted">' + EM.escapeHtml(product.brand) + '</div>' : '') +
          '</td>' +
          '<td>' + EM.escapeHtml(product.category) + '</td>' +
          '<td>' + EM.priceHtml(product) + '</td>' +
          '<td class="' + (low ? 'em-stock-low' : '') + '">' +
            (low ? '<i class="bi bi-exclamation-triangle me-1"></i>' : '') + product.stock +
          '</td>' +
          '<td>' + (product.featured
            ? '<span class="badge bg-warning text-dark">Featured</span>'
            : '<span class="badge bg-light text-muted border">Standard</span>') +
            (product.inStock ? '' : ' <span class="badge bg-danger">Out of stock</span>') +
          '</td>' +
          '<td><div class="em-dash-actions">' +
            '<button type="button" class="btn btn-sm btn-outline-dark" data-edit="' + product.id + '" title="Edit">' +
              '<i class="bi bi-pencil"></i> Edit</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" data-del="' + product.id + '" title="Delete">' +
              '<i class="bi bi-trash"></i></button>' +
          '</div></td>' +
        '</tr>';
      }).join('');

      EM.applyImageFallbacks(body);
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      info.textContent = 'Could not load your products';
      body.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">' +
        EM.escapeHtml(error.message || 'Please try again.') + '</td></tr>';
    }
  }

  /* ------------------------------------------- product form handling */
  function productModal() {
    return bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal'));
  }

  function openAddModal() {
    editingId = null;
    const form = document.getElementById('productForm');
    form.reset();
    form.classList.remove('was-validated');
    EM.clearFieldErrors(form);
    EM.clearFormAlert(form);
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productSubmitBtn').textContent = 'Save product';
    productModal().show();
  }

  function openEditModal(product) {
    editingId = product.id;
    const form = document.getElementById('productForm');
    form.reset();
    form.classList.remove('was-validated');
    EM.clearFieldErrors(form);
    EM.clearFormAlert(form);

    form.querySelector('[name="name"]').value = product.name || '';
    form.querySelector('[name="brand"]').value = product.brand || '';
    form.querySelector('[name="category"]').value = product.category || '';
    form.querySelector('[name="price"]').value = product.price != null ? product.price : '';
    form.querySelector('[name="discountPrice"]').value =
      product.discountPrice != null ? product.discountPrice : '';
    form.querySelector('[name="stock"]').value = product.stock != null ? product.stock : '';
    form.querySelector('[name="imageUrl"]').value = product.imageUrl || '';
    form.querySelector('[name="description"]').value = product.description || '';
    form.querySelector('[name="featured"]').checked = !!product.featured;

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productSubmitBtn').textContent = 'Update product';
    productModal().show();
  }

  function collectPayload(form) {
    const price = form.querySelector('[name="price"]').value;
    const discount = form.querySelector('[name="discountPrice"]').value;
    const stock = form.querySelector('[name="stock"]').value;
    return {
      name: form.querySelector('[name="name"]').value.trim(),
      brand: form.querySelector('[name="brand"]').value.trim() || null,
      category: form.querySelector('[name="category"]').value.trim(),
      price: price === '' ? null : Number(price),
      discountPrice: discount === '' ? null : Number(discount),
      stock: stock === '' ? 0 : parseInt(stock, 10),
      imageUrl: form.querySelector('[name="imageUrl"]').value.trim() || null,
      description: form.querySelector('[name="description"]').value.trim() || null,
      featured: form.querySelector('[name="featured"]').checked
    };
  }

  function bindProductForm() {
    const form = document.getElementById('productForm');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      EM.clearFieldErrors(form);
      EM.clearFormAlert(form);

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      const payload = collectPayload(form);
      const btn = document.getElementById('productSubmitBtn');
      const wasEdit = !!editingId;
      EM.setButtonLoading(btn, true, 'Saving…');

      try {
        if (wasEdit) {
          await EM.api('/seller/products/' + editingId, { method: 'PUT', body: payload });
        } else {
          await EM.api('/seller/products', { method: 'POST', body: payload });
        }
        EM.toast(wasEdit ? 'Product updated successfully' : 'Product added to your store', 'success');
        productModal().hide();
        editingId = null;
        loadProducts();
        loadStats();
      } catch (error) {
        if (error.status === 401) return;
        if (error.fieldErrors && EM.setFieldErrors(form, error.fieldErrors)) {
          // field level feedback applied
        } else {
          EM.showFormAlert(form, error.message || 'Could not save the product');
        }
      } finally {
        EM.setButtonLoading(btn, false);
      }
    });
  }

  function bindProductActions() {
    document.getElementById('productsBody').addEventListener('click', async (event) => {
      const editBtn = event.target.closest('[data-edit]');
      const delBtn = event.target.closest('[data-del]');

      if (editBtn) {
        const product = productsCache.find((p) => String(p.id) === editBtn.dataset.edit);
        if (product) openEditModal(product);
        return;
      }

      if (delBtn) {
        const id = delBtn.dataset.del;
        const product = productsCache.find((p) => String(p.id) === id);
        if (!product) return;
        if (!window.confirm('Delete "' + product.name + '"? This cannot be undone.')) return;

        delBtn.disabled = true;
        try {
          await EM.api('/seller/products/' + id, { method: 'DELETE' });
          EM.toast('Product deleted', 'success');
          loadProducts();
          loadStats();
        } catch (error) {
          if (error.status === 401) return;
          EM.toast(error.message || 'Could not delete the product', 'error');
        } finally {
          delBtn.disabled = false;
        }
      }
    });
  }

  /* ---------------------------------------------------------- orders */
  async function loadOrders() {
    const holder = document.getElementById('sellerOrdersList');
    const info = document.getElementById('sellerOrdersInfo');
    holder.innerHTML = '<div class="em-order-card"><div class="em-order-body">' +
      '<div class="em-skeleton em-skeleton-line w-75 mb-2"></div>' +
      '<div class="em-skeleton em-skeleton-line w-50"></div></div></div>';

    try {
      const orders = await EM.api('/seller/orders');

      if (!Array.isArray(orders) || orders.length === 0) {
        info.textContent = 'No orders contain your products yet';
        holder.innerHTML =
          '<div class="em-empty text-center py-5">' +
          '<i class="bi bi-truck"></i>' +
          '<h5 class="mt-3">No orders yet</h5>' +
          '<p class="text-muted mb-0">Orders that include your products will appear here for fulfilment.</p>' +
          '</div>';
        return;
      }

      const pending = orders.filter((o) => o.status === 'PLACED' || o.status === 'CONFIRMED').length;
      info.textContent = orders.length + ' order' + (orders.length === 1 ? '' : 's') +
        ' containing your products • ' + pending + ' awaiting action';
      holder.innerHTML = orders.map(orderCard).join('');
      EM.applyImageFallbacks(holder);
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      info.textContent = 'Could not load your orders';
      holder.innerHTML = '<div class="em-empty text-center py-5">' +
        '<i class="bi bi-cloud-slash text-danger"></i>' +
        '<h5 class="mt-3">Something went wrong</h5><p class="text-muted mb-0">' +
        EM.escapeHtml(error.message || 'Please try again.') + '</p></div>';
    }
  }

  function statusSelect(order) {
    const options = NEXT_STATUS[order.status] || [];
    if (options.length === 0) {
      return '<span class="small text-muted">No further actions</span>';
    }
    return '<select class="form-select form-select-sm w-auto" data-order-status="' +
      EM.escapeHtml(order.orderNumber) + '" aria-label="Change status">' +
      '<option value="">Change status…</option>' +
      options.map((status) =>
        '<option value="' + status + '">' + statusLabel(status) + '</option>'
      ).join('') +
      '</select>';
  }

  function statusLabel(status) {
    return {
      CONFIRMED: 'Confirm order',
      SHIPPED: 'Mark as shipped',
      DELIVERED: 'Mark as delivered',
      CANCELLED: 'Cancel order'
    }[status] || status;
  }

  function orderCard(order) {
    const items = order.items || [];
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const myTotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

    return '<article class="em-order-card">' +
      '<div class="em-order-head">' +
        '<div><span>Order ID</span><strong class="text-primary">' + EM.escapeHtml(order.orderNumber) + '</strong></div>' +
        '<div><span>Placed</span><strong>' + EM.formatDate(order.createdAt) + '</strong></div>' +
        '<div><span>Customer</span><strong>' + EM.escapeHtml(order.customerName || '—') + '</strong></div>' +
        '<div><span>My items total</span><strong>' + EM.formatPrice(myTotal) + '</strong></div>' +
        '<div class="ms-auto text-md-end">' +
          '<span>Status</span>' +
          '<div><span class="em-status em-status--' + EM.escapeHtml(order.status) + '">' +
            EM.escapeHtml(order.status) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="em-order-body">' +
        '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">' +
          '<span class="small text-muted">' +
            quantity + ' of your item' + (quantity === 1 ? '' : 's') +
            ' • Ship to ' + EM.escapeHtml(order.city || '—') + ', ' + EM.escapeHtml(order.state || '—') +
            (order.phone ? ' • ' + EM.escapeHtml(order.phone) : '') +
          '</span>' +
          statusSelect(order) +
        '</div>' +
        items.map((item) =>
          '<div class="em-order-item">' +
            '<img src="' + EM.escapeHtml(item.productImage || '/assets/images/placeholder.svg') +
              '" alt="' + EM.escapeHtml(item.productName) + '" data-fallback>' +
            '<div class="flex-grow-1">' +
              '<span class="em-oi-name">' + EM.escapeHtml(item.productName) + '</span>' +
              '<div class="em-oi-meta">Qty: ' + item.quantity + ' • ' + EM.formatPrice(item.price) + ' each</div>' +
            '</div>' +
            '<div class="text-end"><div class="fw-semibold">' + EM.formatPrice(item.totalPrice) + '</div></div>' +
          '</div>'
        ).join('') +
      '</div>' +
    '</article>';
  }

  function bindOrderActions() {
    document.getElementById('sellerOrdersList').addEventListener('change', async (event) => {
      const select = event.target.closest('[data-order-status]');
      if (!select || !select.value) return;

      const orderNumber = select.dataset.orderStatus;
      const status = select.value;
      select.disabled = true;

      try {
        await EM.api('/seller/orders/' + encodeURIComponent(orderNumber) + '/status',
          { method: 'PUT', body: { status: status } });
        EM.toast('Order ' + orderNumber + ' is now ' + status, 'success');
        loadOrders();
        loadStats();
      } catch (error) {
        if (error.status !== 401) {
          EM.toast(error.message || 'Could not update the order', 'error');
        }
        select.value = '';
        select.disabled = false;
      }
    });
  }
})();
