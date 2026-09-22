/* =====================================================================
 * ENIYA MART - product details page (stock aware quantity, add to cart,
 * buy now and related products).
 * ===================================================================== */
(function () {
  'use strict';

  let product = null;
  let maxQty = 1;

  document.addEventListener('DOMContentLoaded', () => {
    const id = EM.qs('id');
    if (!id || Number.isNaN(Number(id))) {
      showError('Invalid product link', 'The product id is missing from the address.');
      return;
    }
    loadProduct(Number(id));
  });

  /* ------------------------------------------------------------- load */
  async function loadProduct(id) {
    const loading = document.getElementById('detailLoading');
    const card = document.getElementById('detailCard');

    try {
      product = await EM.api('/products/' + id, { auth: false });

      loading.classList.add('d-none');
      card.classList.remove('d-none');

      render(product);
      loadRelated(product);
    } catch (error) {
      if (error.status === 404) {
        showError('Product not found', 'The product you are looking for may have been removed.');
      } else {
        showError('Could not load this product', error.message);
      }
    }
  }

  function showError(title, message) {
    document.getElementById('detailLoading').classList.add('d-none');
    document.getElementById('detailCard').classList.add('d-none');
    document.getElementById('relatedSection').classList.add('d-none');
    const box = document.getElementById('detailError');
    box.classList.remove('d-none');
    document.getElementById('detailErrorTitle').textContent = title;
    document.getElementById('detailErrorMessage').textContent = message;
  }

  /* ------------------------------------------------------------ render */
  function render(p) {
    document.title = p.name + ' – ENIYA MART';
    document.getElementById('crumbCategory').textContent = p.category;
    document.getElementById('crumbCategory').href = '/products.html?category=' + encodeURIComponent(p.category);
    document.getElementById('crumbName').textContent = p.name;

    const image = document.getElementById('detailImage');
    image.src = p.imageUrl || EM.categoryImage(p.category);
    image.alt = p.name;
    EM.imageFallback(image);

    document.getElementById('detailBrand').textContent = p.brand || p.category;
    document.getElementById('detailName').textContent = p.name;
    document.getElementById('detailRating').innerHTML =
      EM.ratingHtml(p.rating, p.reviewsCount) +
      '<span class="ms-2 text-muted" style="font-size:13px">' + (p.reviewsCount || 0).toLocaleString() + ' ratings</span>';

    document.getElementById('detailPrice').innerHTML = (p.discountPrice != null)
      ? '<span class="em-price-big" style="color:var(--em-price)">' + EM.formatPrice(p.effectivePrice) + '</span> ' +
        '<span class="em-price-was">' + EM.formatPrice(p.price) + '</span> ' +
        '<span class="badge bg-danger rounded-pill ms-1">Save ' + EM.formatPrice(Number(p.price) - Number(p.effectivePrice)) + '</span>'
      : '<span class="em-price-big">' + EM.formatPrice(p.price) + '</span>';

    document.getElementById('detailDescription').textContent =
      p.description || 'No description is available for this product.';

    document.getElementById('rowBrand').textContent = p.brand || '—';
    document.getElementById('rowCategory').textContent = p.category;
    document.getElementById('rowAvailability').textContent = p.inStock ? 'In stock' : 'Out of stock';

    /* stock line */
    maxQty = Math.max(1, Math.min(Number(p.stock || 0), 999));
    const stockLine = document.getElementById('detailStockLine');
    const buyStock = document.getElementById('buyStock');

    if (!p.inStock) {
      stockLine.innerHTML = '<span class="em-stock-no"><i class="bi bi-x-circle"></i> Out of stock</span>';
      buyStock.innerHTML = '<span class="em-stock-no">Currently unavailable</span>';
      maxQty = 0;
    } else if (p.stock <= 10) {
      stockLine.innerHTML = '<span class="em-stock-ok">In stock</span> ' +
        '<span class="em-low-stock ms-2">Only ' + p.stock + ' left — order soon</span>';
      buyStock.innerHTML = '<span class="em-stock-ok">In stock</span>';
    } else {
      stockLine.innerHTML = '<span class="em-stock-ok"><i class="bi bi-check-circle"></i> In stock</span>';
      buyStock.innerHTML = '<span class="em-stock-ok">In stock</span>';
    }

    document.getElementById('buyPrice').innerHTML = EM.priceHtml(p);

    /* quantity widget */
    const input = document.getElementById('qtyInput');
    input.value = 1;
    input.max = Math.max(maxQty, 1);
    updateQtyHint();

    if (maxQty === 0) {
      document.getElementById('addToCartBtn').disabled = true;
      document.getElementById('buyNowBtn').disabled = true;
      document.getElementById('qtyMinus').disabled = true;
      document.getElementById('qtyPlus').disabled = true;
      input.disabled = true;
    }

    bindQtyControls();
    bindActions();
  }

  /* ------------------------------------------------------- qty controls */
  function bindQtyControls() {
    const input = document.getElementById('qtyInput');
    const minus = document.getElementById('qtyMinus');
    const plus = document.getElementById('qtyPlus');

    if (minus.dataset.bound === '1') return;
    minus.dataset.bound = '1';

    minus.addEventListener('click', () => setQty(currentQty() - 1));
    plus.addEventListener('click', () => setQty(currentQty() + 1));
    input.addEventListener('change', () => setQty(Number(input.value)));
    input.addEventListener('input', updateQtyHint);

    function setQty(value) {
      let next = Number.isFinite(value) ? Math.round(value) : 1;
      if (next < 1) next = 1;
      if (next > maxQty) {
        next = maxQty;
        EM.toast('Only ' + maxQty + ' unit(s) available', 'warning');
      }
      input.value = next;
      updateQtyHint();
    }
  }

  function currentQty() {
    const value = Number(document.getElementById('qtyInput').value);
    return Number.isFinite(value) && value >= 1 ? Math.round(value) : 1;
  }

  function updateQtyHint() {
    const hint = document.getElementById('qtyHint');
    if (!hint || !product) return;
    if (maxQty === 0) {
      hint.textContent = 'This product is out of stock.';
      return;
    }
    hint.textContent = 'Max ' + maxQty + ' available • ' + EM.formatPrice(product.effectivePrice) + ' each';
  }

  /* ------------------------------------------------------------ actions */
  function bindActions() {
    const addBtn = document.getElementById('addToCartBtn');
    const buyBtn = document.getElementById('buyNowBtn');

    if (addBtn.dataset.bound === '1') return;
    addBtn.dataset.bound = '1';

    addBtn.addEventListener('click', () => {
      EM.addToCart(product.id, currentQty(), addBtn);
    });

    buyBtn.addEventListener('click', () => {
      if (!EM.Auth.isLoggedIn()) {
        EM.toast('Please sign in to buy this item', 'warning');
        setTimeout(() => { window.location.href = EM.loginUrl(); }, 600);
        return;
      }
      localStorage.setItem(EM.BUY_NOW_KEY, JSON.stringify({
        productId: product.id,
        quantity: currentQty()
      }));
      window.location.href = '/checkout.html?mode=buy';
    });
  }

  /* ---------------------------------------------------- related products */
  async function loadRelated(p) {
    const grid = document.getElementById('relatedGrid');
    const section = document.getElementById('relatedSection');
    if (!grid) return;

    EM.showSkeletons(grid, 4);

    try {
      const page = await EM.api('/products', {
        auth: false,
        params: { category: p.category, page: 0, size: 8 }
      });

      const related = (page.content || []).filter((item) => item.id !== p.id).slice(0, 4);

      if (related.length === 0) {
        section.classList.add('d-none');
        return;
      }

      grid.innerHTML = related.map((item) =>
        '<div class="col-6 col-md-4 col-lg-3">' + EM.productCard(item) + '</div>'
      ).join('');

      EM.bindAddToCart(grid);
    } catch (error) {
      section.classList.add('d-none');
    }
  }
})();
