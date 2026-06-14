import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const collectionPath = resolve(
  'docs/postman/nestjs-backend-internship-challenge.postman_collection.json',
);
const environmentPath = resolve('docs/postman/local.postman_environment.json');

const collection = JSON.parse(await readFile(collectionPath, 'utf8'));
const environment = JSON.parse(await readFile(environmentPath, 'utf8'));

const requiredFolders = [
  'Health',
  'Authentication',
  'Projects',
  'Tasks',
  'Negative Cases',
];
const requiredRequests = [
  'Liveness',
  'Readiness',
  'Register',
  'Login',
  'Current User',
  'Create Project',
  'List Projects',
  'Get Project Detail',
  'Create Task',
  'List Tasks',
  'Get Task',
];
const requiredVariables = [
  'baseUrl',
  'accessToken',
  'userId',
  'projectId',
  'taskId',
];

const folders = new Set(collection.item?.map((item) => item.name));
assertIncludes(folders, requiredFolders, 'folder');

const requests = flattenRequests(collection.item ?? []);
assertIncludes(
  new Set(requests.map((item) => item.name)),
  requiredRequests,
  'request',
);

const variables = new Map(
  (environment.values ?? []).map((item) => [item.key, item.value]),
);
assertIncludes(
  new Set(variables.keys()),
  requiredVariables,
  'environment variable',
);

if (variables.get('accessToken') !== '') {
  throw new Error('Postman accessToken must be committed empty');
}

for (const item of requests) {
  const url = readUrl(item.request?.url);
  if (!url.startsWith('{{baseUrl}}')) {
    throw new Error(`Request "${item.name}" must use {{baseUrl}}`);
  }
}

const serialized = `${JSON.stringify(collection)}${JSON.stringify(environment)}`;
if (/JWT_SECRET|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i.test(serialized)) {
  throw new Error('Postman files contain a forbidden secret marker');
}

process.stdout.write(
  `Postman validation passed: ${folders.size} folders, ${requests.length} requests, ${variables.size} variables.\n`,
);

function flattenRequests(items) {
  return items.flatMap((item) =>
    Array.isArray(item.item)
      ? flattenRequests(item.item)
      : item.request
        ? [item]
        : [],
  );
}

function readUrl(url) {
  if (typeof url === 'string') {
    return url;
  }
  return typeof url?.raw === 'string' ? url.raw : '';
}

function assertIncludes(actual, expected, label) {
  for (const value of expected) {
    if (!actual.has(value)) {
      throw new Error(`Missing required Postman ${label}: ${value}`);
    }
  }
}
