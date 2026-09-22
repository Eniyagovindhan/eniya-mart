/* =====================================================================
 * ENIYA MART - shared navigation behaviour (loaded on every page)
 * ===================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    renderAuthArea();
    bindSearch();
    bindLogout();
    bindBurger();
    loadCategoryMenu();
    bindBackToTop();
  });

  /* ---------------- Signed in / signed out navigation ------------- */
  function renderAuthArea() {
    const top = document.getElementById('navAuthTop');
    const main = document.getElementById('navAuthMain');
    const link = document.getElementById('navAuthLink');
    const logoutBtn = document.getElementById('navLogoutBtn');
    const user = EM.Auth.user();

    if (user) {
      const role = user.role;
      if (top) top.textContent = 'Hello, ' + EM.firstName(user.name);
      if (main) main.textContent = role === 'ADMIN' ? 'Admin Console' : role === 'SELLER' ? 'Seller Hub' : 'Account & Lists';
      if (link) link.setAttribute('href', role === 'CUSTOMER' || !role ? '/account.html' : EM.dashboardFor(role));
      if (logoutBtn) logoutBtn.classList.remove('d-none');
      renderDashboardLink(user);
      refreshSession(user);
    } else {
      if (top) top.textContent = 'Hello, sign in';
      if (main) main.textContent = 'Account & Lists';
      if (link) link.setAttribute('href', '/login.html');
      if (logoutBtn) logoutBtn.classList.add('d-none');
      renderDashboardLink(null);
      setCartCount(0);
    }
  }

  /* Role aware shortcut in the second nav row (injected - works on every page) */
  function renderDashboardLink(user) {
    const nav2 = document.querySelector('.em-nav2');
    if (!nav2) return;
    let dash = document.getElementById('navDashLink');
    if (!user) {
      if (dash) dash.remove();
      return;
    }
    if (!dash) {
      dash = document.createElement('a');
      dash.id = 'navDashLink';
      dash.className = 'em-nav2-link em-nav2-dash fw-bold d-none d-md-inline';
      const tagline = nav2.querySelector('.em-nav2-tagline');
      nav2.insertBefore(dash, tagline || null);
    }
    const role = user.role;
    if (role === 'ADMIN') {
      dash.textContent = 'Admin Console';
      dash.href = '/admin-dashboard.html';
    } else if (role === 'SELLER') {
      dash.textContent = 'Seller Hub';
      dash.href = '/seller-dashboard.html';
    } else {
      dash.textContent = 'My Dashboard';
      dash.href = '/customer-dashboard.html';
    }
  }

  /* Refresh profile + cart badge quietly in the background */
  async function refreshSession(user) {
    try {
      const profile = await EM.api('/account', { silent: true });
      EM.Auth.updateUser(profile);
      const top = document.getElementById('navAuthTop');
      if (top) top.textContent = 'Hello, ' + EM.firstName(profile.name);
    } catch (error) {
      if (error.status === 401) return;   // api() already cleared the session
      if (error.status === 403) return;
    }

    try {
      const cart = await EM.api('/cart', { silent: true });
      setCartCount(cart.totalItems || 0);
    } catch (error) {
      if (error.status === 401) return;
      setCartCount(0);
    }
  }

  function setCartCount(count) {
    const badge = document.getElementById('cartCount');
    if (!badge) return;
    const value = Number(count || 0);
    badge.textContent = value > 99 ? '99+' : String(value);
    badge.classList.toggle('em-cart-badge--hidden', value === 0);
  }

  /* ------------------------- Search bar --------------------------- */
  function bindSearch() {
    const form = document.getElementById('navSearchForm');
    const input = document.getElementById('navSearchInput');
    const select = document.getElementById('navSearchCategory');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = (input ? input.value : '').trim();
      const category = select ? select.value : '';
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      window.location.href = '/products.html?' + params.toString();
    });

    // pre-fill from ?q= / ?category= when coming back to the page
    const currentQ = EM.qs('q');
    const currentCategory = EM.qs('category');
    if (input && currentQ) input.value = currentQ;
    if (select && currentCategory) select.value = currentCategory;
  }

  /* ------------------------- Logout ------------------------------- */
  function bindLogout() {
    const button = document.getElementById('navLogoutBtn');
    if (!button) return;
    button.addEventListener('click', () => {
      EM.Auth.clear();
      EM.toast('You have been signed out. See you soon!', 'success');
      window.location.href = '/';
    });
  }

  /* ------------------------- Mobile menu -------------------------- */
  function bindBurger() {
    const burger = document.getElementById('navBurger');
    const nav = document.querySelector('.em-nav');
    if (!burger || !nav) return;
    burger.addEventListener('click', () => nav.classList.toggle('em-nav--open'));
  }

  /* ------------------- Categories dropdown ------------------------ */
  async function loadCategoryMenu() {
    const menu = document.getElementById('navCategoryMenu');
    const select = document.getElementById('navSearchCategory');
    if (!menu && !select) return;

    try {
      const categories = await EM.api('/products/categories', { auth: false, silent: true });
      if (Array.isArray(categories)) {
        if (menu) {
          menu.innerHTML = categories.map((item) =>
            '<li><a class="dropdown-item" href="/products.html?category=' +
            encodeURIComponent(item.category) + '">' +
            EM.escapeHtml(item.category) +
            ' <span class="text-muted">' + item.count + '</span></a></li>'
          ).join('');
        }
        if (select) {
          categories.forEach((item) => {
            const option = document.createElement('option');
            option.value = item.category;
            option.textContent = item.category;
            select.appendChild(option);
          });
        }
      }
    } catch (error) {
      // categories are optional decoration - ignore failures
    }
  }

  /* ------------------------- Back to top -------------------------- */
  function bindBackToTop() {
    document.querySelectorAll('[data-back-to-top]').forEach((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }
})();
