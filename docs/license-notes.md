# 许可研究记录（历史参考）

> **最新决定：用户已选择直接在 README 写简明非商业使用说明，禁止商用及收费变现。不采用下列标准许可或完整定制审核路线；下文保留为历史研究，不是当前待选方案或实施前置条件。**

> 已用 `curl -L --fail --max-time 35` 抓取官方原文到 `/tmp`，实读 PolyForm NC 1.0.0、Commons Clause v1.0、Apache 2.0 完整文本；CC FAQ、SPDX 核对相关段落。不是检索合成，也不是已采用许可、法律定论或侵权防护保证。

## 用户目标与此前建议（未采用）
- 需求：源码公开，网站与个人求职免费；不允许第三方商用/收费，尤其代码或衍生项目换皮收费。用户不打算靠商业授权赚钱。
- **按用户当前全面禁止商用和收费的目标，主建议是简短定制「非商业免费共享」许可的审核方向。** 可以明确个人求职与学习权限，同时不默认加入教育/慈善等机构收费例外；由熟悉软件许可的法律专业人士审阅。不能假称定制即可禁止所有法律允许的例外或保证维权结果；以下不是合同草案。
- **更省事的标准候选是原版 PolyForm Noncommercial 1.0.0，但有条件。** 仅当用户接受其列明机构的宽泛用途许可、允许的复制/修改/分发，以及它并非“任何第三方绝不可以收费”时采用；个人求职与收费分发边界仍应先审阅。[1]
- Commons Clause 更接近“禁止出售软件核心价值”，不是全面禁止商用，故不作为当前目标的主推荐。[2]

## PolyForm NC 1.0.0：已核实条款
- **Noncommercial Purposes**：原文为 “Any noncommercial purpose is a permitted purpose.”；全文未给出一般性的 `commercial` 定义，也没有覆盖所有主体、所有收费的一条零收费禁令。[1]
- **Copyright License / Changes and New Works License**：按 `permitted purpose` 授权使用、修改及基于软件创作新作；因此它不是禁止别人复制或改造代码，而是限制相应授权的用途。[1]
- **Personal Uses**：列举公共知识研究/实验/测试、个人学习、私人娱乐、爱好、业余活动、宗教实践，并要求 “without any anticipated commercial application”。“个人求职”没有被明确列举；不能仅凭“个人”或“免费”就保证覆盖，须核清它是否属于许可用途及与取得报酬的关系。[1]
- **Noncommercial Organizations**：慈善组织、教育机构、公共研究组织、公共安全或健康组织、环保组织、政府机构的使用都算许可用途，且 “regardless of the source of funding or obligations resulting from the funding”。这是一项按机构类别给出的宽泛许可，不只是资助来源豁免。[1]
- 其中 `educational institution` 没有附加“必须非营利/不得收费”限定；也不能把所有自称非营利的组织都自动列入上述类别。因此不能承诺收费学校或符合类别的机构收费项目一律被禁止，机构资格与具体活动仍需审阅。[1]
- **Distribution License**：另行授权分发软件副本，涵盖获准的修改及新作；该段本身没有“不得收费”或“仅非商业分发”表述。收费分发与其他用途限制如何共同适用应专门核清，不能把这段改述为绝对禁售。[1]
- **Notices**：向取得任意部分副本的人提供许可全文或其 URL，并提供许可方给出的所有 `Required Notice:` 纯文本行；不能只写“禁止商用”替代原条款。[1]
- **Violations / Fair Use**：首次书面告知违规后，32 天内完全合规并实际纠正既往违规，许可仍可继续；条款不限制法定合理使用权。实际执行需按原文及适用法律处理，而不是保证复制行为都会构成侵权。[1]

## Commons Clause v1.0 + 相容基础许可
- 它是附加许可条件，不是完整的独立软件许可；官方示例基础许可为 Apache 2.0。仅对有权许可的代码评估该组合，并审查依赖义务，不能擅改第三方授权。[2][3]
- **no-Sell**：从基础授权中排除 `Sell`。定义是行使授权权利，向第三方收取费用或其他对价，提供价值“全部或实质上”来自该软件功能的产品/服务；明确包括相关托管、咨询/支持费用，但仍受前述整体定义限定。[2]
- 换名、改少量函数名、把原软件托管成收费 SaaS 等例子，官方 FAQ 明确属于限制方向；“实质上”的判断仍是个案问题，不是所有衍生收费项目自动被禁。[2]
- **企业内部商业使用**：Apache 2.0 的授权不限定非商业用途；只要不触发 Commons Clause 的对第三方 `Sell` 定义，内部商业使用仍可获准，且须遵守基础条件。[2][3]
- **增值产品与收费**：官方 FAQ 允许构建应用、嵌入更大产品、销售有实质增值的衍生产品及商业 SaaS；这直接说明它不等于“禁止一切商业使用/所有收费”。[2]
- 分发时除基础许可义务外，基础许可要求的许可通知/署名也须包含 Commons Clause 条件；合并后不能仍当作纯 Apache 2.0 宣传。[2][3]

## 场景短表（条款方向，不是裁判结论）
| 场景 | 原版 PolyForm NC [1] | Apache 2.0 + Commons Clause [2][3] |
| --- | --- | --- |
| 个人免费学习、非商用试验 | 列举许可用途，须无预期商业应用 | 通常允许，遵守基础条件 |
| 个人免费求职 | 未明列；需评估，不保证自动覆盖 | 非 Sell 使用通常允许 |
| 普通商业主体换皮收费/核心功能收费托管 | 商业使用/改造不是一般许可用途；分发条款另须核清 | 核心价值全部或实质来自原软件时受禁止 |
| 企业内部服务营利业务、未对外收费 | “免费”不证明非商业；无一般企业内部商用豁免 | 不触发 Sell 时可允许 |
| 列明教育/慈善等机构使用，包括收费场景 | 有宽泛机构用途许可，不能承诺一律禁收费 | 无列明机构豁免；仍按 Sell 定义判断 |

## 此前拟定的落地清单（未采用，不是当前待办）
1. 先确认是否接受上述机构例外与分发边界；若不能接受，停止标准 NC 路径，走定制审核，不靠 README 另加一句“任何收费均禁止”掩盖冲突。[1]
2. 定制审核输入：明确允许个人求职、学习及真正非商业的改动/分发；明确禁止的企业内部商用、代码/衍生服务收费、订阅、托管；明确教育/慈善收费、广告、捐赠、成本补偿、关联方间接收费的边界。律师检查定义、授权、通知、终止/补救与当地可执行性；本笔记不提供现成法律条文。
3. 原版才标 `PolyForm-Noncommercial-1.0.0`；若增加实质限制或删除机构例外，应使用独立名称/版本并准确披露文本，不冒用原标准名称/SPDX 标识。SPDX 匹配规则明确：额外文本或条款不能视为原许可匹配。[4][5]
4. 许可选定、审核后，再由用户决定加入完整许可、版权/必要通知、README 简明说明及贡献者授权流程；检查既有发布版本和第三方依赖。官方 Commons Clause FAQ 明确：改许可只影响后续代码，不能因此撤销此前版本的开源授权。[2]
5. 网站免费访问政策与第三方使用代码的授权是不同事项；明确个人求职的实际使用方式。记录涉嫌商业套壳的代码关联、收费页面和适用版本，交专业人员判断；许可不是技术防抄锁或诉讼必胜保证。
6. 软件许可仅涉及有权许可的代码/权利；依赖、官网 JD 及其他第三方材料分别核权，不会因此取得官网 JD 的独占权。[1][3][7]
- **不选 CC BY-NC 系列做软件许可**：CC 官方建议不要把 CC 许可用于软件，软件源码分发、专利等需要软件专用条款；文档/图片是另一问题。[6]

## 官方来源
[1] PolyForm Noncommercial License 1.0.0（完整许可）：https://polyformproject.org/licenses/noncommercial/1.0.0 ；官方纯文本：https://polyformproject.org/licenses/noncommercial/1.0.0.txt
[2] Commons Clause License Condition v1.0（完整条件及 FAQ：What is Commons Clause、产品/SaaS、substantially、旧版本）：https://commonsclause.com/
[3] Apache License 2.0（完整许可，尤其第 1–4、9 条）：https://www.apache.org/licenses/LICENSE-2.0.txt
[4] SPDX 官方 PolyForm 名称、标识及文本：https://spdx.org/licenses/PolyForm-Noncommercial-1.0.0.html
[5] SPDX 许可匹配规则 B.3.2–B.3.3：https://spdx.github.io/spdx-spec/v2.3/license-matching-guidelines-and-templates/#b33-guideline-no-additional-text
[6] CC 官方软件许可 FAQ：https://creativecommons.org/faq/#can-i-apply-a-creative-commons-license-to-software
[7] CC 官方第三方材料/权利范围 FAQ（一般版权授权边界，不是建议采用 CC）：https://creativecommons.org/faq/#may-i-apply-a-cc-license-to-my-work-if-it-incorporates-material-used-under-fair-use-or-another-exception-or-limitation-to-copyright
