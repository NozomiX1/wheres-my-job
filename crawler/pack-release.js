'use strict';
// 把已发布数据（data/）打成 Release 附件：data.tar.gz ＋ 很小的 data-meta.json（岗位数、来源数、更新时间、sha256），
// 拉取方先读 meta 判断有没有新数据，下载后用 sha256 校验。用法：node crawler/pack-release.js <输出目录> [数据目录，默认 data]
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { readPublished } = require('./publish');

function pack(outDir, dataDir = path.join(__dirname, '..', 'data')) {
  const data = readPublished(path.join(dataDir, 'catalog.js'));
  if (!data.jobs.length) throw new Error('没有已发布数据，不打包');
  fs.mkdirSync(outDir, { recursive: true });
  const archive = path.join(outDir, 'data.tar.gz');
  const tar = spawnSync('tar', ['-czf', archive, '-C', path.dirname(dataDir), path.basename(dataDir)], { encoding: 'utf8' });
  if (tar.status !== 0) throw new Error('tar 失败：' + tar.stderr);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  const updatedAt = data.sources.map(s => s.lastSuccess).filter(Boolean).sort().at(-1) ?? null;
  const meta = { jobs: data.jobs.length, sources: data.sources.length, updatedAt, builtAt: new Date().toISOString(), bytes: fs.statSync(archive).size, sha256 };
  fs.writeFileSync(path.join(outDir, 'data-meta.json'), JSON.stringify(meta, null, 1) + '\n');
  return meta;
}

module.exports = { pack };
if (require.main === module) {
  try { console.log(JSON.stringify(pack(process.argv[2] || 'release-out', process.argv[3]))); }
  catch (error) { console.error('ERR ' + error.message); process.exitCode = 1; }
}
