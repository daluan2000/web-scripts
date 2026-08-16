import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

const ALL_SCRIPTS = ['imageDownloader', 'videoDownloader'];
const requestedScripts = process.argv.slice(2);
const scripts = requestedScripts.length > 0 ? requestedScripts : ALL_SCRIPTS;
const unknownScripts = scripts.filter((name) => !ALL_SCRIPTS.includes(name));

if (unknownScripts.length > 0) {
  throw new Error(
    `未知脚本入口: ${unknownScripts.join(', ')}。可选值: ${ALL_SCRIPTS.join(', ')}`
  );
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configFile = resolve(projectRoot, 'vite.config.js');
const buildPrefix = String(process.env.BUILD_PREFIX || '').trim() || Date.now().toString(36);

process.chdir(projectRoot);
process.env.BUILD_PREFIX = buildPrefix;

console.log(`本次构建前缀: ${buildPrefix}`);

for (const scriptName of scripts) {
  process.env.USERSCRIPT_NAME = scriptName;
  await build({ configFile });
}
