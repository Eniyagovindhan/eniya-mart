/* =====================================================================
 * ENIYA MART - product listing: search, category filter, price range,
 * sorting and pagination (all driven by query string parameters).
 * ===================================================================== */
(function () {
  'use strict';

  const state = {
    q: EM.qs('q') || '',
    category: EM.qs('category') || '',
    minPrice: EM.qs('minPrice') || '',
    maxPrice: EM.qs('maxPrice') || '',
    sort: EM.qs('sort') || 'featured',
    page: Number(EM.qs('page') || 0)
  };

  let categoryCache = [];

  document.addEventListener('DOMContentLoaded', () => {
    syncControls();
    loadCategories();
    loadProducts();
    bindEvents();
  });

  /* --------------------------------------------------------------- */
  function syncControls() {
    const sort = document.getElementById('sortSelect');
    if (sort) sort.value = state.sort;
    const min = document.getElementById('minPrice');
    const max = document.getElementById('maxPrice');
    if (min) min.value = state.minPrice;
    if (max) max.value = state.maxPrice;
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);
    if (state.minPrice) params.set('minPrice', state.minPrice);
    if (state.maxPrice) params.set('maxPrice', state.maxPrice);
    if (state.sort && state.sort !== 'featured') params.set('sort', state.sort);
    if (state.page) params.set('page', String(state.page));
    history.replaceState(null, '', '/products.html' + (params.toString() ? '?' + params.toString() : ''));
  }

  /* ------------------------------------------------ categories sidebar */
  async function loadCategories() {
    const holder = document.getElementById('categoryFilters');
    try {
      categoryCache = await EM.api('/products/categories', { auth: false });

      if (!categoryCache.length) {
        holder.innerHTML = '<span class="text-muted small">No categories yet.</span>';
        return;
      }

      const allChecked = state.category ? '' : 'checked';
      let html = '<label class="em-filter-option"><input type="radio" name="categoryFilter" value="" ' + allChecked + '> <span>All products</span></label>';

      html += categoryCache.map((item) => {
        const checked = state.category === item.category ? 'checked' : '';
        return '<label class="em-filter-option">' +
          '<input type="radio" name="categoryFilter" value="' + EM.escapeHtml(item.category) + '" ' + checked + '>' +
          '<span>' + EM.escapeHtml(item.category) + '</span>' +
          '<span class="count ms-auto">(' + item.count + ')</span>' +
          '</label>';
      }).join('');

      holder.innerHTML = html;

      holder.querySelectorAll('input[name="categoryFilter"]').forEach((radio) => {
        radio.addEventListener('change', () => {
          state.category = radio.value;
          state.page = 0;
          loadProducts();
        });
      });
    } catch (error) {
      holder.innerHTML = '<span class="text-muted small">Categories unavailable right now.</span>';
    }
  }

  /* ------------------------------------------------------ product grid */
  async function loadProducts() {
    const grid = document.getElementById('productGrid');
    const pagination = document.getElementById('pagination');
    const chips = document.getElementById('activeChips');
    const info = document.getElementById('resultsInfo');
    const count = document.getElementById('resultsCount');
    const title = document.getElementById('pageTitle');

    updateUrl();
    renderChips(chips);
    if (pagination) pagination.innerHTML = '';
    EM.showSkeletons(grid, 8);
    if (info) info.textContent = 'Loading products…';
    if (count) count.innerHTML = '<strong>Loading…</strong>';
    if (title) {
      title.textContent = state.q
        ? 'Results for “' + EM.escapeHtml(state.q) + '”'
        : (state.category ? state.category : 'All Products');
    }

    try {
      const page = await EM.api('/products', {
        auth: false,
        params: {
          search: state.q,
          category: state.category,
          minPrice: state.minPrice,
          maxPrice: state.maxPrice,
          sort: state.sort,
          page: state.page,
          size: 12
        }
      });

      const products = page.content || [];
      const total = page.totalElements || 0;

      if (info) {
        info.textContent = total === 0
          ? 'No products matched your filters'
          : 'Showing ' + (page.page * page.size + 1) + '–' + (page.page * page.size + products.length) + ' of ' + total.toLocaleString() + ' products';
      }
      if (count) count.innerHTML = '<strong>' + total.toLocaleString() + '</strong>&nbsp;result' + (total === 1 ? '' : 's');

      if (products.length === 0) {
        EM.showEmptyState(
          grid,
          'search',
          'No products found',
          'Try a different search term or clear your filters.',
          '<button class="btn btn-em" type="button" id="emptyClear">Clear all filters</button>'
        );
        const btn = document.getElementById('emptyClear');
        if (btn) btn.addEventListener('click', clearAll);
        if (pagination) pagination.innerHTML = '';
        return;
      }

      grid.innerHTML = products.map((product) =>
        '<div class="col-6 col-md-4 col-lg-3">' + EM.productCard(product) + '</div>'
      ).join('');

      EM.bindAddToCart(grid);
      renderPagination(pagination, page);
    } catch (error) {
      EM.showErrorState(grid, error.message, loadProducts);
    }
  }

  /* ------------------------------------------------------------ chips */
  function renderChips(container) {
    if (!container) return;
    const chips = [];

    if (state.q) chips.push(chip('Search: “' + state.q + '”', 'q'));
    if (state.category) chips.push(chip('Category: ' + state.category, 'category'));
    if (state.minPrice || state.maxPrice) {
      const label = (state.minPrice ? '$' + state.minPrice : '$0') + ' – ' + (state.maxPrice ? '$' + state.maxPrice : 'any');
      chips.push(chip('Price: ' + label, 'price'));
    }

    container.innerHTML = chips.join('');

    container.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.remove;
        if (key === 'q') state.q = '';
        if (key === 'category') state.category = '';
        if (key === 'price') { state.minPrice = ''; state.maxPrice = ''; document.getElementById('minPrice').value = ''; document.getElementById('maxPrice').value = ''; }
        state.page = 0;
        syncControls();
        loadCategories();
        loadProducts();
      });
    });

    function chip(label, key) {
      return '<span class="em-chip">' + EM.escapeHtml(label) +
        '<button type="button" class="border-0 bg-transparent p-0" data-remove="' + key + '" aria-label="Remove filter">' +
        '<i class="bi bi-x-circle"></i></button></span>';
    }
  }

  /* ------------------------------------------------------- pagination */
  function renderPagination(holder, page) {
    if (!holder) return;
    const totalPages = page.totalPages || 0;
    if (totalPages <= 1) { holder.innerHTML = ''; return; }

    let html = '<button class="em-page-btn" type="button" data-goto="' + (page.page - 1) + '"' +
      (page.page === 0 ? ' disabled' : '') + ' aria-label="Previous page">‹</button>';

    const start = Math.max(0, page.page - 2);
    const end = Math.min(totalPages, start + 5);

    for (let i = start; i < end; i++) {
      html += '<button class="em-page-btn ' + (i === page.page ? 'active' : '') + '" type="button" data-goto="' + i + '">' + (i + 1) + '</button>';
    }

    html += '<button class="em-page-btn" type="button" data-goto="' + (page.page + 1) + '"' +
      (page.page >= totalPages - 1 ? ' disabled' : '') + ' aria-label="Next page">›</button>';

    holder.innerHTML = html;

    holder.querySelectorAll('[data-goto]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        state.page = Number(button.dataset.goto);
        loadProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  /* ----------------------------------------------------------- events */
  function bindEvents() {
    const sort = document.getElementById('sortSelect');
    if (sort) {
      sort.addEventListener('change', () => {
        state.sort = sort.value;
        state.page = 0;
        loadProducts();
      });
    }

    const apply = document.getElementById('applyPrice');
    if (apply) apply.addEventListener('click', applyPriceFilter);

    ['minPrice', 'maxPrice'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') { event.preventDefault(); applyPriceFilter(); }
        });
      }
    });

    const clear = document.getElementById('clearFilters');
    if (clear) clear.addEventListener('click', clearAll);
  }

  function applyPriceFilter() {
    const minInput = document.getElementById('minPrice');
    const maxInput = document.getElementById('maxPrice');
    const feedback = document.querySelector('[data-error-for="price"]');

    minInput.classList.remove('is-invalid');
    maxInput.classList.remove('is-invalid');
    if (feedback) feedback.classList.add('d-none');

    const min = minInput.value === '' ? '' : Number(minInput.value);
    const max = maxInput.value === '' ? '' : Number(maxInput.value);

    if ((min !== '' && (isNaN(min) || min < 0)) || (max !== '' && (isNaN(max) || max < 0))) {
      showPriceError('Prices must be zero or more');
      return;
    }
    if (min !== '' && max !== '' && min > max) {
      showPriceError('Minimum price cannot be higher than maximum price');
      return;
    }

    state.minPrice = min;
    state.maxPrice = max;
    state.page = 0;
    loadProducts();

    function showPriceError(message) {
      minInput.classList.add('is-invalid');
      if (feedback) {
        feedback.textContent = message;
        feedback.classList.remove('d-none');
      }
    }
  }

  function clearAll() {
    state.q = '';
    state.category = '';
    state.minPrice = '';
    state.maxPrice = '';
    state.sort = 'featured';
    state.page = 0;

    const searchInput = document.getElementById('navSearchInput');
    if (searchInput) searchInput.value = '';
    const searchSelect = document.getElementById('navSearchCategory');
    if (searchSelect) searchSelect.value = '';

    syncControls();
    loadCategories();
    loadProducts();
    EM.toast('Filters cleared', 'info');
  }
})();
