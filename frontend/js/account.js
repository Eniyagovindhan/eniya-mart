/* =====================================================================
 * ENIYA MART - My Account (profile, edit details, change password)
 * ===================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (!EM.requireAuth()) return;
    loadProfile();
    loadStats();
    bindEditForm();
    bindPasswordForm();
    bindLogout();
  });

  /* --------------------------------------------------------- profile */
  async function loadProfile() {
    try {
      const profile = await EM.api('/account');
      EM.Auth.updateUser(profile);

      document.getElementById('acctAvatar').textContent =
        (profile.name || '?').trim().charAt(0).toUpperCase();
      document.getElementById('acctName').textContent = profile.name;
      document.getElementById('acctEmail').textContent = profile.email;
      document.getElementById('acctRole').textContent =
        profile.role === 'ADMIN' ? 'Administrator' : profile.role === 'SELLER' ? 'Seller' : 'Customer';

      addDashboardLink(profile.role);

      document.getElementById('rowName').textContent = profile.name;
      document.getElementById('rowEmail').textContent = profile.email;
      document.getElementById('rowPhone').textContent = profile.phone || 'Not provided';
      document.getElementById('rowMember').textContent = EM.formatDate(profile.createdAt);

      document.getElementById('editName').value = profile.name || '';
      document.getElementById('editPhone').value = profile.phone || '';
    } catch (error) {
      if (error.status === 401) return;
      EM.toast(error.message, 'error');
    }
  }

  /* -------------------------------------------------- dashboard shortcut */
  function addDashboardLink(role) {
    const side = document.querySelector('.em-account-side .list-group');
    if (!side || document.getElementById('acctDashLink')) return;
    const link = document.createElement('a');
    link.id = 'acctDashLink';
    link.className = 'list-group-item';
    if (role === 'ADMIN') {
      link.href = '/admin-dashboard.html';
      link.innerHTML = '<i class="bi bi-shield-lock me-2"></i>Admin Console';
    } else if (role === 'SELLER') {
      link.href = '/seller-dashboard.html';
      link.innerHTML = '<i class="bi bi-shop me-2"></i>Seller Hub';
    } else {
      link.href = '/customer-dashboard.html';
      link.innerHTML = '<i class="bi bi-speedometer2 me-2"></i>My Dashboard';
    }
    side.insertBefore(link, side.firstChild);
  }

  /* ----------------------------------------------------------- stats */
  async function loadStats() {
    try {
      const orders = await EM.api('/orders');
      const count = orders.length;
      const spent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      document.getElementById('statOrders').textContent = count;
      document.getElementById('statSpent').textContent = EM.formatPrice(spent);
    } catch (error) {
      if (error.status === 401) return;
      document.getElementById('statOrders').textContent = '—';
      document.getElementById('statSpent').textContent = '—';
    }
  }

  /* ----------------------------------------------------- edit details */
  function bindEditForm() {
    const toggle = document.getElementById('editToggle');
    const cancel = document.getElementById('editCancel');
    const form = document.getElementById('profileForm');
    const display = document.getElementById('profileDisplay');
    const save = document.getElementById('profileSave');

    if (!toggle) return;

    toggle.addEventListener('click', () => {
      display.classList.add('d-none');
      form.classList.remove('d-none');
      document.getElementById('editName').focus();
    });

    cancel.addEventListener('click', () => {
      EM.clearFieldErrors(form);
      EM.clearFormAlert(form);
      form.classList.add('d-none');
      display.classList.remove('d-none');
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      EM.clearFieldErrors(form);
      EM.clearFormAlert(form);

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      EM.setButtonLoading(save, true, 'Saving…');

      try {
        const payload = {
          name: document.getElementById('editName').value.trim(),
          phone: document.getElementById('editPhone').value.trim() || null
        };
        const profile = await EM.api('/account', { method: 'PUT', body: payload });
        EM.Auth.updateUser(profile);

        EM.setButtonLoading(save, false);
        form.classList.add('d-none');
        display.classList.remove('d-none');
        await loadProfile();
        EM.toast('Your profile has been updated', 'success');
      } catch (error) {
        EM.setButtonLoading(save, false);
        const applied = error.fieldErrors ? EM.setFieldErrors(form, error.fieldErrors) : false;
        if (!applied) EM.showFormAlert(form, error.message);
      }
    });
  }

  /* -------------------------------------------------- change password */
  function bindPasswordForm() {
    const form = document.getElementById('passwordForm');
    const save = document.getElementById('passwordSave');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      EM.clearFieldErrors(form);
      EM.clearFormAlert(form);

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      const current = document.getElementById('currentPassword').value;
      const next = document.getElementById('newPassword').value;
      const confirm = document.getElementById('confirmPassword').value;

      if (next !== confirm) {
        const input = document.getElementById('confirmPassword');
        input.classList.add('is-invalid');
        const feedback = form.querySelector('[data-error-for="confirmPassword"]');
        if (feedback) {
          feedback.textContent = 'Passwords do not match';
          feedback.classList.remove('d-none');
        }
        return;
      }

      if (current === next) {
        EM.showFormAlert(form, 'The new password must be different from the current one.');
        return;
      }

      EM.setButtonLoading(save, true, 'Updating…');

      try {
        const response = await EM.api('/account/password', {
          method: 'PUT',
          body: { currentPassword: current, newPassword: next }
        });
        EM.setButtonLoading(save, false);
        form.reset();
        form.classList.remove('was-validated');
        EM.toast(response.message, 'success', 4500);
      } catch (error) {
        EM.setButtonLoading(save, false);
        const applied = error.fieldErrors ? EM.setFieldErrors(form, error.fieldErrors) : false;
        if (!applied) EM.showFormAlert(form, error.message);
      }
    });
  }

  /* ----------------------------------------------------------- logout */
  function bindLogout() {
    const button = document.getElementById('accountLogout');
    if (!button) return;
    button.addEventListener('click', () => {
      EM.Auth.clear();
      EM.toast('You have been signed out. See you soon!', 'success');
      window.location.href = '/';
    });
  }
})();
