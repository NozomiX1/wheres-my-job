'use strict';
// 适配器交给发布流程的可选展示字段（只用于卡片，没有就不出现在记录里，保持记录里没有 undefined 键）。

// 官网列表里岗位所属的部门/业务线名称（不是招聘单位，也不当作法律雇主）。
// 字符串数组用 / 连接（雷火的 department_name）；对象数组取第一个的 name（美团的 department 是 [{name, children}]）。
function departmentField(value) {
  const first = Array.isArray(value) && value[0] && typeof value[0] === 'object' ? value[0].name : value;
  const text = (Array.isArray(first) ? first.filter(v => typeof v === 'string').join('/') : typeof first === 'string' ? first : '').trim();
  return text ? { department: text } : {};
}
// 经验、学历要求（官网结构化字段的原值，发布时再统一成「3-5年」「本科及以上」）和招聘批次/项目名（用来认「XX届」）：只保留有内容的。
function optionalFields(fields) {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => (typeof v === 'string' && v.trim()) || (typeof v === 'number' && Number.isFinite(v))).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
}
// 蚂蚁、阿里社招的 experience 是 { from, to }（年）：下限 ≥1 才算有要求。
const yearsRange = e => e && Number(e.from) >= 1 ? (Number(e.to) > Number(e.from) ? e.from + '-' + e.to + '年' : e.from + '年以上') : undefined;
module.exports = { departmentField, optionalFields, yearsRange };
