// Offline synthetic equivalents of StepFun's p/br/em/strong/ul/ol/li JDs.
// Run: node --test tests/jd-text.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeJD, htmlText } = require('../crawler/lib/jd-text');

function fallback(html, text, hasContent = true) {
  assert.deepEqual(normalizeJD(html), { duty: '', requirements: '', description: text, hasContent });
}

function assertPartition(result, original) {
  assert.equal(result.description, '');
  // Whitespace boundaries may change when one paragraph contains several sections.
  const characters = text => [...text.replace(/\s/g, '')].sort().join('');
  assert.equal(characters(result.duty + result.requirements), characters(original));
}

test('StepFun campus brackets retain headings, digits and technical phrases', () => {
  const duty = '【岗位描述】\n1. 参与分布式大模型推理框架的开发与优化；\n2. 针对 LLM 请求优化 GPU 计算流程。';
  const requirements = '【任职要求】\n1. 计算机相关专业本科及以上学历；\n2. 熟悉 SGLang、vLLM、Megatron 和 C++/C/Python。';
  const html = '<p>【岗位描述】</p><p>1. 参与分布式大模型推理框架的开发与优化；</p>' +
    '<p>2. 针对 LLM 请求优化 GPU 计算流程。</p><p><br></p><p>【任职要求】</p>' +
    '<p>1. 计算机相关专业本科及以上学历；</p><p>2. 熟悉 SGLang、vLLM、Megatron 和 C++/C/Python。</p>';
  const result = normalizeJD(html);
  assert.deepEqual(result, { duty, requirements, description: '', hasContent: true });
  assertPartition(result, htmlText(html));
});

test('lists and emphasis keep all prose; unfamiliar headings do not infer requirements', () => {
  const html = '<p>我们正在优化 AI Coding / Agent 的完整链路。</p><p><strong>你将负责以下方向：</strong></p>' +
    '<ul><li>建设 LLM / Agent Eval Platform。</li><li>打造 Tools &amp; Skills 体系。</li></ul>' +
    '<p><strong>你需要具备的能力：</strong></p><ol><li>精通 Python、TypeScript、Golang、Rust。</li>' +
    '<li><strong>不墨守陈规</strong>：敢于质疑权威， <em>Strong opinions, weakly held.</em></li></ol>' +
    '<p>你将获得 AI × Coding × Data 的实践经验。</p>';
  fallback(html, '我们正在优化 AI Coding / Agent 的完整链路。\n你将负责以下方向：\n' +
    '建设 LLM / Agent Eval Platform。\n打造 Tools & Skills 体系。\n你需要具备的能力：\n' +
    '精通 Python、TypeScript、Golang、Rust。\n不墨守陈规：敢于质疑权威， Strong opinions, weakly held.\n' +
    '你将获得 AI × Coding × Data 的实践经验。');
});

test('header before duty, prefix, unknown sections and footer are partitioned once', () => {
  const html = '<p>职位概览</p><p>我们寻找 Agentic AI 产品实习生。</p><p>核心职责</p>' +
    '<ol><li>对接 SWE-bench、AgentBench、WebArena。</li><li>将评测嵌入 CI/CD 流程。</li></ol>' +
    '<p>任职资格：</p><p>AI Coding &amp; 数据处理能力，熟悉 Pandas、NumPy。</p>' +
    '<p>加分项</p><ul><li>了解 LLM-as-a-Judge、Human-in-the-loop。</li></ul><p>期待你的加入！</p>';
  const result = normalizeJD(html);
  assert.equal(result.duty, '职位概览\n我们寻找 Agentic AI 产品实习生。\n核心职责\n' +
    '对接 SWE-bench、AgentBench、WebArena。\n将评测嵌入 CI/CD 流程。');
  assert.equal(result.requirements, '任职资格：\nAI Coding & 数据处理能力，熟悉 Pandas、NumPy。\n' +
    '加分项\n了解 LLM-as-a-Judge、Human-in-the-loop。\n期待你的加入！');
  assertPartition(result, htmlText(html));
});

test('numbered harness sections and requirement heading before any duty', () => {
  const html = '<p>负责 harness 的产品体验与需求洞察。</p><p>（一）岗位职责</p>' +
    '<ol><li>开发者体验（DX）：onboarding、文档、CLI/IDE 交互。</li></ol><p>（二）任职要求</p>' +
    '<ol><li>本科及以上，3 年以上开发者工具经验。</li><li>深度使用 Claude Code、Cursor、Copilot。</li></ol>';
  const result = normalizeJD(html);
  assert.equal(result.duty, '负责 harness 的产品体验与需求洞察。\n（一）岗位职责\n' +
    '开发者体验（DX）：onboarding、文档、CLI/IDE 交互。');
  assert.equal(result.requirements, '（二）任职要求\n本科及以上，3 年以上开发者工具经验。\n' +
    '深度使用 Claude Code、Cursor、Copilot。');
  assertPartition(result, htmlText(html));
  assert.deepEqual(normalizeJD('<p>团队简介</p><p>【 任职要求 】</p><p>懂 AI。</p>'), {
    duty: '团队简介', requirements: '【 任职要求 】\n懂 AI。', description: '', hasContent: true
  });
});

test('Markdown headings keep subsequent unknown sections with requirements', () => {
  const result = normalizeJD('岗位职责\n**平台规则与服务秩序**\n- 配置 MaaS 接入\n## 任职要求\n- 4 年 SaaS 经验\n## 加分项\n- 读懂 Python / cURL');
  assert.equal(result.duty, '岗位职责\n**平台规则与服务秩序**\n- 配置 MaaS 接入');
  assert.equal(result.requirements, '## 任职要求\n- 4 年 SaaS 经验\n## 加分项\n- 读懂 Python / cURL');
});

test('explicit inline brackets divide all spans, including multiple section switches', () => {
  const html = '<p>团队前言【岗位描述】1. 构建 AGI【任职要求】2. 熟悉 C++【工作职责】3. 优化 GPU【任职资格】4. 懂 Python。</p>';
  const result = normalizeJD(html);
  assert.deepEqual(result, {
    duty: '团队前言\n【岗位描述】1. 构建 AGI\n【工作职责】3. 优化 GPU',
    requirements: '【任职要求】2. 熟悉 C++\n【任职资格】4. 懂 Python。',
    description: '', hasContent: true
  });
  assertPartition(result, htmlText(html));
  assert.equal(normalizeJD('<p>（二）【任职要求】熟悉 AI</p>').requirements, '（二）【任职要求】熟悉 AI');
});

test('only clearly marked Chinese and English heading lines switch sections', () => {
  for (const label of ['任职要求', '任职资格', '岗位要求', '职位要求', 'Requirements', 'Qualifications']) {
    const result = normalizeJD(`<p>Responsibilities: build GPU systems</p><p>${label}：会写代码。</p>`);
    assert.equal(result.duty, 'Responsibilities: build GPU systems');
    assert.equal(result.requirements, `${label}：会写代码。`);
    assert.equal(result.description, '');
  }
  assert.deepEqual(normalizeJD('requirements\nC++\nJob Responsibilities\nBuild infra'), {
    duty: 'Job Responsibilities\nBuild infra', requirements: 'requirements\nC++', description: '', hasContent: true
  });
  for (const prefix of ['## ', '（二）', '(2) ', '二、', '2. ']) {
    assert.equal(normalizeJD(`${prefix}任职要求\n懂 AI`).requirements, `${prefix}任职要求\n懂 AI`);
  }
});

test('ambiguous prose and duty-only headings fall back to the complete body', () => {
  const text = '岗位职责\n该岗位要求base上海。\n任职要求很高，但不限制专业。\n' +
    'Requirements gathering is part of this role.\nDiscuss Qualifications with the team.\n' +
    '我们希望你懂 Python、RAG、AI Coding。\n【任职要求不是标题】也保留。';
  fallback(text, text);
  fallback('<p>工作职责</p><p>做好自己的工作。</p>', '工作职责\n做好自己的工作。');
});

test('complete long paragraphs have no length cutoff or skill-based extraction', () => {
  const prose = 'Post-Train SFT、RLVR、RLHF、AgentRL；tensor parallelism 与 pipeline scheduling；NCCL 通信和 GPU 显存布局。'.repeat(250);
  assert.ok(prose.length > 10000);
  fallback(`<p><strong>核心目标</strong></p><p>${prose}</p><p>最后一句不能丢。</p>`, `核心目标\n${prose}\n最后一句不能丢。`);
  const split = normalizeJD(`<p>岗位职责</p><p>${prose}</p><p>任职要求</p><p>${prose}尾部。</p>`);
  assert.equal(split.duty, `岗位职责\n${prose}`);
  assert.equal(split.requirements, `任职要求\n${prose}尾部。`);
  assert.equal(split.description, '');
});

test('HTML whitespace, attributes, nested lists and br remain readable without generated bullets', () => {
  const html = '\n <P title="a > b">Hello\n <strong>world</strong> &nbsp; again<br/>next</P>\n' +
    '<ul><li>1. alpha<ul><li>nested <em>beta</em></li></ul></li><li>2. gamma</li></ul>' +
    '<ol><li>one</li><li>two</li></ol><p>n&lt;10 &amp;&amp; m&gt;5</p>';
  assert.equal(htmlText(html), 'Hello world again\nnext\n1. alpha\nnested beta\n2. gamma\none\ntwo\nn<10 && m>5');
  assert.equal(htmlText('plain\r\nheading\rnext\tline'), 'plain\nheading\nnext line');
  assert.equal(htmlText('n<10 && m>5'), 'n<10 && m>5');
});

test('attribute-name quotes never leak markup, while quoted values retain their real boundary', () => {
  // Real Ctrip social 30439707 serialized font-family as quoted attribute-name fragments.
  const tag = '<p style="font-family: -apple-system, " segoe="" ui",="" "helvetica="" neue",="" emoji""="">';
  for (const start of ['<p bad"="">', '<p bad\'=\'\'>', tag]) {
    assert.equal(htmlText(start + 'Work</p>'), 'Work');
    fallback(start + '</p>', '', false);
    fallback(start + '。/-</p>', '。/-', false);
  }
  assert.equal(htmlText('<p title="one > two" bad"="">Work</p>'), 'Work');
  assert.equal(htmlText('<p title=\'one > two\' bad"="">Work</p>'), 'Work');
  assert.equal(htmlText('<p style="color:red"next="value > right">Work</p>'), 'Work');
  assert.equal(htmlText('<script bad"="">Fake requirements</script><p>Work</p>'), 'Work');
  assert.equal(htmlText('<p>&lt;p bad&quot;=&quot;&quot;&gt;Literal&lt;/p&gt;</p>'), '<p bad"="">Literal</p>');
});

test('unterminated attribute scanning is bounded, not exponential backtracking', () => {
  const { spawnSync } = require('node:child_process');
  const modulePath = require.resolve('../crawler/lib/jd-text');
  const text = '<p ' + 'x'.repeat(4096);
  const result = spawnSync(process.execPath, ['-e', `const a=require('node:assert/strict');a.equal(require(${JSON.stringify(modulePath)}).htmlText(${JSON.stringify(text)}),${JSON.stringify(text)})`], { encoding: 'utf8', timeout: 3000 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
});

test('entities decode once after stripping, retaining escaped malicious tags as literal text', () => {
  const html = '<p>&lt;img src=x onerror="throw 1"&gt; &lt;script&gt;alert(1)&lt;/script&gt;</p>' +
    '<p>A &amp; B &quot;q&quot; &apos;a&apos; &#60;b&#62; &#x3c;/b&#x3E; &#20013;&#x6587; &#x1f680;</p>' +
    '<p>&amp;lt; &unknown; &copy; &mdash; &bull;</p><img src=x onerror="throw 2">';
  fallback(html, '<img src=x onerror="throw 1"> <script>alert(1)</script>\n' +
    'A & B "q" \'a\' <b> </b> 中文 🚀\n&lt; &unknown; © — •');
  assert.equal(htmlText('&#65 &#x42; &#128; &#0; &#xD800; &#x110000;'), 'A B € � � �');
});

test('real scripts, styles, comments and their fake headings are ignored, never executed', () => {
  const html = '<!doctype html><p>正文</p><!-- 任职要求 <p>not text</p> -->' +
    '<ScRiPt data-note="x > y">throw new Error("never run"); 任职要求 <p>fake</p></sCrIpT>' +
    '<STYLE>p { display: none } 岗位职责</STYLE><p>安全 <strong>文字</strong>。</p>';
  fallback(html, '正文\n安全 文字。');
  assert.equal(htmlText('<p>保留</p><script>unclosed fake text'), '保留');
  assert.equal(htmlText('<p>保留</p><!-- unclosed comment'), '保留');
  fallback('<p>&lt;!-- literal comment --&gt;</p>', '<!-- literal comment -->');
});

test('punctuation is preserved while content presence requires real letters or numbers', () => {
  for (const text of ['./-', '。', '—…•', '🚀', '']) fallback(`<p>${text}</p>`, text, false);
  for (const text of ['做', 'A', '1', '中。', 'é', '٣', 'C++/GPU: 2-4年！']) fallback(`<p>${text}</p>`, text);
  assert.deepEqual(normalizeJD('<p>任职要求</p><p>。/-</p>'), {
    duty: '', requirements: '任职要求\n。/-', description: '', hasContent: true
  });
  fallback(' <br> &nbsp; <!-- empty --> ', '', false);
});

test('missing strings are empty; invalid structured JD values are not silently coerced', () => {
  for (const value of [null, undefined, '']) fallback(value, '', false);
  for (const value of [42, {}, [], true]) assert.throws(() => normalizeJD(value), /JD must be a string/);
  assert.deepEqual(Object.keys(normalizeJD('AI')).sort(), ['description', 'duty', 'hasContent', 'requirements']);
});
