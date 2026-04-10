import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// 脚本入口列表
const allScripts = ['imageDownloader', 'videoDownloader'];
const selectedScript = process.env.USERSCRIPT_NAME;
const scripts = selectedScript ? [selectedScript] : ['imageDownloader'];

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
    // 多次构建时，首轮清空，后续追加
    emptyOutDir: process.env.EMPTY_OUT_DIR !== 'false',
    rollupOptions: {
      input,
      output: {
        dir: 'dist',
        entryFileNames: '[name].user.js',
        assetFileNames: 'assets/[name]-[hash]',
      },
      plugins: [
        {
          name: 'userscript-header',
          generateBundle(options, bundle) {
            for (const fileName of Object.keys(bundle)) {
              if (fileName.endsWith('.user.js')) {
                const scriptName = fileName.replace('.user.js', '');
                const header = extractHeader(scriptName);
                if (header) {
                  bundle[fileName].code = `// ==UserScript==\n${header}\n// ==/UserScript==\n\n` + bundle[fileName].code;
                }
              }
            }
          },
        },
      ],
    },
  },
});
