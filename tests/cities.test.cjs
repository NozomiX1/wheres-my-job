'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const { cityKeys } = require('../assets/cities.js');
const createRank = require('../assets/rank.js');

test('cityKeys: official spellings of one city collapse to one name', () => {
  for (const city of ['北京', '北京市', 'Beijing', '北京市-北京市', '海淀区', '北京总部']) a.deepEqual(cityKeys(city), ['北京'], city);
  a.deepEqual(cityKeys('上海市-上海市-嘉定区'), ['上海']);
  a.deepEqual(cityKeys('安徽省·合肥市'), ['合肥']);
  a.deepEqual(cityKeys('河北省-廊坊市-固安县'), ['廊坊']);
  a.deepEqual(cityKeys('广东省-深圳市'), ['深圳']);
  a.deepEqual(cityKeys('南山区'), ['深圳']);
});

test('cityKeys: several cities split on / , 、 ; and on spaces next to Chinese; duplicates removed', () => {
  a.deepEqual(cityKeys('北京/上海/杭州'), ['北京', '上海', '杭州']);
  a.deepEqual(cityKeys('北京市，上海市'), ['北京', '上海']);
  a.deepEqual(cityKeys('深圳总部 上海 澄迈县 '), ['深圳', '上海', '澄迈县']);
  a.deepEqual(cityKeys('徐汇区/徐汇区/上海'), ['上海']);
});

test('cityKeys: Hong Kong / Macao, English names and multi-word English cities', () => {
  a.deepEqual(cityKeys('香港特别行政区'), ['香港']);
  a.deepEqual(cityKeys('中国香港'), ['香港']);
  a.deepEqual(cityKeys('Shanghai'), ['上海']);
  a.deepEqual(cityKeys('US-California-Palo Alto'), ['帕洛阿尔托']);
  a.deepEqual(cityKeys('Kuala Lumpur'), ['吉隆坡']);
});

test('cityKeys: provinces, empty and non-string values give no city (treated as unknown by the scope)', () => {
  for (const city of ['广东省', '新疆维吾尔自治区', '台湾省', '四川省,贵州省,云南省', '', '  ', null, undefined, 42]) a.deepEqual(cityKeys(city), [], String(city));
  a.deepEqual(cityKeys('北京市,云南省'), ['北京'], 'a province next to a city is ignored');
});

test('cityKeys: real county-level and unknown places are kept as they are', () => {
  a.deepEqual(cityKeys('海南省·陵水黎族自治县'), ['陵水黎族自治县']);
  a.deepEqual(cityKeys('澄迈县'), ['澄迈县']);
  a.deepEqual(cityKeys('某某区'), ['某某区']);
});

test('selectsCity: no selection keeps everything; a selection keeps matches and, by default, jobs with no known city', () => {
  const { selectsCity } = createRank({});
  const bj = { city: '北京市' }, sh = { city: '上海/杭州' }, prov = { city: '广东省' }, none = { city: '' };
  const cities = new Set(['北京']);
  for (const j of [bj, sh, prov, none]) a.equal(selectsCity(j, new Set()), true);
  a.deepEqual([bj, sh, prov, none].map(j => selectsCity(j, cities)), [true, false, true, true]);
  a.deepEqual([bj, sh, prov, none].map(j => selectsCity(j, cities, false)), [true, false, false, false]);
  a.equal(selectsCity(sh, new Set(['杭州', '成都'])), true, 'any of several selected cities matches');
  a.equal(selectsCity({ city: '北京', __cities: ['上海'] }, cities), false, 'precomputed __cities wins');
});
