/* =====================================================================
 * ENIYA MART - Admin dashboard
 * Products, categories, customers, sellers and order management.
 * ===================================================================== */
(function () {
  'use strict';

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
    if (!EM.requireRole('ADMIN')) return;

    bindProductForm();
    bindProductActions();
    bindCategoryForm();
    bindCategoryActions();
    bindCustomerActions();
    bindSellerForm();
    bindSellerActions();
    bindOrderActions();

    document.getElementById('btnAddProduct').addEventListener('click', openAddModal);
    document.getElementById('btnAddProduct2').addEventListener('click', openAddModal);

    loadGreeting();
    loadStats();
    loadCategories();
    loadProducts();
    loadCustomers();
    loadSellers();
    loadOrders();
  });

  function loadGreeting() {
    const user = EM.Auth.user();
    if (user) {
      document.getElementById('adminGreeting').textContent = 'Welcome back, ' + EM.firstName(user.name);
    }
  }

  function toastError(error, fallback) {
    if (error.status === 401) return;
    EM.toast(error.message || fallback || 'Something went wrong', 'error');
  }

  /* ----------------------------------------------------------- stats */
  async function loadStats() {
    try {
      const stats = await EM.api('/admin/stats', { silent: true });
      document.getElementById('adCustomers').textContent = stats.customers;
      document.getElementById('adSellers').textContent = stats.sellers;
      document.getElementById('adProducts').textContent = stats.products;
      document.getElementById('adCategories').textContent = stats.categories;
      document.getElementById('adOrders').textContent = stats.orders;
      document.getElementById('adPending').textContent = stats.pendingOrders;
      document.getElementById('adRevenue').textContent = EM.formatPrice(stats.revenue);
    } catch (error) {
      toastError(error, 'Could not load statistics');
    }
  }

  /* -------------------------------------------------------- products */
  async function fetchAllProducts() {
    const size = 48;
    const first = await EM.api('/products', { params: { page: 0, size: size, sort: 'newest' } });
    let items = (first.content || []).slice();
    let page = 1;
    while (!first.last && page < Math.min(first.totalPages, 20)) {
      const next = await EM.api('/products', { params: { page: page, size: size, sort: 'newest' }, silent: true });
      items = items.concat(next.content || []);
      page += 1;
      if (next.last) break;
    }
    return items;
  }

  async function loadProducts() {
    const body = document.getElementById('productsBody');
    const holder = document.getElementById('productsHolder');
    const empty = document.getElementById('productsEmpty');
    const info = document.getElementById('productsInfo');

    body.innerHTML =
      '<tr><td colspan="7"><div class="em-skeleton em-skeleton-line w-50 my-2"></div></td></tr>' +
      '<tr><td colspan="7"><div class="em-skeleton em-skeleton-line w-75 my-2"></div></td></tr>';

    try {
      productsCache = await fetchAllProducts();

      if (productsCache.length === 0) {
        holder.classList.add('d-none');
        empty.classList.remove('d-none');
        empty.innerHTML =
          '<div class="em-empty text-center py-5">' +
          '<i class="bi bi-box-seam"></i>' +
          '<h5 class="mt-3">No products</h5>' +
          '<p class="text-muted mb-3">Add the first product to the catalogue.</p>' +
          '<button class="btn btn-em" type="button" id="emptyAddBtn">Add Product</button>' +
          '</div>';
        const btn = document.getElementById('emptyAddBtn');
        if (btn) btn.addEventListener('click', openAddModal);
        info.textContent = '0 products';
        return;
      }

      holder.classList.remove('d-none');
      empty.classList.add('d-none');
      info.textContent = productsCache.length + ' product' + (productsCache.length === 1 ? '' : 's') + ' in the catalogue';

      body.innerHTML = productsCache.map((product) => {
        const low = product.stock != null && product.stock <= 5;
        return '<tr>' +
          '<td><img class="em-thumb-sm" src="' + EM.escapeHtml(product.imageUrl || EM.categoryImage(product.category)) +
            '" alt="' + EM.escapeHtml(product.name) + '" data-fallback></td>' +
          '<td><strong>' + EM.escapeHtml(product.name) + '</strong>' +
            (product.brand ? '<div class="small text-muted">' + EM.escapeHtml(product.brand) + '</div>' : '') +
          '</td>' +
          '<td>' + EM.escapeHtml(product.category) + '</td>' +
          '<td>' + (product.sellerName
            ? EM.escapeHtml(product.sellerName)
            : '<span class="text-muted small">Store</span>') + '</td>' +
          '<td>' + EM.priceHtml(product) + '</td>' +
          '<td class="' + (low ? 'em-stock-low' : '') + '">' + product.stock + '</td>' +
          '<td><div class="em-dash-actions">' +
            '<button type="button" class="btn btn-sm btn-outline-dark" data-edit="' + product.id + '">' +
              '<i class="bi bi-pencil"></i> Edit</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" data-del="' + product.id + '">' +
              '<i class="bi bi-trash"></i></button>' +
          '</div></td>' +
        '</tr>';
      }).join('');

      EM.applyImageFallbacks(body);
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      info.textContent = 'Could not load products';
      body.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">' +
        EM.escapeHtml(error.message || 'Please try again.') + '</td></tr>';
    }
  }

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

  function collectProductPayload(form) {
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

      const payload = collectProductPayload(form);
      const btn = document.getElementById('productSubmitBtn');
      const wasEdit = !!editingId;
      EM.setButtonLoading(btn, true, 'Saving…');

      try {
        if (wasEdit) {
          await EM.api('/products/' + editingId, { method: 'PUT', body: payload });
        } else {
          await EM.api('/products', { method: 'POST', body: payload });
        }
        EM.toast(wasEdit ? 'Product updated' : 'Product created', 'success');
        productModal().hide();
        editingId = null;
        loadProducts();
        loadStats();
        loadCategories();
      } catch (error) {
        if (error.status === 401) return;
        if (error.status === 403) {
          EM.showFormAlert(form, 'You do not have permission to manage products');
        } else if (!(error.fieldErrors && EM.setFieldErrors(form, error.fieldErrors))) {
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
          await EM.api('/products/' + id, { method: 'DELETE' });
          EM.toast('Product deleted', 'success');
          loadProducts();
          loadStats();
        } catch (error) {
          toastError(error, 'Could not delete the product');
        } finally {
          delBtn.disabled = false;
        }
      }
    });
  }

  /* ------------------------------------------------------ categories */
  async function loadCategories() {
    const body = document.getElementById('categoriesBody');
    const info = document.getElementById('categoriesInfo');
    body.innerHTML = '<tr><td colspan="4"><div class="em-skeleton em-skeleton-line w-50 my-2"></div></td></tr>';

    try {
      const categories = await EM.api('/admin/categories');

      if (!Array.isArray(categories) || categories.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">' +
          'No categories yet - add the first one above.</td></tr>';
        info.textContent = '0 categories';
        return;
      }

      info.textContent = categories.length + ' categor' + (categories.length === 1 ? 'y' : 'ies');
      const datalist = document.getElementById('categoryList');
      if (datalist) {
        datalist.innerHTML = categories.map((c) =>
          '<option value="' + EM.escapeHtml(c.name) + '"></option>'
      ).join('');
      }
      body.innerHTML = categories.map((category) =>
        '<tr>' +
          '<td><input class="form-control form-control-sm" value="' + EM.escapeHtml(category.name) +
            '" data-cat-name="' + category.id + '" maxlength="60" aria-label="Category name"></td>' +
          '<td>' + category.productCount + '</td>' +
          '<td>' + EM.formatDate(category.createdAt) + '</td>' +
          '<td><div class="em-dash-actions">' +
            '<button type="button" class="btn btn-sm btn-outline-dark" data-cat-save="' + category.id + '">' +
              '<i class="bi bi-save me-1"></i>Save</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" data-cat-del="' + category.id + '" ' +
              'data-cat-label="' + EM.escapeHtml(category.name) + '" data-cat-count="' + category.productCount + '">' +
              '<i class="bi bi-trash"></i></button>' +
          '</div></td>' +
        '</tr>'
      ).join('');
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      info.textContent = 'Could not load categories';
      body.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">' +
        EM.escapeHtml(error.message || 'Please try again.') + '</td></tr>';
    }
  }

  function bindCategoryForm() {
    const form = document.getElementById('categoryForm');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      EM.clearFieldErrors(form);
      EM.clearFormAlert(form);

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      const name = form.querySelector('[name="name"]').value.trim();
      try {
        await EM.api('/admin/categories', { method: 'POST', body: { name: name } });
        EM.toast('Category "' + name + '" created', 'success');
        form.reset();
        form.classList.remove('was-validated');
        loadCategories();
        loadStats();
      } catch (error) {
        if (error.status === 401) return;
        if (!(error.fieldErrors && EM.setFieldErrors(form, error.fieldErrors))) {
          EM.showFormAlert(form, error.message || 'Could not create the category');
        }
      }
    });
  }

  function bindCategoryActions() {
    document.getElementById('categoriesBody').addEventListener('click', async (event) => {
      const saveBtn = event.target.closest('[data-cat-save]');
      const delBtn = event.target.closest('[data-cat-del]');

      if (saveBtn) {
        const id = saveBtn.dataset.catSave;
        const input = document.querySelector('[data-cat-name="' + id + '"]');
        const name = input ? input.value.trim() : '';
        if (!name) {
          EM.toast('Category name cannot be empty', 'error');
          return;
        }

        saveBtn.disabled = true;
        try {
          await EM.api('/admin/categories/' + id, { method: 'PUT', body: { name: name } });
          EM.toast('Category renamed - products updated too', 'success');
          loadCategories();
          loadProducts();
        } catch (error) {
          toastError(error, 'Could not rename the category');
        } finally {
          saveBtn.disabled = false;
        }
        return;
      }

      if (delBtn) {
        const id = delBtn.dataset.catDel;
        const label = delBtn.dataset.catLabel;
        const count = Number(delBtn.dataset.catCount || 0);
        const message = count > 0
          ? '"' + label + '" is used by ' + count + ' product(s) and cannot be deleted. Rename or move those products first.'
          : 'Delete the category "' + label + '"?';

        if (count > 0) {
          EM.toast(message, 'error');
          return;
        }
        if (!window.confirm(message)) return;

        delBtn.disabled = true;
        try {
          const result = await EM.api('/admin/categories/' + id, { method: 'DELETE' });
          EM.toast((result && result.message) || 'Category deleted', 'success');
          loadCategories();
          loadStats();
        } catch (error) {
          toastError(error, 'Could not delete the category');
        } finally {
          delBtn.disabled = false;
        }
      }
    });
  }

  /* ------------------------------------------------------ customers */
  function userRows(users, type) {
    return users.map((user) =>
      '<tr>' +
        '<td><strong>' + EM.escapeHtml(user.name) + '</strong></td>' +
        '<td>' + EM.escapeHtml(user.email) + '</td>' +
        '<td>' + EM.escapeHtml(user.phone || '—') + '</td>' +
        '<td>' + EM.formatDate(user.createdAt) + '</td>' +
        '<td>' + (user.enabled
          ? '<span class="em-user-active"><i class="bi bi-check-circle me-1"></i>Active</span>'
          : '<span class="em-user-disabled"><i class="bi bi-pause-circle me-1"></i>Disabled</span>') + '</td>' +
        '<td><div class="em-dash-actions">' +
          '<button type="button" class="btn btn-sm ' + (user.enabled ? 'btn-outline-danger' : 'btn-outline-success') +
            '" data-' + type + '-toggle="' + user.id + '" data-enabled="' + user.enabled + '">' +
            (user.enabled ? 'Disable' : 'Enable') +
          '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('');
  }

  async function loadCustomers() {
    const body = document.getElementById('customersBody');
    const info = document.getElementById('customersInfo');
    body.innerHTML = '<tr><td colspan="6"><div class="em-skeleton em-skeleton-line w-50 my-2"></div></td></tr>';

    try {
      const customers = await EM.api('/admin/customers');
      info.textContent = customers.length + ' customer' + (customers.length === 1 ? '' : 's') + ' registered';
      body.innerHTML = customers.length
        ? userRows(customers, 'customer')
        : '<tr><td colspan="6" class="text-center text-muted py-4">No customers yet.</td></tr>';
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      info.textContent = 'Could not load customers';
      body.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">' +
        EM.escapeHtml(error.message || 'Please try again.') + '</td></tr>';
    }
  }

  function bindCustomerActions() {
    document.getElementById('customersBody').addEventListener('click', async (event) => {
      const btn = event.target.closest('[data-customer-toggle]');
      if (!btn) return;

      const id = btn.dataset.customerToggle;
      const enable = btn.dataset.enabled !== 'true';
      btn.disabled = true;

      try {
        await EM.api('/admin/customers/' + id + '/status', { method: 'PUT', body: { enabled: enable } });
        EM.toast(enable ? 'Customer account enabled' : 'Customer account disabled - they can no longer sign in', 'success');
        loadCustomers();
      } catch (error) {
        toastError(error, 'Could not change the account status');
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* -------------------------------------------------------- sellers */
  async function loadSellers() {
    const body = document.getElementById('sellersBody');
    const info = document.getElementById('sellersInfo');
    body.innerHTML = '<tr><td colspan="6"><div class="em-skeleton em-skeleton-line w-50 my-2"></div></td></tr>';

    try {
      const sellers = await EM.api('/admin/sellers');
      info.textContent = sellers.length + ' seller account' + (sellers.length === 1 ? '' : 's');
      body.innerHTML = sellers.length
        ? userRows(sellers, 'seller')
        : '<tr><td colspan="6" class="text-center text-muted py-4">' +
          'No sellers yet - create one with the form above.</td></tr>';
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      info.textContent = 'Could not load sellers';
      body.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">' +
        EM.escapeHtml(error.message || 'Please try again.') + '</td></tr>';
    }
  }

  function bindSellerForm() {
    const form = document.getElementById('sellerForm');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      EM.clearFieldErrors(form);
      EM.clearFormAlert(form);

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      const payload = {
        name: form.querySelector('[name="name"]').value.trim(),
        email: form.querySelector('[name="email"]').value.trim(),
        password: form.querySelector('[name="password"]').value,
        phone: form.querySelector('[name="phone"]').value.trim() || null
      };

      const btn = document.getElementById('sellerSubmitBtn');
      EM.setButtonLoading(btn, true, 'Creating…');

      try {
        await EM.api('/admin/sellers', { method: 'POST', body: payload });
        EM.toast('Seller account created for ' + payload.email, 'success');
        form.reset();
        form.classList.remove('was-validated');
        loadSellers();
        loadStats();
      } catch (error) {
        if (error.status === 401) return;
        if (!(error.fieldErrors && EM.setFieldErrors(form, error.fieldErrors))) {
          EM.showFormAlert(form, error.message || 'Could not create the seller account');
        }
      } finally {
        EM.setButtonLoading(btn, false);
      }
    });
  }

  function bindSellerActions() {
    document.getElementById('sellersBody').addEventListener('click', async (event) => {
      const btn = event.target.closest('[data-seller-toggle]');
      if (!btn) return;

      const id = btn.dataset.sellerToggle;
      const enable = btn.dataset.enabled !== 'true';
      btn.disabled = true;

      try {
        await EM.api('/admin/sellers/' + id + '/status', { method: 'PUT', body: { enabled: enable } });
        EM.toast(enable ? 'Seller account enabled' : 'Seller account disabled - they can no longer sign in', 'success');
        loadSellers();
      } catch (error) {
        toastError(error, 'Could not change the account status');
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* --------------------------------------------------------- orders */
  async function loadOrders() {
    const holder = document.getElementById('adminOrdersList');
    const info = document.getElementById('adminOrdersInfo');
    holder.innerHTML = '<div class="em-order-card"><div class="em-order-body">' +
      '<div class="em-skeleton em-skeleton-line w-75 mb-2"></div>' +
      '<div class="em-skeleton em-skeleton-line w-50"></div></div></div>';

    try {
      const orders = await EM.api('/admin/orders');

      if (!Array.isArray(orders) || orders.length === 0) {
        info.textContent = 'No orders yet';
        holder.innerHTML = '<div class="em-empty text-center py-5">' +
          '<i class="bi bi-receipt"></i>' +
          '<h5 class="mt-3">No orders yet</h5>' +
          '<p class="text-muted mb-0">Orders placed by customers will appear here.</p></div>';
        return;
      }

      const pending = orders.filter((o) => o.status === 'PLACED' || o.status === 'CONFIRMED').length;
      info.textContent = orders.length + ' order' + (orders.length === 1 ? '' : 's') +
        ' • ' + pending + ' pending';
      holder.innerHTML = orders.map(orderCard).join('');
      EM.applyImageFallbacks(holder);
    } catch (error) {
      if (error.status === 401 || error.status === 403) return;
      info.textContent = 'Could not load orders';
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

    return '<article class="em-order-card">' +
      '<div class="em-order-head">' +
        '<div><span>Order ID</span><strong class="text-primary">' + EM.escapeHtml(order.orderNumber) + '</strong></div>' +
        '<div><span>Placed</span><strong>' + EM.formatDate(order.createdAt) + '</strong></div>' +
        '<div><span>Customer</span><strong>' + EM.escapeHtml(order.customerName || '—') + '</strong></div>' +
        '<div><span>Total</span><strong>' + EM.formatPrice(order.total) + '</strong></div>' +
        '<div class="ms-auto text-md-end">' +
          '<span>Status</span>' +
          '<div><span class="em-status em-status--' + EM.escapeHtml(order.status) + '">' +
            EM.escapeHtml(order.status) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="em-order-body">' +
        '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">' +
          '<span class="small text-muted">' +
            quantity + ' item' + (quantity === 1 ? '' : 's') +
            ' • ' + EM.escapeHtml(order.customerEmail || '') +
            ' • Ship to ' + EM.escapeHtml(order.city || '—') + ', ' + EM.escapeHtml(order.state || '—') +
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
    document.getElementById('adminOrdersList').addEventListener('change', async (event) => {
      const select = event.target.closest('[data-order-status]');
      if (!select || !select.value) return;

      const orderNumber = select.dataset.orderStatus;
      const status = select.value;
      select.disabled = true;

      try {
        await EM.api('/admin/orders/' + encodeURIComponent(orderNumber) + '/status',
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
