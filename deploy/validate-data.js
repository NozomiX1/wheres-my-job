'use strict';
// 上线前校验一份新数据：能读、有岗位、不比现有数据少一半以上。用法：node deploy/validate-data.js <新数据目录> [现有数据目录] [--min-ratio=0.5]
const path = require('node:path');
const { readPublished } = require('../crawler/publish');

const args = process.argv.slice(2), flag = args.find(a => a.startsWith('--min-ratio=')), [next, current] = args.filter(a => !a.startsWith('--'));
const ratio = flag ? Number(flag.split('=')[1]) : 0.5;
try {
  if (!next) throw new Error('用法：validate-data.js <新数据目录> [现有数据目录]');
  const fresh = readPublished(path.join(next, 'catalog.js'));
  if (!fresh.jobs.length) throw new Error('新数据没有岗位');
  const old = current ? readPublished(path.join(current, 'catalog.js')).jobs.length : 0;
  if (old && fresh.jobs.length < old * ratio) throw new Error('新数据岗位数 ' + fresh.jobs.length + ' 少于现有 ' + old + ' 的 ' + Math.round(ratio * 100) + '%，拒绝上线');
  console.log('校验通过：' + fresh.jobs.length + ' 个岗位，' + fresh.sources.length + ' 个来源' + (old ? '（现有 ' + old + '）' : ''));
} catch (error) { console.error('校验失败：' + error.message); process.exitCode = 1; }
