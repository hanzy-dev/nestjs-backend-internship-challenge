const baseUrl = (process.env.DEMO_BASE_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);
const email = normalizeEmail(
  process.env.DEMO_USER_EMAIL ?? 'demo.backend@example.test',
);
const password = process.env.DEMO_USER_PASSWORD;
const timeoutMs = Number(process.env.DEMO_VERIFY_TIMEOUT_MS ?? 5000);

if (!password) {
  fail('DEMO_USER_PASSWORD is required for demo verification');
}

const checks = [];

try {
  const liveness = await request('/health');
  assertStatus(liveness, 200, 'liveness');
  checks.push('liveness');

  const readiness = await request('/health/ready');
  assertStatus(readiness, 200, 'readiness');
  checks.push('readiness');

  const swagger = await request('/api/docs-json');
  assertStatus(swagger, 200, 'Swagger JSON');
  const swaggerBody = await swagger.json();
  assertRecord(swaggerBody, 'Swagger JSON body');
  assert(
    typeof swaggerBody.openapi === 'string',
    'Swagger JSON is missing openapi',
  );
  checks.push('swagger-json');

  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  assertStatus(login, 200, 'login');
  const loginBody = await login.json();
  assertRecord(loginBody, 'login body');
  assert(
    typeof loginBody.accessToken === 'string' &&
      loginBody.accessToken.length > 0,
    'login response is missing accessToken',
  );
  checks.push('login');

  const authHeaders = {
    Authorization: `Bearer ${loginBody.accessToken}`,
  };

  const me = await request('/api/v1/auth/me', { headers: authHeaders });
  assertStatus(me, 200, '/auth/me');
  assertHasRequestId(me, '/auth/me');
  const meBody = await me.json();
  assertRecord(meBody, '/auth/me body');
  assert(meBody.email === email, '/auth/me returned an unexpected email');
  checks.push('auth-me');

  const projects = await request('/api/v1/projects', { headers: authHeaders });
  assertStatus(projects, 200, 'project list');
  const projectList = await projects.json();
  assertRecord(projectList, 'project list body');
  assert(Array.isArray(projectList.data), 'project list data must be an array');
  assert(projectList.data.length > 0, 'demo project list is empty');
  const primaryProject = projectList.data.find(
    (project) =>
      isRecord(project) && project.name === 'Internship Backend Challenge',
  );
  assertRecord(primaryProject, 'primary demo project');
  assert(
    typeof primaryProject.id === 'string',
    'primary project ID is missing',
  );
  checks.push('project-list');

  const projectDetail = await request(`/api/v1/projects/${primaryProject.id}`, {
    headers: authHeaders,
  });
  assertStatus(projectDetail, 200, 'project detail');
  const projectDetailBody = await projectDetail.json();
  assertRecord(projectDetailBody, 'project detail body');
  assert(
    Array.isArray(projectDetailBody.tasks) &&
      projectDetailBody.tasks.length >= 3,
    'project detail must contain demo tasks',
  );
  checks.push('project-detail');

  const tasks = await request(`/api/v1/projects/${primaryProject.id}/tasks`, {
    headers: authHeaders,
  });
  assertStatus(tasks, 200, 'task list');
  const taskList = await tasks.json();
  assertRecord(taskList, 'task list body');
  assert(Array.isArray(taskList.data), 'task list data must be an array');
  assert(taskList.data.length >= 3, 'demo task list is incomplete');
  checks.push('task-list');

  const invalid = await request('/api/v1/projects', {
    method: 'POST',
    headers: authHeaders,
    body: { name: '' },
  });
  assertStatus(invalid, 400, 'validation error');
  assertHasRequestId(invalid, 'validation error');
  checks.push('validation-error');

  console.log(`Demo verification passed: ${checks.join(', ')}`);
} catch (error) {
  fail(error instanceof Error ? error.message : 'Demo verification failed');
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function assertStatus(response, expected, label) {
  assert(
    response.status === expected,
    `${label} expected HTTP ${expected}, received HTTP ${response.status}`,
  );
}

function assertHasRequestId(response, label) {
  assert(
    response.headers.get('x-request-id'),
    `${label} response is missing x-request-id`,
  );
}

function assertRecord(value, label) {
  assert(isRecord(value), `${label} must be an object`);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
