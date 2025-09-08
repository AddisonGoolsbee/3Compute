import {
  type RouteConfig,
  route,
} from '@react-router/dev/routes';

export default [
  // * matches all URLs, the ? makes it optional so it will match / as well
  route('*?', 'routes/index.tsx'),
  route('classrooms', 'routes/classrooms.tsx'),
] satisfies RouteConfig;
