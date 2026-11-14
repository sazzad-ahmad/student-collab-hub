/**
 * Auth Page - Login & Register functionality
 */

import { api } from '../utils/api.js';
import { showToast } from '../components/toast.js';

const form = document.getElementById('authForm');
const title = document.getElementById('authTitle');
const subtitle = document.getElementById('authSubtitle');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const toggleText = document.getElementById('authToggleText');
const toggleLink = document.getElementById('authToggleLink');
const nameGroup = document.getElementById('nameGroup');
const confirmGroup = document.getElementById('confirmGroup');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');

let isLogin = true;

function switchMode(login) {
  isLogin = login;

  if (isLogin) {
    title.textContent = 'Welcome Back';
    subtitle.textContent = 'Sign in to your account to continue';
    btnText.textContent = 'Sign In';
    toggleText.innerHTML = `Don't have an account? <a href="#" id="authToggleLink">Sign Up</a>`;
    nameGroup.style.display = 'none';
    confirmGroup.style.display = 'none';
    nameInput.required = false;
    confirmInput.required = false;
  } else {
    title.textContent = 'Create Account';
    subtitle.textContent = 'Join Student Collab Hub to start collaborating';
    btnText.textContent = 'Create Account';
    toggleText.innerHTML = `Already have an account? <a href="#" id="authToggleLink">Sign In</a>`;
    nameGroup.style.display = 'block';
    confirmGroup.style.display = 'block';
    nameInput.required = true;
    confirmInput.required = true;
  }

  reattachToggleListener();
  clearErrors();
}

function reattachToggleListener() {
  const newToggleLink = document.getElementById('authToggleLink');
  if (newToggleLink) {
    newToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchMode(!isLogin);
    });
  }
}

function showError(input, message) {
  const errorEl = document.getElementById(`${input.id}Error`);
  input.classList.add('input-error');
  if (errorEl) errorEl.textContent = message;
}

function clearError(input) {
  const errorEl = document.getElementById(`${input.id}Error`);
  input.classList.remove('input-error');
  if (errorEl) errorEl.textContent = '';
}

function clearErrors() {
  [nameInput, emailInput, passwordInput, confirmInput].forEach(clearError);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm() {
  clearErrors();
  let valid = true;

  if (!isLogin) {
    if (!nameInput.value.trim()) {
      showError(nameInput, 'Full name is required');
      valid = false;
    }
  }

  if (!emailInput.value.trim()) {
    showError(emailInput, 'Email is required');
    valid = false;
  } else if (!validateEmail(emailInput.value.trim())) {
    showError(emailInput, 'Please enter a valid email address');
    valid = false;
  }

  if (!passwordInput.value) {
    showError(passwordInput, 'Password is required');
    valid = false;
  } else if (passwordInput.value.length < 8) {
    showError(passwordInput, 'Password must be at least 8 characters');
    valid = false;
  }

  if (!isLogin) {
    if (!confirmInput.value) {
      showError(confirmInput, 'Please confirm your password');
      valid = false;
    } else if (passwordInput.value !== confirmInput.value) {
      showError(confirmInput, 'Passwords do not match');
      valid = false;
    }
  }

  return valid;
}

function setLoading(loading) {
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = loading;
  btnText.style.display = loading ? 'none' : 'inline';
  btnSpinner.style.display = loading ? 'inline-block' : 'none';
}

async function handleSubmit(e) {
  e.preventDefault();

  if (!validateForm()) return;

  setLoading(true);

  try {
    if (isLogin) {
      const { token, user } = await api.post('/auth/login', {
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });
      api.setAuth(token, user);
      showToast('Welcome back!', 'success');
    } else {
      const { token, user } = await api.post('/auth/register', {
        fullName: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });
      api.setAuth(token, user);
      showToast('Account created successfully!', 'success');
    }

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 500);
  } catch (error) {
    if (error.status === 400 && error.data?.errors) {
      error.data.errors.forEach(err => {
        const input = document.getElementById(err.field);
        if (input) showError(input, err.message);
      });
    } else if (error.status === 401) {
      showError(emailInput, 'Invalid email or password');
      showError(passwordInput, '');
    } else if (error.status === 409) {
      showError(emailInput, 'An account with this email already exists');
    } else {
      showToast(error.message || 'Something went wrong', 'error');
    }
  } finally {
    setLoading(false);
  }
}

form.addEventListener('submit', handleSubmit);

switchMode(true);