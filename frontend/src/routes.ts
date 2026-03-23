import {
  type RouteConfig,
  route,
} from '@react-router/dev/routes';

export default [
  route('/', 'pages/landing.tsx'),
  route('/lessons', 'pages/lessons.tsx'),
  route('/terms', 'pages/terms.tsx'),
  route('/classrooms', 'pages/classrooms.tsx'),
  route('*?', 'main.tsx'),
] satisfies RouteConfig;
