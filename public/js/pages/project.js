import { api, ApiError } from '../utils/api.js';
import { showToast } from '../components/toast.js';

const params = new URLSearchParams(window.location.search);
const projectId = params.get('id');

if (!projectId) {
  window.location.href = '/dashboard.html';
}

const toast = (msg, isError = false) => {
  showToast(msg, isError ? 'error' : 'success');
};

async function apiFetch(endpoint, options = {}) {
  try {
    return await api.request(endpoint, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.location.href = '/index.html';
    }
    throw error;
  }
}

let projectData = null;
let members = [];
let allTasks = [];
let activeTask = null;

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadProject() {
  try {
    const res = await apiFetch(`/projects/${projectId}`);
    projectData = res.project || res;
    members = projectData.members || res.members || [];

    document.getElementById('projectTitle').textContent = projectData.name || 'Untitled Project';
    document.getElementById('projectDesc').textContent = projectData.description || '';
    document.getElementById('memberCount').textContent = members.length;

    renderMembers();
    populateAssigneeDropdown();
  } catch (err) {
    toast(err.message, true);
  }
}

async function loadTasks() {
  try {
    const res = await apiFetch(`/tasks/project/${projectId}?limit=100`);
    allTasks = Array.isArray(res) ? res : res.tasks || [];
    renderBoard();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderBoard() {
  const priorityFilter = document.getElementById('filterPriority').value;
  const filtered = priorityFilter
    ? allTasks.filter((t) => t.priority === priorityFilter)
    : allTasks;

  const cols = {
    todo: document.getElementById('col-todo'),
    in_progress: document.getElementById('col-in_progress'),
    done: document.getElementById('col-done'),
  };

  Object.values(cols).forEach((el) => (el.innerHTML = ''));
  const counts = { todo: 0, in_progress: 0, done: 0 };

  filtered.forEach((task) => {
    const st = cols[task.status] ? task.status : 'todo';
    counts[st]++;

    const card = document.createElement('div');
    card.className = 'task-card';
    const assignee = task.assignee_name || task.assignee?.full_name || 'Unassigned';
    const due = task.due_date ? new Date(task.due_date).toLocaleDateString() : '';

    card.innerHTML = `
      <div class="task-card-top">
        <span class="task-title" data-id="${task.id}">${esc(task.title)}</span>
        <span class="badge badge-${esc(task.priority || 'medium')}">${esc(task.priority || 'medium')}</span>
      </div>
      <div class="task-meta">
        <span>👤 ${esc(assignee)} ${due ? `• 📅 ${esc(due)}` : ''}</span>
        <select class="status-quick-select form-control" style="width:auto; padding:0.2rem 0.4rem; font-size:0.78rem;" data-task-id="${task.id}">
          <option value="todo" ${st === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in_progress" ${st === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="done" ${st === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
    `;
    cols[st].appendChild(card);
  });

  document.getElementById('count-todo').textContent = counts.todo;
  document.getElementById('count-in_progress').textContent = counts.in_progress;
  document.getElementById('count-done').textContent = counts.done;
}

function populateAssigneeDropdown() {
  const select = document.getElementById('taskAssigneeInput');
  if (!select) return;
  select.innerHTML = '<option value="">Unassigned</option>';
  members.forEach((m) => {
    const uid = m.user_id || m.id;
    const name = m.full_name || m.name || m.email;
    const opt = document.createElement('option');
    opt.value = uid;
    opt.textContent = `${name} (${m.role_in_project || 'member'})`;
    select.appendChild(opt);
  });
}

function renderMembers() {
  const list = document.getElementById('membersList');
  if (!list) return;
  list.innerHTML = '';
  members.forEach((m) => {
    const uid = m.user_id || m.id;
    const name = m.full_name || m.name || m.email;
    const row = document.createElement('div');
    row.className = 'member-item';
    row.innerHTML = `
      <div>
        <strong>${esc(name)}</strong>
        <div style="font-size:0.8rem; color:var(--text-muted);">${esc(m.email || '')} • ${esc(m.role_in_project || 'member')}</div>
      </div>
      ${uid !== projectData?.owner_id ? `<button class="btn btn-danger btn-sm remove-member-btn" data-uid="${uid}">Remove</button>` : '<span class="badge badge-medium">Owner</span>'}
    `;
    list.appendChild(row);
  });
}

// Modal helpers
const openModal = (id) => document.getElementById(id).classList.add('open');
const closeModal = (id) => document.getElementById(id).classList.remove('open');

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

document.getElementById('filterPriority').addEventListener('change', renderBoard);

document.getElementById('openMembersBtn').addEventListener('click', () => openModal('membersModal'));

document.getElementById('openNewTaskBtn').addEventListener('click', () => {
  document.getElementById('taskModalTitle').textContent = 'New Task';
  document.getElementById('editTaskId').value = '';
  document.getElementById('taskForm').reset();
  openModal('taskModal');
});

// Create or Update Task
document.getElementById('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const editId = document.getElementById('editTaskId').value;
  const assigneeVal = document.getElementById('taskAssigneeInput').value;
  const dueVal = document.getElementById('taskDueDateInput').value;

  const payload = {
    project_id: Number(projectId),
    title: document.getElementById('taskTitleInput').value.trim(),
    description: document.getElementById('taskDescInput').value.trim() || null,
    priority: document.getElementById('taskPriorityInput').value,
    status: document.getElementById('taskStatusInput').value,
    assigned_to: assigneeVal ? Number(assigneeVal) : null,
    due_date: dueVal || null,
  };

  try {
    if (editId) {
      await apiFetch(`/tasks/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast('Task updated');
    } else {
      await apiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) });
      toast('Task created');
    }
    closeModal('taskModal');
    await loadTasks();
  } catch (err) {
    toast(err.message, true);
  }
});

// Quick status change & Open task details
document.querySelector('.kanban-board').addEventListener('change', async (e) => {
  if (e.target.classList.contains('status-quick-select')) {
    const taskId = e.target.dataset.taskId;
    const status = e.target.value;
    try {
      await apiFetch(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast('Status updated');
      await loadTasks();
    } catch (err) {
      toast(err.message, true);
      await loadTasks();
    }
  }
});

document.querySelector('.kanban-board').addEventListener('click', async (e) => {
  if (e.target.classList.contains('task-title')) {
    const taskId = Number(e.target.dataset.id);
    activeTask = allTasks.find((t) => t.id === taskId);
    if (!activeTask) return;

    document.getElementById('detailTaskTitle').textContent = activeTask.title;
    document.getElementById('detailTaskDesc').textContent = activeTask.description || 'No description provided.';
    openModal('taskDetailModal');
    await loadComments(taskId);
  }
});

document.getElementById('editCurrentTaskBtn').addEventListener('click', () => {
  if (!activeTask) return;
  closeModal('taskDetailModal');
  document.getElementById('taskModalTitle').textContent = 'Edit Task';
  document.getElementById('editTaskId').value = activeTask.id;
  document.getElementById('taskTitleInput').value = activeTask.title || '';
  document.getElementById('taskDescInput').value = activeTask.description || '';
  document.getElementById('taskPriorityInput').value = activeTask.priority || 'medium';
  document.getElementById('taskStatusInput').value = activeTask.status || 'todo';
  document.getElementById('taskAssigneeInput').value = activeTask.assigned_to || '';
  document.getElementById('taskDueDateInput').value = activeTask.due_date ? activeTask.due_date.split('T')[0] : '';
  openModal('taskModal');
});

document.getElementById('deleteCurrentTaskBtn').addEventListener('click', async () => {
  if (!activeTask || !confirm('Delete this task?')) return;
  try {
    await apiFetch(`/tasks/${activeTask.id}`, { method: 'DELETE' });
    toast('Task deleted');
    closeModal('taskDetailModal');
    await loadTasks();
  } catch (err) {
    toast(err.message, true);
  }
});

// Comments
async function loadComments(taskId) {
  const list = document.getElementById('commentsList');
  list.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">Loading comments...</div>';
  try {
    const res = await apiFetch(`/comments/task/${taskId}`);
    const comments = Array.isArray(res) ? res : res.comments || [];
    if (!comments.length) {
      list.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">No comments yet.</div>';
      return;
    }
    list.innerHTML = comments
      .map(
        (c) => `
      <div class="comment-item">
        <div class="comment-header">
          <strong>${esc(c.author_name || c.full_name || 'Member')}</strong>
          <span>${new Date(c.created_at).toLocaleString()}</span>
        </div>
        <div style="font-size:0.9rem;">${esc(c.content)}</div>
      </div>`
      )
      .join('');
  } catch (err) {
    list.innerHTML = `<div style="color:#ef4444; font-size:0.85rem;">${esc(err.message)}</div>`;
  }
}

document.getElementById('commentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeTask) return;
  const input = document.getElementById('commentInput');
  const content = input.value.trim();
  if (!content) return;

  try {
    await apiFetch('/comments', {
      method: 'POST',
      body: JSON.stringify({ task_id: activeTask.id, content }),
    });
    input.value = '';
    await loadComments(activeTask.id);
  } catch (err) {
    toast(err.message, true);
  }
});

// Members Add/Remove
document.getElementById('addMemberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('memberEmailInput');
  const email = input.value.trim();
  if (!email) return;

  try {
    await apiFetch(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role_in_project: 'member' }),
    });
    input.value = '';
    toast('Member added');
    await loadProject();
  } catch (err) {
    toast(err.message, true);
  }
});

document.getElementById('membersList').addEventListener('click', async (e) => {
  if (e.target.classList.contains('remove-member-btn')) {
    const uid = e.target.dataset.uid;
    try {
      await apiFetch(`/projects/${projectId}/members/${uid}`, { method: 'DELETE' });
      toast('Member removed');
      await loadProject();
    } catch (err) {
      toast(err.message, true);
    }
  }
});

// Init
(async function init() {
  await loadProject();
  await loadTasks();
})();