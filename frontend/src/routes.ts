import {
  type RouteConfig,
  route,
} from '@react-router/dev/routes';

export default [
  route('/', 'pages/landing.tsx'),
  route('/lessons', 'pages/lessons.tsx'),
  route('/terms', 'pages/terms.tsx'),
  route('/request-access', 'pages/request-access.tsx'),
  route('/classrooms', 'pages/classrooms.tsx'),
  route('/classrooms/:id', 'pages/classroom-detail.tsx'),
  route('/admin', 'pages/admin.tsx'),
  route('/admin/users', 'pages/admin-users.tsx'),
  route('/admin/classrooms', 'pages/admin-classrooms.tsx'),
  route('/admin/containers', 'pages/admin-containers.tsx'),
  route('/admin/logs', 'pages/admin-logs.tsx'),
  route('/admin/access-requests', 'pages/admin-access-requests.tsx'),
  route('/admin/allowlist', 'pages/admin-allowlist.tsx'),
  route('/admin/signup-codes', 'pages/admin-signup-codes.tsx'),
  route('*?', 'main.tsx'),
] satisfies RouteConfig;
