'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const createRank = require('../assets/rank.js');

test('网易 social, 互娱 and 雷火 sources are one recruiting unit; a unit selection finds all three', () => {
  const rank = createRank({});
  for (const company of ['网易', '网易互娱', '网易雷火']) a.deepEqual(rank.unitNames({ company, sourceKey: 'x' }), ['网易']);
  a.deepEqual(rank.unitNames({ company: '字节跳动', sourceKey: 'bytedance' }), ['字节跳动']);
  const jobs = ['网易', '网易互娱', '网易雷火', '字节跳动'].map((company, i) => ({ id: 'j' + i, company, sourceKey: 's' + i, title: '岗位', channels: [] }));
  a.deepEqual(rank.collect(jobs, { words: [] }, new Set(['网易'])).map(r => r.job.company), ['网易', '网易互娱', '网易雷火']);
});
