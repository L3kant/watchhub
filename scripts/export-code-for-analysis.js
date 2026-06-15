const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'analysis');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'watchhub-code-export.txt');

const MAX_FILE_SIZE_BYTES = 1024 * 1024;

const SKIPPED_EXACT_FILES = new Set([
  'package-lock.json',
]);

const SKIPPED_EXTENSIONS = new Set([
  '.sqlite',
  '.db',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.svg',
  '.pdf',
  '.zip',
]);

function getGitFiles() {
  const output = execFileSync(
    'git',
    ['ls-files'],
    {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    },
  );

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'cs'));
}

function shouldSkipFile(relativePath) {
  const fileName = path.basename(relativePath);
  const extension = path.extname(relativePath).toLowerCase();

  if (SKIPPED_EXACT_FILES.has(fileName)) {
    return {
      skip: true,
      reason: 'skipped exact file',
    };
  }

  if (SKIPPED_EXTENSIONS.has(extension)) {
    return {
      skip: true,
      reason: `skipped extension ${extension}`,
    };
  }

  const absolutePath = path.join(PROJECT_ROOT, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return {
      skip: true,
      reason: 'file does not exist',
    };
  }

  const stats = fs.statSync(absolutePath);

  if (!stats.isFile()) {
    return {
      skip: true,
      reason: 'not a file',
    };
  }

  if (stats.size > MAX_FILE_SIZE_BYTES) {
    return {
      skip: true,
      reason: `file too large (${stats.size} bytes)`,
    };
  }

  return {
    skip: false,
    reason: null,
  };
}

function createTree(files) {
  const root = {};

  for (const file of files) {
    const parts = file.split('/');

    let current = root;

    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }

      current = current[part];
    }
  }

  function renderNode(node, prefix = '') {
    const entries = Object.keys(node).sort((a, b) => a.localeCompare(b, 'cs'));
    const lines = [];

    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      lines.push(`${prefix}${connector}${entry}`);

      const child = node[entry];
      const childEntries = Object.keys(child);

      if (childEntries.length > 0) {
        lines.push(...renderNode(child, `${prefix}${childPrefix}`));
      }
    });

    return lines;
  }

  return ['.'].concat(renderNode(root)).join('\n');
}

function readTextFile(relativePath) {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
}

function createExport() {
  const gitFiles = getGitFiles();

  const includedFiles = [];
  const skippedFiles = [];

  for (const file of gitFiles) {
    const skipResult = shouldSkipFile(file);

    if (skipResult.skip) {
      skippedFiles.push({
        file,
        reason: skipResult.reason,
      });
    } else {
      includedFiles.push(file);
    }
  }

  const lines = [];

  lines.push('WatchHub code export');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push(`Project root: ${PROJECT_ROOT}`);
  lines.push('');
  lines.push(`Included files: ${includedFiles.length}`);
  lines.push(`Skipped files: ${skippedFiles.length}`);
  lines.push('');

  lines.push('='.repeat(80));
  lines.push('TREE');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(createTree(includedFiles));
  lines.push('');

  if (skippedFiles.length > 0) {
    lines.push('='.repeat(80));
    lines.push('SKIPPED FILES');
    lines.push('='.repeat(80));
    lines.push('');

    for (const item of skippedFiles) {
      lines.push(`${item.file} — ${item.reason}`);
    }

    lines.push('');
  }

  lines.push('='.repeat(80));
  lines.push('FILES');
  lines.push('='.repeat(80));
  lines.push('');

  for (const file of includedFiles) {
    const fileName = path.basename(file);
    const content = readTextFile(file);

    lines.push('-'.repeat(80));
    lines.push(`PATH: ${file}`);
    lines.push(`NAME: ${fileName}`);
    lines.push('-'.repeat(80));
    lines.push('');
    lines.push(content);
    lines.push('');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8');

  console.log('Code export created:');
  console.log(OUTPUT_FILE);
  console.log('');
  console.log(`Included files: ${includedFiles.length}`);
  console.log(`Skipped files: ${skippedFiles.length}`);
}

createExport();