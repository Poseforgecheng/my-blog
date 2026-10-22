# AI Personal Website Report Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate a leadership-facing DOCX report named `AI 开发一个人网站.docx` that explains how AI is used to develop and extend this personal website.

**Architecture:** Use a small Python generator based on `python-docx` to build a structured report from code so the artifact can be regenerated and revised. Verify with a smoke test, generate the DOCX, convert it to PDF, and confirm the rendered document reaches at least 10 pages.

**Tech Stack:** Python 3, `python-docx`, LibreOffice headless conversion, Poppler tools

---

### Task 1: Add generator smoke test

**Files:**
- Create: `tests/test_ai_personal_website_report.py`
- Create: `tests/__init__.py`

**Step 1: Write the failing test**

Write a test that imports the report generator module, builds the report into a temporary directory, and asserts:

- the output file exists
- the report title exists in the document
- required chapter headings exist
- the document contains multiple tables used for executive presentation

**Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests.test_ai_personal_website_report -v`
Expected: FAIL because the generator module does not exist yet

**Step 3: Write minimal implementation**

Create a generator script with a callable function that writes the DOCX to a target path and returns basic metadata.

**Step 4: Run test to verify it passes**

Run: `python3 -m unittest tests.test_ai_personal_website_report -v`
Expected: PASS

### Task 2: Implement report generator

**Files:**
- Create: `tools/generate_ai_personal_website_report.py`

**Step 1: Extend implementation to match the approved design**

Implement:

- cover page
- abstract and keywords
- formal chapter hierarchy
- tables for workflow and future architecture
- appendix content so the report is sufficiently detailed
- header/footer formatting

**Step 2: Run smoke test again**

Run: `python3 -m unittest tests.test_ai_personal_website_report -v`
Expected: PASS

### Task 3: Generate and render-check the final artifact

**Files:**
- Output: `output/doc/AI 开发一个人网站.docx`
- Output: `tmp/docs/AI 开发一个人网站.pdf`

**Step 1: Generate the DOCX**

Run: `python3 tools/generate_ai_personal_website_report.py`
Expected: DOCX created under `output/doc/`

**Step 2: Convert to PDF**

Run: `soffice -env:UserInstallation=file:///tmp/lo_profile_ai_report --headless --convert-to pdf --outdir tmp/docs output/doc/AI\\ 开发一个人网站.docx`
Expected: PDF created under `tmp/docs/`

**Step 3: Verify page count**

Run: `pdfinfo tmp/docs/AI\\ 开发一个人网站.pdf`
Expected: page count is 10 or higher

**Step 4: Optional render export**

Run: `pdftoppm -png tmp/docs/AI\\ 开发一个人网站.pdf tmp/docs/ai_report_page`
Expected: page images created for manual review if needed

Plan complete and saved to `docs/plans/2026-03-17-ai-personal-website-report.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Default for this request: continue in this session.

