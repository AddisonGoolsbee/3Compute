import { SiCplusplus, SiCss, SiGo, SiHtml5, SiJavascript, SiJson, SiLess, SiLinux, SiMarkdown, SiPhp, SiPython, SiRust, SiSass, SiShopify, SiSqlite, SiTypescript, SiVuedotjs, SiWebassembly, SiXml, SiYaml, SiJpeg } from '@icons-pack/react-simple-icons';
import { Text } from 'lucide-react';

export const languageMap = {
  'markdown': {
    icon: SiMarkdown,
    name: 'Markdown',
    language: 'markdown',
    extensions: [
      'md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdx', 'mdtxt', 'mdtext', 'mdml', 'mdhtml',
    ],
  },
  'text': {
    icon: Text,
    name: 'Text',
    language: 'plaintext',
    extensions: [] as string[],
  },
  'python': {
    icon: SiPython,
    name: 'Python',
    language: 'python',
    extensions: [
      'py', 'pyw', 'pyi', 'pyx', 'pyd', 'pyo', 'pyz', 'pyc', 'pyd', 'pypi', 'pypm', 'pypk', 'pypx',
    ],
  },
  'javascript': {
    icon: SiJavascript,
    name: 'JavaScript',
    language: 'javascript',
    extensions: [
      'js', 'jsx', 'mjs', 'cjs',
    ],
  },
  'typescript': {
    icon: SiTypescript,
    name: 'TypeScript',
    language: 'typescript',
    extensions: [
      'ts', 'tsx', 'mts', 'cts', 'd.ts', 'd.mts', 'd.cts', 'd.mtsx', 'd.ctsx', 'd.mjs', 'd.cjs',
    ],
  },
  'html': {
    icon: SiHtml5,
    name: 'HTML',
    language: 'html',
    extensions: [
      'html', 'htm', 'xhtml', 'shtml', 'xhtml', 'mhtml', 'mht', 'webp', 'svg',
    ],
  },
  'css': {
    icon: SiCss,
    name: 'CSS',
    language: 'css',
    extensions: [
      'css',
    ],
  },
  'json': {
    icon: SiJson,
    name: 'JSON',
    language: 'json',
    extensions: [
      'json', 'jsonc', 'json5', 'geojson', 'cjson', 'jsonl', 'jsonld', 'jsonnet', 'har', 'webmanifest', 'map',
    ],
  },
  'yaml': {
    icon: SiYaml,
    name: 'YAML',
    language: 'yaml',
    extensions: [
      'yaml', 'yml', 'ymlc', 'yml5', 'ymlnet', 'ymlld', 'ymljson', 'ymljsonc',
    ],
  },
  'java': {
    icon: SiLinux,
    name: 'Java',
    language: 'java',
    extensions: [
      'java', 'jav', 'jvm', 'jsh', 'jsp', 'jspx', 'jhtml', 'jhtm', 'jws', 'jwsdl',
    ],
  },
  'go': {
    icon: SiGo,
    name: 'Go',
    language: 'go',
    extensions: [
      'go',
    ],
  },
  'rust': {
    icon: SiRust,
    name: 'Rust',
    language: 'rust',
    extensions: [
      'rs', 'rlib',
    ],
  },
  'c++': {
    icon: SiCplusplus,
    name: 'C/C++',
    language: 'cpp',
    extensions: [
      'cpp', 'cxx', 'cc', 'c++', 'h', 'hpp', 'hxx', 'hh', 'h++', 'c',
    ],
  },
  'sql': {
    icon: SiSqlite,
    name: 'SQL',
    language: 'sql',
    extensions: [
      'sql', 'sqlite', 'sqlite3',
    ],
  },
  'php': {
    icon: SiPhp,
    name: 'PHP',
    language: 'php',
    extensions: [
      'php', 'php3', 'php4', 'php5', 'phtml', 'phps', 'php7', 'php8', 'phar', 'inc',
    ],
  },
  'scss': {
    icon: SiSass,
    name: 'SCSS',
    language: 'scss',
    extensions: [
      'scss',
    ],
  },
  'sass': {
    icon: SiSass,
    name: 'Sass',
    language: 'scss',
    extensions: [
      'sass', 'styl', 'pcss', 'postcss',
    ],
  },
  'less': {
    icon: SiLess,
    name: 'Less',
    language: 'less',
    extensions: [
      'less',
    ],
  },
  'xml': {
    icon: SiXml,
    name: 'XML',
    language: 'xml',
    extensions: [
      'xml', 'xsl', 'xslt', 'svg', 'xhtml', 'xsd', 'wsdl', 'xjb', 'xhtml', 'xul', 'xbl', 'xaml', 'xlf', 'xliff',
    ],
  },
  'vue': {
    icon: SiVuedotjs,
    name: 'Vue',
    language: 'html',
    extensions: [
      'vue',
    ],
  },
  'liquid': {
    icon: SiShopify,
    name: 'Liquid',
    language: 'html',
    extensions: [
      'liquid',
    ],
  },
  'wast': {
    icon: SiWebassembly,
    name: 'wast',
    language: 'plaintext',
    extensions: [
      'wast', 'wat',
    ],
  },
  'image': {
    icon: SiJpeg,
    name: 'Image',
    language: 'plaintext',
    extensions: [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif', 'heic', 'heif',
    ],
  },
};
