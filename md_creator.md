# Markdown 写作规则（Jekyll / GitHub Pages）

## 1. 适用范围
- `RULE-SCOPE-001`：本规则适用于站点内所有 Markdown 技术文档（如 `_posts/*.md`、根目录 `*.md`）。

## 2. 结构规则
- `RULE-STRUCT-001`：标题层级必须连续使用（`#` -> `##` -> `###`），禁止跳级。
- `RULE-STRUCT-002`：每个段落建议控制在 4-10 行，超长段落必须拆分。
- `RULE-STRUCT-003`：章节顺序必须遵循“概览 -> 细节 -> 参考/结论”。

## 3. 公式规则（强制）
- `RULE-MATH-001`：行内公式只能使用 `$...$`。
- `RULE-MATH-002`：块级公式只能使用 `$$...$$`，且前后必须留空行。
- `RULE-MATH-003`：行内公式禁止出现裸 `|`，必须改写为 `\mid` 或 `\lvert...\rvert`。
- `RULE-MATH-004`：条件概率统一写法为 `P(a \mid b)`，禁止写 `P(a|b)`。
- `RULE-MATH-005`：块级公式优先单行写法，减少多行拆分导致的渲染波动。
- `RULE-MATH-006`：函数名优先 `\operatorname{...}` 或 `\mathrm{...}`，不优先 `\text{...}`。
- `RULE-MATH-007`：少用 `\!`、`\left...\right` 等紧缩和自动定界符，除非确有排版必要。

## 4. 公式写法示例（必须对照）
- `RULE-MATH-EX-001`：错误 `"$P_t(c|v)$"`，正确 `"$P_t(c \mid v)$"`。
- `RULE-MATH-EX-002`：错误 `$$\mathcal{M} ... \left(...\right)$$`（复杂多行），正确：
  ```text
  $$
  \mathcal{M} = \bigcup_{k} \operatorname{Triangulate}(\mathcal{P}_k,\mathcal{N}_k)
  $$
  ```
- `RULE-MATH-EX-003`：错误（多行易抖动）：
  ```text
  $$
  E(\mathbf{L})
  =
  \sum_{v}\phi_v(L_v)
  \;+\;
  \lambda \sum_{(u,v)\in\mathcal{N}} \psi_{uv}(L_u,L_v)
  $$
  ```
  正确（单行稳定）：
  ```text
  $$
  E(\mathbf{L}) = \sum_{v}\phi_v(L_v) + \lambda \sum_{(u,v)\in\mathcal{N}} \psi_{uv}(L_u,L_v)
  $$
  ```

## 5. Mermaid 规则
- `RULE-MERMAID-001`：Mermaid 必须使用 fenced code block，语言标记必须是 `mermaid`。
- `RULE-MERMAID-002`：Mermaid 代码块前后必须留空行。
- `RULE-MERMAID-003`：节点文本应简短，复杂文本建议用引号包裹。

## 6. 表格规则
- `RULE-TABLE-001`：表格前后必须有空行。
- `RULE-TABLE-002`：表格单元格内禁止裸 `|`，必须转义或改写为公式安全写法。
- `RULE-TABLE-003`：涉及绝对值必须使用 `\lvert x \rvert`，禁止写 `|x|`。

## 7. 代码块与引用规则
- `RULE-CODE-001`：代码块必须使用三反引号并声明语言（如 `cpp`、`sh`、`text`）。
- `RULE-CODE-002`：路径、函数名、符号名必须用反引号包裹。
- `RULE-CODE-003`：代码块与列表/表格之间必须空一行，防止解析粘连。

## 8. 发布前检查规则（强制执行）
- `RULE-CHECK-001`：必须先构建，再检查产物，禁止并行“build + 读取”。
  ```sh
  bundle exec jekyll build --config _config.yml,_config.local.yml
  ```
- `RULE-CHECK-002`：必须检查是否存在行内公式裸 `|`。
  ```sh
  rg -n '\$[^$\n]*\|[^$\n]*\$' _posts -P
  ```
- `RULE-CHECK-003`：必须检查目标页面是否出现意外表格。
  ```sh
  rg -n '<table>' _site/blog/**/index.html
  ```
- `RULE-CHECK-004`：发现“源码已改但页面未变”时，先重新构建，再验证 `_site` 对应页面。

## 9. 推荐章节模板（技术文档）
- `RULE-TEMPLATE-001`：背景与目标。
- `RULE-TEMPLATE-002`：数据流或架构图。
- `RULE-TEMPLATE-003`：关键公式与参数。
- `RULE-TEMPLATE-004`：关键函数表。
- `RULE-TEMPLATE-005`：注意事项与边界条件。
- `RULE-TEMPLATE-006`：参考链接与版本信息。
