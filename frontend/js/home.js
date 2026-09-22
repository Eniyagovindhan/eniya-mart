/* =====================================================================
 * ENIYA MART - Home page (categories + featured + new arrivals)
 * ===================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadFeatured();
    loadNewArrivals();
  });

  async function loadCategories() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;

    EM.showSkeletons(grid, 4);

    try {
      const categories = await EM.api('/products/categories', { auth: false });

      if (!Array.isArray(categories) || categories.length === 0) {
        grid.innerHTML = '<div class="col-12"><div class="em-empty text-center py-4">' +
          '<i class="bi bi-grid"></i><h5 class="mt-3">No categories yet</h5>' +
          '<p class="text-muted mb-0">Products will appear here as soon as the catalogue is seeded.</p></div></div>';
        return;
      }

      grid.innerHTML = categories.map((item) => '' +
        '<a class="em-cat-card" href="/products.html?category=' + encodeURIComponent(item.category) + '">' +
          '<img src="' + EM.categoryImage(item.category) + '" alt="' + EM.escapeHtml(item.category) + '" loading="lazy" data-fallback>' +
          '<div class="em-cat-body">' +
            '<h3>' + EM.escapeHtml(item.category) + '</h3>' +
            '<span>Explore ' + item.count + ' product' + (item.count === 1 ? '' : 's') + ' &rarr;</span>' +
          '</div>' +
        '</a>').join('');

      EM.applyImageFallbacks(grid);
    } catch (error) {
      grid.innerHTML = '<div class="col-12"><div class="em-empty text-center py-4">' +
        '<i class="bi bi-cloud-slash text-danger"></i>' +
        '<h5 class="mt-3">Could not load categories</h5>' +
        '<p class="text-muted"></p>' +
        '<button class="btn btn-outline-dark" type="button" id="retryCategories">Try again</button>' +
        '</div></div>';
      grid.querySelector('.em-empty p').textContent = error.message;
      const retry = grid.querySelector('#retryCategories');
      if (retry) retry.addEventListener('click', loadCategories);
    }
  }

  async function loadFeatured() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;

    EM.showSkeletons(grid, 8);

    try {
      const products = await EM.api('/products/featured', { auth: false });

      if (!Array.isArray(products) || products.length === 0) {
        grid.innerHTML = '<div class="col-12"><div class="em-empty text-center py-4">' +
          '<i class="bi bi-star"></i><h5 class="mt-3">No featured products yet</h5>' +
          '<p class="text-muted mb-2">Browse the full catalogue instead.</p>' +
          '<a class="btn btn-em" href="/products.html">Shop all products</a></div></div>';
        return;
      }

      grid.innerHTML = products.map((product) =>
        '<div class="col-6 col-md-4 col-lg-3">' + EM.productCard(product) + '</div>'
      ).join('');

      EM.bindAddToCart(grid);
    } catch (error) {
      grid.innerHTML = '<div class="col-12"><div class="em-empty text-center py-4">' +
        '<i class="bi bi-cloud-slash text-danger"></i>' +
        '<h5 class="mt-3">Could not load featured products</h5>' +
        '<p class="text-muted"></p>' +
        '<button class="btn btn-outline-dark" type="button" id="retryFeatured">Try again</button>' +
        '</div></div>';
      grid.querySelector('.em-empty p').textContent = error.message;
      const retry = grid.querySelector('#retryFeatured');
      if (retry) retry.addEventListener('click', loadFeatured);
    }
  }

  async function loadNewArrivals() {
    const grid = document.getElementById('newGrid');
    if (!grid) return;

    EM.showSkeletons(grid, 4);

    try {
      const page = await EM.api('/products', {
        auth: false,
        params: { sort: 'newest', page: 0, size: 4 }
      });

      const products = page.content || [];
      if (products.length === 0) {
        grid.innerHTML = '<div class="col-12"><div class="em-empty text-center py-4">' +
          '<i class="bi bi-box-seam"></i><h5 class="mt-3">Nothing new right now</h5>' +
          '<p class="text-muted mb-0">Check back soon!</p></div></div>';
        return;
      }

      grid.innerHTML = products.map((product) =>
        '<div class="col-6 col-md-4 col-lg-3">' + EM.productCard(product) + '</div>'
      ).join('');

      EM.bindAddToCart(grid);
    } catch (error) {
      EM.showErrorState(grid, error.message, loadNewArrivals);
    }
  }
})();
