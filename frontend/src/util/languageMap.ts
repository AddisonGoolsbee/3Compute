import { cpp } from '@codemirror/lang-cpp';
import { css } from '@codemirror/lang-css';
import { go } from '@codemirror/lang-go';
import { html } from '@codemirror/lang-html';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { less } from '@codemirror/lang-less';
import { liquid } from '@codemirror/lang-liquid';
import { markdown } from '@codemirror/lang-markdown';
import { php } from '@codemirror/lang-php';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { sass } from '@codemirror/lang-sass';
import { sql } from '@codemirror/lang-sql';
import { vue } from '@codemirror/lang-vue';
import { wast } from '@codemirror/lang-wast';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { SiCplusplus, SiCss, SiGo, SiHtml5, SiJavascript, SiJson, SiLess, SiLinux, SiMarkdown, SiPhp, SiPython, SiRust, SiSass, SiShopify, SiSqlite, SiTypescript, SiVuedotjs, SiWebassembly, SiXml, SiYaml, SiJpeg } from '@icons-pack/react-simple-icons';
import { Text } from 'lucide-react';

export const languageMap = {
  'javascript': {
    icon: SiJavascript,
    name: 'JavaScript',
    parser: javascript,
    extensions: [
      'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts',
    ],
  },
  'typescript': {
    icon: SiTypescript,
    name: 'TypeScript',
    parser: javascript,
    extensions: [
      'ts', 'tsx', 'mts', 'cts', 'd.ts', 'd.mts', 'd.cts', 'd.mtsx', 'd.ctsx', 'd.mjs', 'd.cjs',
    ],
  },
  'python': {
    icon: SiPython,
    name: 'Python',
    parser: python,
    extensions: [
      'py', 'pyw', 'pyi', 'pyx', 'pyd', 'pyo', 'pyz', 'pyc', 'pyd', 'pypi', 'pypm', 'pypk', 'pypx',
    ],
  },
  'html': {
    icon: SiHtml5,
    name: 'HTML',
    parser: html,
    extensions: [
      'html', 'htm', 'xhtml', 'shtml', 'xhtml', 'mhtml', 'mht', 'webp', 'svg',
    ],
  },
  'css': {
    icon: SiCss,
    name: 'CSS',
    parser: css,
    extensions: [
      'css', 'scss', 'sass', 'less', 'styl', 'pcss', 'postcss', 'cssm', 'cssx',
    ],
  },
  'xml': {
    icon: SiXml,
    name: 'XML',
    parser: xml,
    extensions: [
      'xml', 'xsl', 'xslt', 'svg', 'xhtml', 'xsd', 'wsdl', 'xjb', 'xhtml', 'xul', 'xbl', 'xaml', 'xlf', 'xliff',
    ],
  },
  'json': {
    icon: SiJson,
    name: 'JSON',
    parser: json,
    extensions: [
      'json', 'jsonc', 'json5', 'geojson', 'cjson', 'jsonl', 'jsonld', 'jsonnet', 'har', 'webmanifest', 'map',
    ],
  },
  'yaml': {
    icon: SiYaml,
    name: 'YAML',
    parser: yaml,
    extensions: [
      'yaml', 'yml', 'ymlc', 'yml5', 'ymlnet', 'ymlld', 'ymljson', 'ymljsonc',
    ],
  },
  'markdown': {
    icon: SiMarkdown,
    name: 'Markdown',
    parser: markdown,
    extensions: [
      'md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdx', 'mdtxt', 'mdtext', 'mdml', 'mdhtml',
    ],
  },
  'php': {
    icon: SiPhp,
    name: 'PHP',
    parser: php,
    extensions: [
      'php', 'php3', 'php4', 'php5', 'phtml', 'phps', 'php7', 'php8', 'phar', 'inc',
    ],
  },
  'java': {
    icon: SiLinux,
    name: 'Java',
    parser: java,
    extensions: [
      'java', 'jav', 'jvm', 'jsh', 'jsp', 'jspx', 'jhtml', 'jhtm', 'jws', 'jwsdl',
    ],
  },
  'c++': {
    icon: SiCplusplus,
    name: 'C++',
    parser: cpp,
    extensions: [
      'cpp', 'cxx', 'cc', 'c++', 'h', 'hpp', 'hxx', 'hh', 'h++', 'c++m', 'c++h', 'c++hpp', 'c++hxx', 'c++hh',
    ],
  },
  'rust': {
    icon: SiRust,
    name: 'Rust',
    parser: rust,
    extensions: [
      'rs', 'rlib', 'rmeta', 'rdata', 'rprof', 'rlibc', 'rlibd', 'rlibp', 'rlibt', 'rlibx', 'rliby', 'rlibz',
    ],
  },
  'go': {
    icon: SiGo,
    name: 'Go',
    parser: go,
    extensions: [
      'go', 'gomod', 'go.sum', 'go.work', 'go.mod', 'go.work.sum', 'go.mod.json', 'go.work.json',
    ],
  },
  'vue': {
    icon: SiVuedotjs,
    name: 'Vue',
    parser: vue,
    extensions: [
      'vue', 'vuesfc', 'vuex', 'vuejs', 'vue3', 'vue4', 'vue5', 'vue6', 'vue7', 'vue8', 'vue9',
    ],
  },
  'liquid': {
    icon: SiShopify,
    name: 'Liquid',
    parser: liquid,
    extensions: [
      'liquid', 'liquidjs', 'liquidjson', 'liquidxml', 'liquidyaml', 'liquidmd', 'liquidmdx',
    ],
  },
  'less': {
    icon: SiLess,
    name: 'Less',
    parser: less,
    extensions: [
      'less', 'lss', 'lcss', 'lscss', 'lscss', 'lcssm', 'lcssx', 'lcssy', 'lcssz',
    ],
  },
  'sass': {
    icon: SiSass,
    name: 'Sass',
    parser: sass,
    extensions: [
      'sass', 'scss', 'sassc', 'sassm', 'sassx', 'sassy', 'sassz', 'sassyml', 'sassyaml', 'sassjson',
    ],
  },
  'sql': {
    icon: SiSqlite,
    name: 'SQL',
    parser: sql,
    extensions: [
      'sql', 'sqlite', 'sqlite3', 'sqlx', 'sqljs', 'sqljson', 'sqlxml', 'sqlyaml', 'sqlmd', 'sqlmdx',
    ],
  },
  'wast': {
    icon: SiWebassembly,
    name: 'wast',
    parser: wast,
    extensions: [
      'wast', 'wat', 'wastc', 'watt', 'wastm', 'wattm', 'wastx', 'wattx', 'wasty', 'watty', 'wastz', 'wattz',
    ],
  },
  'image': {
    icon: SiJpeg,
    name: 'Image',
    parser: () => [], // No specific parser, just a placeholder
    extensions: [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif', 'heic', 'heif',
    ],
  },
  'text': {
    icon: Text,
    name: 'Text',
    parser: () => [], // No specific parser, just a placeholder
    extensions: [] as string[],
  },
};