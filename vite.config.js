import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// 脚本入口列表
const allScripts = ['imageDownloader', 'videoDownloader'];
const selectedScript = process.env.USERSCRIPT_NAME;
const scripts = selectedScript ? [selectedScript] : ['imageDownloader'];

function getBuildPrefix() {
  const configuredPrefix = String(process.env.BUILD_PREFIX || '').trim();
  if (configuredPrefix) {
    if (!/^[0-9A-Za-z_-]+$/.test(configuredPrefix)) {
      throw new Error('BUILD_PREFIX 只能包含字母、数字、下划线和连字符');
    }
    return configuredPrefix;
  }

  // 当前毫秒时间转成 Base36，通常只有 8 位，并且不会依赖共享状态文件。
  return Date.now().toString(36);
}

const buildPrefix = getBuildPrefix();

if (selectedScript && !allScripts.includes(selectedScript)) {
  throw new Error(
    `未知脚本入口: ${selectedScript}。可选值: ${allScripts.join(', ')}`
  );
}

// 生成多入口配置
const input = {};
scripts.forEach((name) => {
  input[name] = resolve(__dirname, `src/scripts/${name}/main.js`);
});

// 提取 UserScript 头部元数据
function extractHeader(scriptName) {
  const filePath = resolve(__dirname, `src/scripts/${scriptName}/main.js`);
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/export\s+const\s+USERSCRIPT_HEADER\s*=\s*`([\s\S]*?)`;/);
  return match ? match[1].trim() : null;
}

export default defineConfig({
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // 每次构建使用新文件名，旧产物由使用者手动清理。
    emptyOutDir: false,
    rollupOptions: {
      input,
      output: {
        dir: 'dist',
        entryFileNames: `${buildPrefix}-[name].user.js`,
        assetFileNames: 'assets/[name]-[hash]',
      },
      plugins: [
        {
          name: 'userscript-header',
          generateBundle(options, bundle) {
            for (const fileName of Object.keys(bundle)) {
              const chunk = bundle[fileName];
              if (fileName.endsWith('.user.js') && chunk.type === 'chunk' && chunk.isEntry) {
                const header = extractHeader(chunk.name);
                if (header) {
                  chunk.code = `// ==UserScript==\n${header}\n// ==/UserScript==\n\n` + chunk.code;
                }
              }
            }
          },
        },
      ],
    },
  },
});
