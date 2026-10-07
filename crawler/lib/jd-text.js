// Offline plain-text conversion for JD HTML; never evaluates or renders input.
'use strict';

const ENTITIES = {
  amp: '&', AMP: '&', lt: '<', LT: '<', gt: '>', GT: '>',
  quot: '"', QUOT: '"', apos: "'", nbsp: '\u00a0',
  ndash: '–', mdash: '—', hellip: '…', bull: '•', middot: '·',
  copy: '©', reg: '®', trade: '™', laquo: '«', raquo: '»', euro: '€'
};
// HTML numeric references in this range use Windows-1252, not C1 controls.
const C1 = {
  128: 8364, 130: 8218, 131: 402, 132: 8222, 133: 8230, 134: 8224,
  135: 8225, 136: 710, 137: 8240, 138: 352, 139: 8249, 140: 338,
  142: 381, 145: 8216, 146: 8217, 147: 8220, 148: 8221, 149: 8226,
  150: 8211, 151: 8212, 152: 732, 153: 8482, 154: 353, 155: 8250,
  156: 339, 158: 382, 159: 376
};
const TOKENS = /<!--[\s\S]*?(?:-->|$)|<\/?([a-z][\w:-]*)\b|<[!?][^>]*>/gi;
const BLOCK = /^(?:p|br|div|ul|ol|li|h[1-6]|section|article|header|footer|blockquote|pre|hr|table|tr|dl|dt|dd)$/i;

function decodeEntities(text) {
  return text.replace(/&(#(?:x[\da-f]+|\d+);?|[a-z][a-z\d]*;)/gi, (entity, name) => {
    name = name.replace(/;$/, '');
    if (name[0] !== '#') return Object.hasOwn(ENTITIES, name) ? ENTITIES[name] : entity;
    let point = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    if (!point || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return '\ufffd';
    point = C1[point] ?? point;
    return String.fromCodePoint(point);
  });
}

// Linear HTML attribute scan: a quote opens a value only after '='; quotes in names/unquoted values are literal.
function tagEnd(source, start) {
  let state = 'before', quote = '';
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (c === quote) { quote = ''; state = 'before'; } continue; }
    if (c === '>') return i + 1;
    const space = /[\t\n\f\r ]/.test(c);
    if (state === 'value') {
      if (space) continue;
      if (c === '"' || c === "'") quote = c;
      else state = 'unquoted';
    } else if (state === 'unquoted') {
      if (space) state = 'before';
    } else if (c === '=' && (state === 'name' || state === 'after')) state = 'value';
    else if (space) { if (state === 'name') state = 'after'; }
    else if (c !== '/' || state !== 'before') state = 'name';
  }
  return -1;
}
function stripTags(source) {
  const parts = []; let cursor = 0; TOKENS.lastIndex = 0;
  for (let token; (token = TOKENS.exec(source));) {
    const tag = token[1], end = tag ? tagEnd(source, TOKENS.lastIndex) : TOKENS.lastIndex;
    if (end < 0) break;
    let after = end, replacement = '';
    if (tag && /^(?:script|style)$/i.test(tag) && token[0][1] !== '/') {
      const close = new RegExp('</' + tag + '\\s*>', 'gi'); close.lastIndex = end;
      const match = close.exec(source); after = match ? close.lastIndex : source.length;
    } else if (tag) replacement = /^(?:td|th)$/i.test(tag) ? ' ' : BLOCK.test(tag) ? '\n' : '';
    parts.push(source.slice(cursor, token.index), replacement); cursor = after; TOKENS.lastIndex = after;
  }
  parts.push(source.slice(cursor)); return parts.join('');
}
function htmlText(html) {
  if (html == null) return '';
  if (typeof html !== 'string') throw new TypeError('JD must be a string');
  let source = html.replace(/\r\n?/g, '\n');
  // Source formatting whitespace collapses inside HTML, but plain-text JDs keep lines.
  if (/<\/?[a-z][\w:-]*(?:\s|\/?>)|<!--|<!doctype\b/i.test(source)) {
    source = source.replace(/[ \t\n\f]+/g, ' ');
  }
  const stripped = stripTags(source);
  // Decode only after removing real markup: escaped tags stay literal text.
  return decodeEntities(stripped)
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

const REQUIREMENTS = '任职要求|任职资格|岗位要求|职位要求|工作要求|Requirements|Qualifications';
const DUTIES = '工作职责|岗位职责|职位职责|岗位描述|职位描述|工作内容|职责描述|主要职责|核心职责|Responsibilities|Job Responsibilities|Duties|Job Description';
const LABEL = `(?:${REQUIREMENTS}|${DUTIES})`;
const NUMBERING = '(?:[（(][一二三四五六七八九十\\d]+[）)]|[一二三四五六七八九十\\d]+[、.．)])';
const LINE_HEADING = new RegExp(`^(?:#{1,6}\\s*)?(?:${NUMBERING}\\s*)?(?:【\\s*(${LABEL})\\s*】|(${LABEL})(?=\\s*[:：]|\\s*$))`, 'i');
const INLINE_HEADING = new RegExp(`【\\s*(${LABEL})\\s*】`, 'gi');
const IS_REQUIREMENT = new RegExp(`^(?:${REQUIREMENTS})$`, 'i');

function normalizeJD(html) {
  const full = htmlText(html);
  const hasContent = /[\p{L}\p{N}]/u.test(full);
  const sections = { duty: [], requirements: [] };
  let current = 'duty';
  let foundRequirements = false;
  for (const line of full.split('\n')) {
    const heading = line.match(LINE_HEADING);
    const markers = [{ index: 0, label: heading ? heading[1] || heading[2] : null }];
    for (const match of line.matchAll(INLINE_HEADING)) {
      if (heading && match.index < heading[0].length) continue;
      if (match.index === 0) markers[0].label = match[1];
      else markers.push({ index: match.index, label: match[1] });
    }
    for (let i = 0; i < markers.length; i++) {
      const { index, label } = markers[i];
      if (label) {
        current = IS_REQUIREMENT.test(label) ? 'requirements' : 'duty';
        if (current === 'requirements') foundRequirements = true;
      }
      sections[current].push(line.slice(index, markers[i + 1]?.index ?? line.length));
    }
  }
  if (!foundRequirements) return { duty: '', requirements: '', description: full, hasContent };
  return {
    duty: sections.duty.join('\n').trim(),
    requirements: sections.requirements.join('\n').trim(),
    description: '', hasContent
  };
}

module.exports = { normalizeJD, htmlText };
