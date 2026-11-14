/**
 * Dashboard Page - Projects listing, search, filter, create project modal
 */

import { api } from '../utils/api.js';
import { showToast, showSuccess, showError } from '../components/toast.js';

// Check authentication
if (!api.isAuthenticated()) {
  window.location.href = '/';
  throw new Error('Not authenticated');
}

// DOM Elements
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const createProjectBtn = document.getElementById('createProjectBtn');
const emptyCreateBtn = document.getElementById('emptyCreateBtn');
const createProjectModal = document.getElementById('createProjectModal');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const createProjectForm = document.getElementById('createProjectForm');
const modalSubmit = document.getElementById('modalSubmit');
const modalBtnText = document.getElementById('modalBtnText');
const modalBtnSpinner = document.getElementById('modalBtnSpinner');
const projectNameInput = document.getElementById('projectName');
const projectNameError = document.getElementById('projectNameError');
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('filterSelect');
const sortSelect = document.getElementById('sortSelect');
const projectsGrid = document.getElementById('projectsGrid');
const projectsList = document.getElementById('projectsList');
const emptyState = document.getElementById('emptyState');
const userMenu = document.getElementById('userMenu');

// State
let projects = [];
let currentView = 'grid';
let debounceTimer = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  loadUser();
  setupEventListeners();
  await loadProjects();
});

function loadUser() {
  const user = api.getUser();
  if (user) {
    userName.textContent = user.name || 'User';
    userEmail.textContent = user.email || '';
    userAvatar.textContent = (user.name || 'U').charAt(0).toUpperCase();
  }
}

function setupEventListeners() {
  mobileMenuBtn.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  createProjectBtn.addEventListener('click', openCreateModal);
  emptyCreateBtn.addEventListener('click', openCreateModal);
  modalClose.addEventListener('click', closeCreateModal);
  modalCancel.addEventListener('click', closeCreateModal);
  createProjectModal.addEventListener('click', (e) => {
    if (e.target === createProjectModal) closeCreateModal();
  });
  createProjectForm.addEventListener('submit', handleCreateProject);

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderProjects();
    }, 300);
  });

  filterSelect.addEventListener('change', renderProjects);
  sortSelect.addEventListener('change', renderProjects);

  userMenu.addEventListener('click', () => {});
  userMenu.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      userMenu.click();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && createProjectModal.classList.contains('active')) {
      closeCreateModal();
    }
  });
}

function toggleSidebar() {
  const isOpen = sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('active', isOpen);
  mobileMenuBtn.setAttribute('aria-expanded', isOpen);
  sidebarOverlay.setAttribute('aria-hidden', !isOpen);
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  mobileMenuBtn.setAttribute('aria-expanded', 'false');
  sidebarOverlay.setAttribute('aria-hidden', 'true');
}

function openCreateModal() {
  createProjectModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => projectNameInput.focus(), 100);
  clearFormErrors();
}

function closeCreateModal() {
  createProjectModal.classList.remove('active');
  document.body.style.overflow = '';
  createProjectForm.reset();
  clearFormErrors();
}

function clearFormErrors() {
  projectNameInput.classList.remove('input-error');
  projectNameError.textContent = '';
}

function showFormError(input, errorEl, message) {
  input.classList.add('input-error');
  errorEl.textContent = message;
}

async function handleCreateProject(e) {
  e.preventDefault();

  const name = projectNameInput.value.trim();
  if (!name) {
    showFormError(projectNameInput, projectNameError, 'Project name is required');
    return;
  }

  const description = document.getElementById('projectDescription').value.trim();
  const visibility = document.getElementById('projectVisibility').value;

  setModalLoading(true);

  try {
    const project = await api.post('/projects', {
      name,
      description,
      visibility,
    });

    showSuccess('Project created successfully!');
    closeCreateModal();
    await loadProjects();
  } catch (error) {
    if (error.status === 400 && error.data?.errors) {
      error.data.errors.forEach(err => {
        if (err.field === 'name') {
          showFormError(projectNameInput, projectNameError, err.message);
        }
      });
    } else {
      showError(error.message || 'Failed to create project');
    }
  } finally {
    setModalLoading(false);
  }
}

function setModalLoading(loading) {
  modalSubmit.disabled = loading;
  modalBtnText.style.display = loading ? 'none' : 'inline';
  modalBtnSpinner.style.display = loading ? 'inline-block' : 'none';
}

async function loadProjects() {
  try {
    const params = {
      page: 1,
      limit: 50,
    };
    const res = await api.get('/projects', { params });
    if (res && Array.isArray(res.projects)) {
      projects = res.projects;
    } else if (Array.isArray(res)) {
      projects = res;
    } else if (res && res.data && Array.isArray(res.data.projects)) {
      projects = res.data.projects;
    } else {
      projects = [];
    }
    updateDashboardStats();
    renderProjects();
  } catch (error) {
    showError(error.message || 'Failed to load projects');
    projects = [];
    updateDashboardStats();
    renderProjects();
  }
}

function updateDashboardStats() {
  const statTotalProjects = document.getElementById('statTotalProjects');
  const statTotalTasks = document.getElementById('statTotalTasks');
  const statCollaborations = document.getElementById('statCollaborations');

  if (!statTotalProjects || !statTotalTasks || !statCollaborations) return;

  const totalProjects = projects.length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.taskCount ?? p.task_count ?? 0), 0);
  const totalMembers = projects.reduce((acc, p) => acc + (p.member_count ?? p.members?.length ?? 1), 0);

  statTotalProjects.textContent = totalProjects;
  statTotalTasks.textContent = totalTasks;
  statCollaborations.textContent = totalMembers;
}

function getFilteredProjects() {
  let filtered = [...projects];

  const searchTerm = searchInput.value.trim().toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      (p.description && p.description.toLowerCase().includes(searchTerm))
    );
  }

  const filter = filterSelect.value;
  const user = api.getUser();
  if (filter === 'owner' && user) {
    filtered = filtered.filter(p => (p.owner_id ?? p.ownerId) == user.id);
  } else if (filter === 'member' && user) {
    filtered = filtered.filter(p => (p.owner_id ?? p.ownerId) != user.id);
  }

  const sort = sortSelect.value;
  switch (sort) {
    case 'created':
      filtered.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      break;
    case 'name':
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'updated':
    default:
      filtered.sort((a, b) => new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt) - new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt));
      break;
  }

  return filtered;
}

function renderProjects() {
  const filtered = getFilteredProjects();

  if (filtered.length === 0) {
    projectsGrid.style.display = 'none';
    projectsList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  if (currentView === 'grid') {
    projectsGrid.style.display = 'grid';
    projectsList.style.display = 'none';
    renderGridView(filtered);
  } else {
    projectsGrid.style.display = 'none';
    projectsList.style.display = 'flex';
    renderListView(filtered);
  }
}

function renderGridView(projectList) {
  projectsGrid.innerHTML = projectList.map(project => createProjectCard(project)).join('');
  attachCardListeners();
}

function renderListView(projectList) {
  projectsList.innerHTML = projectList.map(project => createProjectListItem(project)).join('');
  attachListListeners();
}
function createProjectCard(project) {
  const initials = getInitials(project.name);
  const memberCount = project.member_count ?? project.members?.length ?? 1;
  const taskCount = project.taskCount ?? project.task_count ?? 0;
  const updatedAt = formatDate(project.updated_at || project.updatedAt || project.created_at || project.createdAt);
  const isOwner = (project.owner_id ?? project.ownerId) == api.getUser()?.id;

  return `
    <article class="card project-card" data-project-id="${project.id}">
      <div class="card-body">
        <div class="project-card-header">
          <div class="project-card-avatar">${initials}</div>
          <span class="project-card-badge ${isOwner ? 'owner' : 'member'}">${isOwner ? 'Owner' : 'Member'}</span>
        </div>
        <h3 class="project-card-title">${escapeHtml(project.name)}</h3>
        ${project.description ? `<p class="project-card-description">${escapeHtml(project.description)}</p>` : '<p class="project-card-description text-muted" style="font-style: italic;">No description provided</p>'}
        <div class="project-card-meta">
          <span class="project-card-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${memberCount} member${memberCount !== 1 ? 's' : ''}
          </span>
          <span class="project-card-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></svg>
            ${taskCount} task${taskCount !== 1 ? 's' : ''}
          </span>
          <span class="project-card-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${updatedAt}
          </span>
        </div>
        <div class="project-card-footer">
          <a href="/project.html?id=${project.id}" class="btn btn-primary btn-sm btn-open-board">
            Open Board <span class="arrow">&rarr;</span>
          </a>
        </div>
      </div>
    </article>
  `;
}

function createProjectListItem(project) {
  const initials = getInitials(project.name);
  const memberCount = project.member_count ?? project.members?.length ?? 1;
  const taskCount = project.taskCount ?? project.task_count ?? 0;
  const updatedAt = formatDate(project.updated_at || project.updatedAt || project.created_at || project.createdAt);
  const isOwner = (project.owner_id ?? project.ownerId) == api.getUser()?.id;

  return `
    <div class="project-list-item" data-project-id="${project.id}">
      <div class="project-list-info">
        <div class="project-list-avatar">${initials}</div>
        <div class="project-list-details">
          <div class="project-list-name">${escapeHtml(project.name)}</div>
          ${project.description ? `<div class="project-list-description">${escapeHtml(project.description)}</div>` : ''}
        </div>
        <div class="project-list-meta">
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${memberCount} member${memberCount !== 1 ? 's' : ''}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></svg>
            ${taskCount} task${taskCount !== 1 ? 's' : ''}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${updatedAt}
          </span>
          <span class="project-card-badge ${isOwner ? 'owner' : 'member'}">${isOwner ? 'Owner' : 'Member'}</span>
        </div>
      </div>
      <div class="project-list-actions">
        <a href="/project.html?id=${project.id}" class="btn btn-primary btn-sm btn-open-board">
          Open Board <span class="arrow">&rarr;</span>
        </a>
      </div>
    </div>
  `;
}

function attachCardListeners() {
  projectsGrid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' || e.target.closest('a')) return;
      const projectId = card.dataset.projectId;
      window.location.href = `/project.html?id=${projectId}`;
    });
  });
}

function attachListListeners() {
  projectsList.querySelectorAll('.project-list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' || e.target.closest('a')) return;
      const projectId = item.dataset.projectId;
      window.location.href = `/project.html?id=${projectId}`;
    });
  });
}

function getInitials(name) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}