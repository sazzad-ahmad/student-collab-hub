#!/usr/bin/env node
/**
 * End-to-End API Verification Script for Student Collab Hub
 * Tests the full lifecycle: health check, auth, projects, tasks, comments
 */

import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const BASE_URL = 'http://localhost:3000';
const API_PREFIX = '/api/v1';

let serverProcess = null;
let serverStarted = false;

// Test data storage
const testData = {
  user1: { email: 'testuser1@verify.com', password: 'TestPass123!', fullName: 'Test User One' },
  user2: { email: 'testuser2@verify.com', password: 'TestPass123!', fullName: 'Test User Two' },
  tokens: { user1: null, user2: null },
  userIds: { user1: null, user2: null },
  projectId: null,
  taskId: null,
  commentId: null,
};

// Utility functions
function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

function logStep(step) {
  console.log('\n' + '='.repeat(60));
  console.log(`STEP: ${step}`);
  console.log('='.repeat(60));
}

function logSuccess(msg) {
  console.log(`✅ ${msg}`);
}

function logError(msg) {
  console.error(`❌ ${msg}`);
}

function logInfo(msg) {
  console.log(`ℹ️  ${msg}`);
}

// HTTP request helper
async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `${API_PREFIX}${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch {
          parsed = { raw: data };
        }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function GET(path, token) { return request('GET', path, null, token); }
async function POST(path, body, token) { return request('POST', path, body, token); }
async function PATCH(path, body, token) { return request('PATCH', path, body, token); }
async function DELETE(path, token) { return request('DELETE', path, null, token); }

// Server management
async function startServer() {
  return new Promise((resolve, reject) => {
    log('Starting server...');
    serverProcess = spawn('node', ['src/server.js'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      output += msg;
      if (msg.includes('Server running on http://localhost:3000')) {
        serverStarted = true;
        logSuccess('Server started successfully');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      output += msg;
      if (msg.includes('Server running on http://localhost:3000')) {
        serverStarted = true;
        logSuccess('Server started successfully (from stderr)');
        resolve();
      }
    });

    serverProcess.on('error', (err) => {
      logError(`Server process error: ${err.message}`);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      if (!serverStarted && code !== 0) {
        logError(`Server exited with code ${code}`);
        logError(`Output: ${output}`);
        reject(new Error(`Server failed to start: ${output}`));
      }
    });

    setTimeout(() => {
      if (!serverStarted) {
        logError('Server startup timeout');
        reject(new Error('Server startup timeout'));
      }
    }, 15000);
  });
}

async function stopServer() {
  if (serverProcess) {
    log('Stopping server...');
    serverProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!serverProcess.killed) {
      serverProcess.kill('SIGKILL');
    }
    logSuccess('Server stopped');
  }
}

// Test steps
async function testHealthCheck() {
  logStep('Health Check');
  const { status, data } = await GET('/health');
  if (status === 200 && data.status === 'ok') {
    logSuccess(`Health check passed: ${JSON.stringify(data)}`);
    return true;
  }
  logError(`Health check failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testRegisterUser(userKey) {
  logStep(`Register ${userKey}`);
  const user = testData[userKey];
  const { status, data } = await POST('/auth/register', user);
  
  if (status === 201 && data.success && data.data?.token) {
    testData.tokens[userKey] = data.data.token;
    testData.userIds[userKey] = data.data.user.id;
    logSuccess(`${userKey} registered: id=${data.data.user.id}, token received`);
    return true;
  }
  
  if (status === 409 || (status === 400 && data.details?.some(d => d.msg?.includes('email')))) {
    logInfo(`${userKey} already exists, trying login...`);
    return testLoginUser(userKey);
  }
  
  logError(`Registration failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testLoginUser(userKey) {
  logStep(`Login ${userKey}`);
  const user = testData[userKey];
  const { status, data } = await POST('/auth/login', { email: user.email, password: user.password });
  
  if (status === 200 && data.success && data.data?.token) {
    testData.tokens[userKey] = data.data.token;
    testData.userIds[userKey] = data.data.user.id;
    logSuccess(`${userKey} logged in: id=${data.data.user.id}, token received`);
    return true;
  }
  
  logError(`Login failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testAuth() {
  logStep('Authentication Flow');
  
  if (!await testRegisterUser('user1')) return false;
  if (!await testLoginUser('user1')) return false;
  
  if (!await testRegisterUser('user2')) return false;
  if (!await testLoginUser('user2')) return false;
  
  logSuccess('Both users authenticated successfully');
  return true;
}

async function testCreateProject() {
  logStep('Create Project (User 1)');
  const { status, data } = await POST('/projects', { 
    name: 'Verification Test Project', 
    description: 'Project created during API verification' 
  }, testData.tokens.user1);
  
  if (status === 201 && data.success && data.data?.project?.id) {
    testData.projectId = data.data.project.id;
    logSuccess(`Project created: id=${testData.projectId}, name="${data.data.project.name}"`);
    return true;
  }
  
  logError(`Create project failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testAddMember() {
  logStep('Add User 2 as Member (by email)');
  const { status, data } = await POST(`/projects/${testData.projectId}/members`, {
    email: testData.user2.email,
    role_in_project: 'member',
  }, testData.tokens.user1);
  
  if (status === 201 && data.success && data.data?.member) {
    logSuccess(`Member added: user_id=${data.data.member.user_id}, role=${data.data.member.role_in_project}`);
    return true;
  }
  
  logError(`Add member failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testCreateTask() {
  logStep('Create Task assigned to User 2 (User 1)');
  const { status, data } = await POST('/tasks', {
    project_id: testData.projectId,
    title: 'Verification Task',
    description: 'Task created during API verification',
    status: 'todo',
    priority: 'high',
    assigned_to: testData.userIds.user2,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }, testData.tokens.user1);
  
  if (status === 201 && data.success && data.data?.task?.id) {
    testData.taskId = data.data.task.id;
    logSuccess(`Task created: id=${testData.taskId}, title="${data.data.task.title}", assignee=${data.data.task.assignee_id}`);
    return true;
  }
  
  logError(`Create task failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testUpdateTaskStatus() {
  logStep('Update Task Status to in_progress (User 2)');
  const { status, data } = await PATCH(`/tasks/${testData.taskId}/status`, {
    status: 'in_progress',
  }, testData.tokens.user2);
  
  if (status === 200 && data.success && data.data?.task?.status === 'in_progress') {
    logSuccess(`Task status updated: ${data.data.task.status}`);
    return true;
  }
  
  logError(`Update task status failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testAddComment() {
  logStep('Add Comment to Task (User 2)');
  const { status, data } = await POST('/comments', {
    task_id: testData.taskId,
    content: 'This is a verification comment from User 2',
  }, testData.tokens.user2);
  
  if (status === 201 && data.success && data.data?.comment?.id) {
    testData.commentId = data.data.comment.id;
    logSuccess(`Comment added: id=${testData.commentId}, content="${data.data.comment.content}"`);
    return true;
  }
  
  logError(`Add comment failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testGetComments() {
  logStep('Get Task Comments (User 1)');
  const { status, data } = await GET(`/comments/task/${testData.taskId}`, testData.tokens.user1);
  
  if (status === 200 && data.success && Array.isArray(data.data?.comments)) {
    const comments = data.data.comments;
    logSuccess(`Retrieved ${comments.length} comment(s)`);
    comments.forEach(c => logInfo(`  - Comment ${c.id} by ${c.author_name}: "${c.content.substring(0, 50)}..."`));
    return true;
  }
  
  logError(`Get comments failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testUpdateTaskStatusDone() {
  logStep('Update Task Status to done (User 2)');
  const { status, data } = await PATCH(`/tasks/${testData.taskId}/status`, {
    status: 'done',
  }, testData.tokens.user2);
  
  if (status === 200 && data.success && data.data?.task?.status === 'done') {
    logSuccess(`Task status updated to done`);
    return true;
  }
  
  logError(`Update task status to done failed: status=${status}, data=${JSON.stringify(data)}`);
  return false;
}

async function testCleanup() {
  logStep('Cleanup Test Data');
  let allOk = true;
  
  if (testData.commentId) {
    const { status } = await DELETE(`/comments/${testData.commentId}`, testData.tokens.user2);
    if (status === 204 || status === 200) {
      logSuccess('Comment deleted');
    } else {
      logError(`Comment deletion failed: status=${status}`);
      allOk = false;
    }
  }
  
  if (testData.taskId) {
    const { status } = await DELETE(`/tasks/${testData.taskId}`, testData.tokens.user1);
    if (status === 204 || status === 200) {
      logSuccess('Task deleted');
    } else {
      logError(`Task deletion failed: status=${status}`);
      allOk = false;
    }
  }
  
  if (testData.projectId && testData.userIds.user2) {
    const { status } = await DELETE(`/projects/${testData.projectId}/members/${testData.userIds.user2}`, testData.tokens.user2);
    if (status === 204 || status === 200) {
      logSuccess('User 2 removed from project');
    } else {
      logError(`Remove member failed: status=${status}`);
      allOk = false;
    }
  }
  
  if (testData.projectId) {
    const { status } = await DELETE(`/projects/${testData.projectId}`, testData.tokens.user1);
    if (status === 204 || status === 200) {
      logSuccess('Project deleted');
    } else {
      logError(`Project deletion failed: status=${status}`);
      allOk = false;
    }
  }
  
  return allOk;
}

async function runVerification() {
  console.log('\n' + '#'.repeat(60));
  console.log('#  STUDENT COLLAB HUB - END-TO-END API VERIFICATION');
  console.log('#'.repeat(60));
  
  const results = {};
  
  try {
    await startServer();
    await new Promise(r => setTimeout(r, 1000));
    
    results.health = await testHealthCheck();
    results.auth = await testAuth();
    results.createProject = await testCreateProject();
    results.addMember = await testAddMember();
    results.createTask = await testCreateTask();
    results.updateTaskStatus = await testUpdateTaskStatus();
    results.addComment = await testAddComment();
    results.getComments = await testGetComments();
    results.updateTaskStatusDone = await testUpdateTaskStatusDone();
    results.cleanup = await testCleanup();
    
  } catch (err) {
    logError(`Verification failed with error: ${err.message}`);
    console.error(err);
    return false;
  } finally {
    await stopServer();
  }
  
  console.log('\n' + '#'.repeat(60));
  console.log('#  VERIFICATION SUMMARY');
  console.log('#'.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}  ${test}`);
    if (result) passed++; else failed++;
  }
  
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  console.log('#'.repeat(60));
  
  return failed === 0;
}

runVerification()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    logError(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  });