#!/usr/bin/env node
/**
 * docs 配下の .md の「**更新日**」「**作成日**」を
 * ファイルシステムの mtime / birthtime で上書きする。
 * 実行: node scripts/update-doc-dates.js
 * 対象: backend/docs/*.md（PROGRESS*.md, STATUS.md, CURRENT_FOCUS.md は除外可）
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const SKIP_FILES = new Set(['PROGRESS.md', 'PROGRESS_backup.md', 'PROGRESS_PHASE19.md', 'STATUS.md', 'CURRENT_FOCUS.md']);

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function updateFile(filePath) {
  const name = path.basename(filePath);
  if (SKIP_FILES.has(name)) return { updated: false, reason: 'skip' };

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { updated: false, reason: 'read error', error: e.message };
  }

  const hasCreated = /\*\*作成日\*\*:\s*.+/.test(content);
  const hasUpdated = /\*\*更新日\*\*:\s*.+/.test(content);
  if (!hasCreated && !hasUpdated) return { updated: false, reason: 'no date fields' };

  const stat = fs.statSync(filePath);
  const mtimeStr = formatDate(stat.mtime);
  const birthtimeStr = formatDate(stat.birthtime);

  let newContent = content;
  // 行末までを置換（YYYY-MM-DD HH:mm や YYYY-MM-DD 等の形式に対応）
  if (hasCreated) {
    newContent = newContent.replace(/\*\*作成日\*\*:\s*[^\n]*/m, `**作成日**: ${birthtimeStr}`);
  }
  if (hasUpdated) {
    newContent = newContent.replace(/\*\*更新日\*\*:\s*[^\n]*/m, `**更新日**: ${mtimeStr}`);
  }

  if (newContent === content) return { updated: false, reason: 'unchanged' };

  try {
    fs.writeFileSync(filePath, newContent, 'utf8');
  } catch (e) {
    return { updated: false, reason: 'write error', error: e.message };
  }

  return { updated: true, mtime: mtimeStr, birthtime: birthtimeStr };
}

function main() {
  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
  let updated = 0;
  for (const f of files) {
    const result = updateFile(path.join(DOCS_DIR, f));
    if (result.updated) {
      console.log(`${f}: 更新日=${result.mtime}, 作成日=${result.birthtime}`);
      updated++;
    }
  }
  console.log(`\n${updated} 件のドキュメントの日付をファイルシステムの日時に合わせました。`);
}

main();
