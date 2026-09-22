/* =====================================================================
 * ENIYA MART - authentication pages
 * Handles: login, registration, forgot password, reset password,
 * password visibility toggles and client side validation.
 * ===================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    bindPasswordToggles();

    const page = document.body.dataset.page;

    if (page === 'login') initLogin();
    if (page === 'register') initRegister();
    if (page === 'forgot') initForgot();
    if (page === 'reset') initReset();
  });

  /* -------------------------------------------------- show/hide password */
  function bindPasswordToggles() {
    document.querySelectorAll('[data-pw-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.querySelector(button.dataset.pwToggle);
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        button.textContent = showing ? 'Show' : 'Hide';
      });
    });
  }

  /* -------------------------------------------------- shared validation */
  function validate(form) {
    EM.clearFieldErrors(form);
    EM.clearFormAlert(form);

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return false;
    }
    return true;
  }

  /* -------------------------------------------------- LOGIN ------------ */
  function initLogin() {
    // already signed in? go where the user wanted to go
    if (EM.Auth.isLoggedIn()) { EM.afterLoginRedirect(); return; }

    const form = document.getElementById('loginForm');
    const submit = document.getElementById('loginSubmit');
    const demoBtn = document.getElementById('demoLoginBtn');

    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        document.getElementById('loginEmail').value = 'demo@eniyamart.com';
        document.getElementById('loginPassword').value = 'Demo@123';
        EM.toast('Demo credentials filled in — just press Sign in', 'info');
      });
    }

    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!validate(form)) return;

      const payload = {
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
      };

      EM.setButtonLoading(submit, true, 'Signing in…');

      try {
        const auth = await EM.api('/auth/login', { method: 'POST', body: payload });
        EM.Auth.save(auth.token, {
          id: auth.id,
          name: auth.name,
          email: auth.email,
          role: auth.role
        });
        EM.toast('Welcome back, ' + EM.firstName(auth.name) + '!', 'success');
        EM.afterLoginRedirect();
      } catch (error) {
        EM.setButtonLoading(submit, false);
        if (error.fieldErrors && !EM.setFieldErrors(form, error.fieldErrors)) {
          EM.showFormAlert(form, error.message);
        } else if (!error.fieldErrors) {
          EM.showFormAlert(form, error.message);
        }
      }
    });
  }

  /* -------------------------------------------------- REGISTER --------- */
  function initRegister() {
    if (EM.redirectIfLoggedIn()) return;

    const form = document.getElementById('registerForm');
    const submit = document.getElementById('registerSubmit');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!validate(form)) return;

      const password = document.getElementById('regPassword').value;
      const confirm = document.getElementById('regConfirm').value;

      if (password !== confirm) {
        const confirmInput = document.getElementById('regConfirm');
        confirmInput.classList.add('is-invalid');
        const feedback = form.querySelector('[data-error-for="confirmPassword"]');
        if (feedback) {
          feedback.textContent = 'Passwords do not match';
          feedback.classList.remove('d-none');
        }
        confirmInput.focus();
        return;
      }

      const payload = {
        name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: password,
        phone: document.getElementById('regPhone').value.trim() || null
      };

      EM.setButtonLoading(submit, true, 'Creating your account…');

      try {
        const auth = await EM.api('/auth/register', { method: 'POST', body: payload });
        EM.Auth.save(auth.token, {
          id: auth.id,
          name: auth.name,
          email: auth.email,
          role: auth.role
        });
        EM.toast('Account created — welcome to ENIYA MART, ' + EM.firstName(auth.name) + '!', 'success');
        window.location.href = '/';
      } catch (error) {
        EM.setButtonLoading(submit, false);
        const applied = error.fieldErrors ? EM.setFieldErrors(form, error.fieldErrors) : false;
        if (!applied) EM.showFormAlert(form, error.message);
      }
    });
  }

  /* -------------------------------------------------- FORGOT PASSWORD -- */
  function initForgot() {
    const form = document.getElementById('forgotForm');
    const submit = document.getElementById('forgotSubmit');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!validate(form)) return;

      const payload = { email: document.getElementById('forgotEmail').value.trim() };
      EM.setButtonLoading(submit, true, 'Sending…');

      try {
        const response = await EM.api('/auth/forgot-password', { method: 'POST', body: payload });
        EM.setButtonLoading(submit, false);

        const result = document.getElementById('forgotResult');
        const message = document.getElementById('forgotResultMessage');
        result.classList.remove('d-none');
        message.textContent = response.message;

        if (response.devResetUrl) {
          const box = document.getElementById('forgotDevBox');
          const link = document.getElementById('forgotDevLink');
          const copy = document.getElementById('forgotCopyToken');
          box.classList.remove('d-none');
          link.setAttribute('href', response.devResetUrl);
          copy.onclick = async () => {
            try {
              await navigator.clipboard.writeText(response.devResetUrl);
              EM.toast('Reset link copied to clipboard', 'success');
            } catch (e) {
              EM.toast(response.devResetUrl, 'info', 8000);
            }
          };
        }

        form.reset();
        EM.toast('Reset instructions processed', 'success');
      } catch (error) {
        EM.setButtonLoading(submit, false);
        const applied = error.fieldErrors ? EM.setFieldErrors(form, error.fieldErrors) : false;
        if (!applied) EM.showFormAlert(form, error.message);
      }
    });
  }

  /* -------------------------------------------------- RESET PASSWORD --- */
  function initReset() {
    const form = document.getElementById('resetForm');
    const submit = document.getElementById('resetSubmit');
    if (!form) return;

    const token = EM.qs('token') || '';
    const tokenInput = document.getElementById('resetToken');
    const missing = document.getElementById('resetTokenMissing');

    tokenInput.value = token;

    if (!token) {
      missing.classList.remove('d-none');
      submit.disabled = true;
      return;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!validate(form)) return;

      const password = document.getElementById('resetPassword').value;
      const confirm = document.getElementById('resetConfirm').value;

      if (password !== confirm) {
        const confirmInput = document.getElementById('resetConfirm');
        confirmInput.classList.add('is-invalid');
        const feedback = form.querySelector('[data-error-for="confirmPassword"]');
        if (feedback) {
          feedback.textContent = 'Passwords do not match';
          feedback.classList.remove('d-none');
        }
        confirmInput.focus();
        return;
      }

      EM.setButtonLoading(submit, true, 'Updating…');

      try {
        const response = await EM.api('/auth/reset-password', {
          method: 'POST',
          body: { token: token, password: password }
        });
        EM.toast(response.message, 'success', 4500);
        setTimeout(() => { window.location.href = '/login.html'; }, 1200);
      } catch (error) {
        EM.setButtonLoading(submit, false);
        const applied = error.fieldErrors ? EM.setFieldErrors(form, error.fieldErrors) : false;
        if (!applied) EM.showFormAlert(form, error.message);
        if (error.status === 400) {
          missing.classList.remove('d-none');
        }
      }
    });
  }
})();
