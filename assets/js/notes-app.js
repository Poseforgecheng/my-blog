(() => {
  const SITE = window.SITE || {
    baseurl: "",
    repo: "ChengzhuoSir/my-blog",
    branch: "main",
    title: "科技笔记",
    author: "ChengzhuoSir",
  };
  const TOKEN_KEY = "chengzhi-github-token";
  const DB_NAME = "chengzhi-notes";
  const STORE = "notes";

  let current = null;
  let mode = "edit";
  let saveTimer = 0;
  let publishing = false;
  let publishAfterToken = false;
  let statusStamp = 0;
  const scriptLoads = new Map();

  const url = (path) => `${SITE.baseurl || ""}${path}`;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const stripHtml = (value) =>
    String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const plainExcerpt = (value) =>
    stripHtml(String(value || "").replace(/[#>*_`[\]]/g, " ")).slice(0, 80);

  const sourceLabel = (note) => {
    if (note.source === "docx") return note.originName ? `Word · ${note.originName}` : "Word";
    if (note.source === "repo") return "站内 Markdown";
    if (note.source === "md") return note.originName ? `Markdown · ${note.originName}` : "Markdown";
    return "笔记";
  };

  const formatDisplayDate = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const formatJekyllDate = (iso) => {
    const date = new Date(iso || Date.now());
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type).value;
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} +0800`;
  };

  const yamlQuote = (value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

  const setStatus = (text, isError) => {
    statusStamp += 1;
    ["writer-status", "notes-status"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      el.classList.toggle("is-error", Boolean(isError));
    });
    return statusStamp;
  };

  const wrapRaw = (body) => {
    const text = String(body || "");
    if (!text.includes("{{") && !text.includes("{%")) return text;
    return `{% raw %}\n${text}\n{% endraw %}`;
  };

  const unwrapRaw = (body) => {
    const match = String(body || "").match(/^\s*\{%\s*raw\s*%\}\s*([\s\S]*?)\s*\{%\s*endraw\s*%\}\s*$/);
    return match ? match[1] : String(body || "");
  };

  const loadScript = (src) => {
    if (scriptLoads.has(src)) return scriptLoads.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("组件加载失败"));
      document.head.appendChild(script);
    });
    scriptLoads.set(src, promise);
    return promise;
  };

  const ensureMarked = async () => {
    if (window.marked && typeof window.marked.parse === "function") return;
    await loadScript(url("/assets/vendor/marked/marked.min.js"));
  };

  const ensureMammoth = async () => {
    if (window.mammoth && typeof window.mammoth.convertToHtml === "function") return;
    await loadScript(url("/assets/vendor/mammoth/mammoth.browser.min.js"));
  };

  const openDb = () =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const withStore = (storeMode, runner) =>
    openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, storeMode);
          const request = runner(tx.objectStore(STORE));
          tx.oncomplete = () => {
            db.close();
            resolve(request.result);
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error || request.error);
          };
        })
    );

  const getAllNotes = () => withStore("readonly", (store) => store.getAll());
  const getNote = (id) => withStore("readonly", (store) => store.get(id));
  const saveNote = (note) => withStore("readwrite", (store) => store.put(note));

  const upsertImported = async (note) => {
    const existing = await getAllNotes();
    const match = existing.find(
      (item) => item.originName && item.originName === note.originName && item.source === note.source
    );
    if (match) {
      note.id = match.id;
      note.createdAt = match.createdAt || note.createdAt;
      note.filename = match.filename || note.filename;
      note.originPath = match.originPath || note.originPath;
      note.publishedAt = match.publishedAt || note.publishedAt;
    }
    await saveNote(note);
    return note;
  };
  const deleteStoredNote = (id) => withStore("readwrite", (store) => store.delete(id));

  const sortNotes = (notes) =>
    notes.slice().sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  const blankNote = () => ({
    id: crypto.randomUUID(),
    title: "",
    tags: [],
    format: "markdown",
    body: "",
    description: "",
    source: "editor",
    originName: "",
    originPath: "",
    filename: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: "",
  });

  const isEmpty = (note) => !note.title && !stripHtml(note.body);

  const asTags = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
  };

  const parseFrontMatter = (text) => {
    const match = String(text || "").match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
    if (!match) return { data: {}, body: String(text || "") };
    const data = {};
    let currentKey = "";
    match[1].split(/\r?\n/).forEach((line) => {
      const item = line.match(/^\s+-\s+(.*)$/);
      if (item && currentKey) {
        if (!Array.isArray(data[currentKey])) data[currentKey] = [];
        data[currentKey].push(item[1].trim().replace(/^["']|["']$/g, ""));
        return;
      }
      const pair = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (!pair) return;
      currentKey = pair[1];
      const raw = pair[2].trim();
      data[currentKey] = raw.replace(/^["']|["']$/g, "");
    });
    return { data, body: text.slice(match[0].length) };
  };

  const safeDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  };

  const noteFromMarkdown = (text, filename, extra = {}) => {
    const parsed = parseFrontMatter(text.replace(/^\uFEFF/, ""));
    let body = unwrapRaw(parsed.body);
    let title = parsed.data.title || "";
    if (!title) {
      const heading = body.match(/^\s*#\s+(.+)\s*$/m);
      if (heading) {
        title = heading[1].trim();
        body = body.replace(heading[0], "").replace(/^\s+/, "");
      }
    }
    if (!title) title = String(filename || "未命名笔记").replace(/\.(md|markdown)$/i, "");
    return {
      id: crypto.randomUUID(),
      title: title.slice(0, 100),
      tags: asTags(parsed.data.tags),
      format: "markdown",
      body,
      description: parsed.data.description || plainExcerpt(body),
      source: extra.source || "md",
      originName: filename || "",
      originPath: extra.originPath || "",
      filename: extra.originPath ? extra.originPath.split("/").pop() : "",
      createdAt: parsed.data.date ? safeDate(parsed.data.date) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: extra.originPath ? new Date().toISOString() : "",
    };
  };

  const titleFromHtml = (html, fallback) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const heading = doc.querySelector("h1");
    let title = fallback || "未命名笔记";
    if (heading && heading.textContent.trim()) {
      title = heading.textContent.trim();
      heading.remove();
    }
    return { title, html: doc.body.innerHTML };
  };

  const noteFromDocx = async (buffer, filename) => {
    await ensureMammoth();
    const result = await window.mammoth.convertToHtml(
      { arrayBuffer: buffer },
      {
        includeDefaultStyleMap: true,
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='标题'] => h1:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='标题 1'] => h1:fresh",
          "p[style-name='标题 2'] => h2:fresh",
          "p[style-name='标题 3'] => h3:fresh",
        ],
        convertImage: window.mammoth.images.imgElement((image) =>
          image.read("base64").then((data) => ({
            src: `data:${image.contentType};base64,${data}`,
          }))
        ),
      }
    );
    const extracted = titleFromHtml(result.value, String(filename).replace(/\.docx$/i, ""));
    return {
      id: crypto.randomUUID(),
      title: extracted.title.slice(0, 100),
      tags: ["笔记"],
      format: "html",
      body: extracted.html,
      description: plainExcerpt(extracted.html),
      source: "docx",
      originName: filename,
      originPath: "",
      filename: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: "",
    };
  };

  const sanitizeHtml = (html) => {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    doc.querySelectorAll("script, iframe, object, embed, link, meta, style").forEach((node) => node.remove());
    doc.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value || "";
        if (name.startsWith("on") || ["style", "class", "id"].includes(name)) {
          el.removeAttribute(attr.name);
          return;
        }
        if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
          el.removeAttribute(attr.name);
        }
        if (name === "src" && /^\s*data:(?!image\/)/i.test(value)) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return doc.body.innerHTML;
  };

  const protectMath = (source) => {
    const blocks = [];
    let text = source;
    [/\$\$[\s\S]+?\$\$/g, /\\\[[\s\S]+?\\\]/g, /\\\([\s\S]+?\\\)/g, /\$[^$\n]+?\$/g].forEach((pattern) => {
      text = text.replace(pattern, (match) => {
        const token = `@@MATH${blocks.length}@@`;
        blocks.push(match);
        return token;
      });
    });
    return { text, blocks };
  };

  const restoreMath = (html, blocks) =>
    blocks.reduce(
      (result, block, index) => result.replaceAll(`@@MATH${index}@@`, escapeHtml(block)),
      html
    );

  const renderMarkdown = async (source) => {
    await ensureMarked();
    const protectedMath = protectMath(source || "");
    let html = window.marked.parse(protectedMath.text, { gfm: true, breaks: false });
    if (html && typeof html.then === "function") html = await html;
    return sanitizeHtml(restoreMath(html, protectedMath.blocks));
  };

  const renderArticleInto = async (container, note) => {
    const body = note.format === "html" ? sanitizeHtml(note.body) : await renderMarkdown(note.body);
    const author = SITE.author || "ChengzhuoSir";
    const tags = (note.tags || [])
      .map(
        (tag) =>
          `<a href="${url("/blog/")}?q=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`
      )
      .join("");
    container.innerHTML = `
      <article class="zh-article">
        <h1 class="zh-article-title">${escapeHtml(note.title || "未命名笔记")}</h1>
        <div class="zh-byline zh-byline-lg">
          <span class="zh-avatar zh-avatar-lg">${escapeHtml(author.slice(0, 1) || "笔")}</span>
          <div>
            <div class="zh-name">${escapeHtml(author)}</div>
            <div class="zh-meta">${escapeHtml(formatDisplayDate(note.updatedAt || note.createdAt))} · ${escapeHtml(sourceLabel(note))}</div>
          </div>
        </div>
        ${tags ? `<div class="zh-topics">${tags}</div>` : ""}
        <div class="zh-content post-content">${body}</div>
      </article>
    `;
  };

  const feedCard = (note) => `
    <article class="zh-feed-card" data-search-item data-title="${escapeHtml(note.title || "")}">
      <div class="zh-byline">
        <span class="zh-avatar">${escapeHtml((SITE.author || "笔").slice(0, 1))}</span>
        <span class="zh-name">${escapeHtml(SITE.author || "ChengzhuoSir")}</span>
        <span class="zh-meta">· ${escapeHtml(formatDisplayDate(note.updatedAt))}</span>
        <span class="zh-badge">本机</span>
      </div>
      <h2 class="zh-feed-title"><a href="${url("/notes/")}?id=${encodeURIComponent(note.id)}">${escapeHtml(note.title || "未命名笔记")}</a></h2>
      <p class="zh-excerpt">${escapeHtml(note.description || plainExcerpt(note.body) || "笔记")}</p>
      <div class="zh-feed-actions">
        <button type="button" class="zh-agree zh-agree-sm" data-agree="local:${escapeHtml(note.id)}">赞同</button>
        <a href="${url("/notes/")}?id=${encodeURIComponent(note.id)}">阅读全文</a>
        <a href="${url("/write/")}?id=${encodeURIComponent(note.id)}">编辑</a>
      </div>
    </article>
  `;

  const fillLocalFeed = async () => {
    const mount = document.querySelector("[data-local-feed]");
    if (!mount) return;
    const notes = sortNotes(await getAllNotes());
    const existing = new Set(
      [...document.querySelectorAll(".zh-feed-card[data-title]")]
        .filter((item) => !item.querySelector(".zh-badge"))
        .map((item) => (item.dataset.title || "").trim())
    );
    const query = (new URLSearchParams(location.search).get("q") || "").trim().toLowerCase();
    mount.innerHTML = notes
      .filter((note) => note.title && !existing.has(note.title.trim()))
      .filter((note) => !query || `${note.title} ${note.body}`.toLowerCase().includes(query))
      .filter((note) => !isEmpty(note))
      .map(feedCard)
      .join("");
    if (window.SiteRender) {
      window.SiteRender.syncAgree(mount);
      window.SiteRender.applySearch();
    }
  };

  const postFilename = (note) => {
    if (note.originPath && note.originPath.startsWith("_posts/")) {
      return note.originPath.slice("_posts/".length);
    }
    if (note.filename) return note.filename;
    const day = formatJekyllDate(note.createdAt).slice(0, 10);
    const slug = `note-${note.id.replace(/-/g, "").slice(0, 8).toLowerCase()}`;
    return `${day}-${slug}.md`;
  };

  const buildPostFile = (note) => {
    const tags = note.tags && note.tags.length ? note.tags : ["笔记"];
    const description = note.description || plainExcerpt(note.body) || "笔记";
    const body = wrapRaw(
      note.format === "html" ? String(note.body || "").trim() : String(note.body || "").replace(/^\s+/, "")
    );
    return [
      "---",
      "layout: post",
      `title: ${yamlQuote(note.title || "未命名笔记")}`,
      `description: ${yamlQuote(description)}`,
      `date: ${formatJekyllDate(note.createdAt)}`,
      "tags:",
      ...tags.map((tag) => `  - ${yamlQuote(tag)}`),
      "---",
      "",
      body,
      "",
    ].join("\n");
  };

  const utf8ToBase64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    const size = 0x8000;
    for (let index = 0; index < bytes.length; index += size) {
      binary += String.fromCharCode(...bytes.subarray(index, index + size));
    }
    return btoa(binary);
  };

  const rawUrl = (path) =>
    `https://raw.githubusercontent.com/${SITE.repo}/${SITE.branch}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

  const githubHeaders = (token) => ({
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  });

  const githubError = async (response) => {
    let message = `GitHub 返回 ${response.status}`;
    try {
      const data = await response.json();
      if (data && data.message) message = data.message;
    } catch (err) {
      message = `GitHub 返回 ${response.status}`;
    }
    if (response.status === 401) message = "令牌无效，请重新填写。";
    if (response.status === 403) message = "令牌没有这个仓库的写权限。";
    if (response.status === 404) message = "找不到仓库或文件。确认令牌可以访问 ChengzhuoSir/my-blog。";
    return new Error(message);
  };

  const putContent = async (path, content, token, message) => {
    const api = `https://api.github.com/repos/${SITE.repo}/contents/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const headers = githubHeaders(token);
    let sha = "";
    const currentFile = await fetch(`${api}?ref=${encodeURIComponent(SITE.branch)}`, { headers });
    if (currentFile.ok) sha = (await currentFile.json()).sha;
    else if (currentFile.status !== 404) throw await githubError(currentFile);
    const response = await fetch(api, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message,
        content: utf8ToBase64(content),
        branch: SITE.branch,
        sha: sha || undefined,
      }),
    });
    if (!response.ok) throw await githubError(response);
    return response.json();
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY) || "";

  const captureForm = () => {
    if (!current || !document.getElementById("note-title")) return;
    current.title = document.getElementById("note-title").value.trim().slice(0, 100);
    current.tags = document
      .getElementById("note-tags")
      .value.split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (current.format === "html" && mode === "edit") {
      current.body = document.getElementById("note-visual").innerHTML;
    } else if (current.format !== "html" && mode === "edit") {
      current.body = document.getElementById("note-body").value;
    }
    current.description = plainExcerpt(current.body);
    current.updatedAt = new Date().toISOString();
  };

  const fillForm = (note) => {
    const title = document.getElementById("note-title");
    if (!title) return;
    title.value = note.title || "";
    document.getElementById("note-tags").value = (note.tags || []).join(", ");
    document.getElementById("note-body").value = note.format === "html" ? "" : note.body || "";
    document.getElementById("note-visual").innerHTML = note.format === "html" ? note.body || "" : "";
  };

  const paint = async () => {
    const title = document.getElementById("note-title");
    if (!title || !current) return;
    const editingHtml = current.format === "html" && mode === "edit";
    const editingMd = current.format !== "html" && mode === "edit";
    title.hidden = mode === "preview";
    document.getElementById("note-tags").hidden = mode === "preview";
    document.getElementById("note-body").hidden = !editingMd;
    document.getElementById("note-visual").hidden = !editingHtml;
    const preview = document.getElementById("note-preview");
    preview.hidden = mode !== "preview";
    const toggle = document.getElementById("toggle-mode");
    if (toggle) toggle.textContent = mode === "preview" ? "编辑" : "预览";
    if (mode === "preview") {
      await renderArticleInto(preview, current);
      if (window.SiteRender) window.SiteRender.refresh(preview);
    }
  };

  const libraryHtml = (notes) => {
    const items = notes
      .map(
        (note) => `
        <div class="lib-item ${current && note.id === current.id ? "is-active" : ""}">
          <button type="button" class="lib-open" data-open="${escapeHtml(note.id)}">
            <span class="lib-title">${escapeHtml(note.title || "未命名笔记")}</span>
            <span class="lib-meta">${escapeHtml(sourceLabel(note))}${note.publishedAt ? " · 已发布" : ""}</span>
          </button>
          <button type="button" class="lib-delete" data-delete="${escapeHtml(note.id)}" aria-label="删除">×</button>
        </div>`
      )
      .join("");
    return `
      <div class="lib-head">
        <strong>笔记</strong>
        <button type="button" class="zh-btn-text" id="new-note">新建</button>
      </div>
      <div class="lib-list">${items || '<p class="lib-empty">导入 Markdown 或 Word 后，会出现在这里。</p>'}</div>
    `;
  };

  const renderLibrary = async () => {
    const library = document.getElementById("writer-library");
    if (!library) return;
    const scroll = library.scrollTop;
    library.innerHTML = libraryHtml(sortNotes(await getAllNotes()).filter((note) => !isEmpty(note)));
    library.scrollTop = scroll;
  };

  const persistCurrent = async () => {
    if (!current || !document.getElementById("writer")) return;
    captureForm();
    if (isEmpty(current) && !current.publishedAt) return;
    current.filename = postFilename(current);
    await saveNote(current);
  };

  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await persistCurrent();
        setStatus("已自动保存到本机");
        await renderLibrary();
        await fillLocalFeed();
      } catch (error) {
        setStatus(error && error.name === "QuotaExceededError" ? "笔记太大，浏览器存不下。" : "保存失败", true);
      }
    }, 500);
  };

  const openNote = async (id, options = {}) => {
    if (current && current.id !== id) await persistCurrent();
    const note = await getNote(id);
    if (!note) {
      setStatus("没有找到这篇笔记", true);
      return;
    }
    current = note;
    mode = options.preview ? "preview" : "edit";
    fillForm(current);
    await paint();
    await renderLibrary();
    if (document.getElementById("writer")) {
      history.replaceState(null, "", `${url("/write/")}?id=${encodeURIComponent(id)}`);
    }
  };

  const createBlank = async () => {
    await persistCurrent();
    current = blankNote();
    mode = "edit";
    fillForm(current);
    await paint();
    history.replaceState(null, "", url("/write/"));
    document.getElementById("note-title").focus();
    await renderLibrary();
  };

  const removeNote = async (id) => {
    const note = await getNote(id);
    if (!note) return;
    const ok = confirm(`从本机删除「${note.title || "未命名笔记"}」？已发布到网站的版本不会删除。`);
    if (!ok) return;
    await deleteStoredNote(id);
    if (current && current.id === id) {
      current = blankNote();
      mode = "edit";
      fillForm(current);
      await paint();
      history.replaceState(null, "", url("/write/"));
    }
    await renderLibrary();
    await fillLocalFeed();
    setStatus("已从本机删除");
  };

  const downloadNote = async () => {
    await persistCurrent();
    if (!current || isEmpty(current)) {
      setStatus("还没有可以下载的内容", true);
      return;
    }
    current.filename = postFilename(current);
    const blob = new Blob([buildPostFile(current)], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = current.filename;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("已下载 Markdown 文件");
  };

  const openTokenDialog = (publishAfter) => {
    publishAfterToken = Boolean(publishAfter);
    const dialog = document.getElementById("publish-dialog");
    const input = document.getElementById("github-token");
    const save = document.getElementById("token-save");
    if (!dialog || !input || !save) return;
    input.value = getToken();
    save.textContent = publishAfterToken ? "保存并发布" : "保存";
    dialog.hidden = false;
    input.focus();
  };

  const publishCurrent = async () => {
    if (publishing) return;
    await persistCurrent();
    if (!current || isEmpty(current)) {
      setStatus("先写标题或正文，再发布", true);
      return;
    }
    const token = getToken();
    if (!token) {
      openTokenDialog(true);
      return;
    }
    publishing = true;
    setStatus("正在发布…");
    try {
      current.filename = postFilename(current);
      const path = current.originPath && current.originPath.startsWith("_posts/")
        ? current.originPath
        : `_posts/${current.filename}`;
      await putContent(path, buildPostFile(current), token, `发布笔记：${current.title || "未命名笔记"}`);
      current.originPath = path;
      current.filename = path.split("/").pop();
      current.publishedAt = new Date().toISOString();
      await saveNote(current);
      setStatus("已发布。Pages 构建完成后会出现在公开笔记里。");
      await renderLibrary();
    } catch (error) {
      setStatus(error.message || "发布失败", true);
      if (/令牌|401|403|Bad credentials|permission/i.test(error.message || "")) openTokenDialog(true);
    } finally {
      publishing = false;
    }
  };

  const syncPublished = async () => {
    const stamp = setStatus("正在载入站内 Markdown…");
    const indexResponse = await fetch(url("/notes.json"), { cache: "no-cache" });
    if (!indexResponse.ok) throw new Error("笔记索引加载失败");
    const index = await indexResponse.json();
    const existing = await getAllNotes();
    const byPath = new Map(existing.filter((note) => note.originPath).map((note) => [note.originPath, note]));
    let added = 0;
    let missing = 0;
    for (const item of index) {
      if (!item.path || byPath.has(item.path)) continue;
      const titleMatch = existing.find((note) => item.title && note.title.trim() === item.title.trim());
      if (titleMatch) {
        if (!titleMatch.originPath) {
          titleMatch.originPath = item.path;
          titleMatch.filename = item.path.split("/").pop();
          titleMatch.publishedAt = titleMatch.publishedAt || new Date().toISOString();
          await saveNote(titleMatch);
        }
        continue;
      }
      const response = await fetch(rawUrl(item.path));
      if (!response.ok) {
        missing += 1;
        continue;
      }
      const note = noteFromMarkdown(await response.text(), item.path.split("/").pop(), {
        originPath: item.path,
        source: "repo",
      });
      if (item.title) note.title = item.title;
      await saveNote(note);
      existing.push(note);
      byPath.set(item.path, note);
      added += 1;
    }
    await renderLibrary();
    await fillLocalFeed();
    if (stamp !== statusStamp) return;
    if (added) setStatus(`已载入 ${added} 篇站内 Markdown 笔记`);
    else if (missing) setStatus("有笔记还没推到 GitHub，可以把 .md 文件拖进来");
    else setStatus("站内笔记已在左侧列表里");
  };

  const readEntry = (entry, files) =>
    new Promise((resolve) => {
      if (!entry) {
        resolve();
        return;
      }
      if (entry.isFile) {
        entry.file(
          (file) => {
            if (/\.(md|markdown|docx)$/i.test(file.name)) files.push(file);
            resolve();
          },
          () => resolve()
        );
        return;
      }
      if (!entry.isDirectory || entry.name.startsWith(".") || ["node_modules", "_site", "assets", "games", "vendor", "artifacts"].includes(entry.name)) {
        resolve();
        return;
      }
      const reader = entry.createReader();
      const children = [];
      const readBatch = () => {
        reader.readEntries(async (batch) => {
          if (!batch.length) {
            for (const child of children) await readEntry(child, files);
            resolve();
            return;
          }
          children.push(...batch);
          readBatch();
        }, () => resolve());
      };
      readBatch();
    });

  const filesFromTransfer = async (dataTransfer) => {
    const items = [...(dataTransfer.items || [])];
    const entries = items.map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null)).filter(Boolean);
    if (entries.some((entry) => entry.isDirectory)) {
      const files = [];
      for (const entry of entries) await readEntry(entry, files);
      return files;
    }
    return [...dataTransfer.files];
  };

  const importFiles = async (fileList) => {
    const files = [...fileList];
    const accepted = files.filter((file) => /\.(md|markdown|docx)$/i.test(file.name));
    const skipped = files.length - accepted.length;
    if (!accepted.length) {
      setStatus(files.length ? "只支持 .md 和 .docx" : "没有读到文件", true);
      return [];
    }
    const notes = [];
    try {
      for (let index = 0; index < accepted.length; index += 1) {
        const file = accepted[index];
        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`${file.name} 超过 20MB，请拆分后再导入`);
        }
        setStatus(`正在导入 ${index + 1}/${accepted.length}：${file.name}`);
        if (/\.docx$/i.test(file.name)) notes.push(await noteFromDocx(await file.arrayBuffer(), file.name));
        else notes.push(noteFromMarkdown(await file.text(), file.name));
      }
      for (const note of notes) await upsertImported(note);
      await fillLocalFeed();
      const extra = skipped ? `，已跳过 ${skipped} 个文件` : "";
      setStatus(`已导入 ${notes.length} 篇笔记${extra}`);
      if (document.getElementById("writer")) {
        await openNote(notes[0].id, { preview: true });
      } else {
        location.href = `${url("/notes/")}?id=${encodeURIComponent(notes[0].id)}`;
      }
      return notes;
    } catch (error) {
      setStatus(error.message || "导入失败", true);
      return notes;
    }
  };

  const walkDir = async (dir, files, depth, prefix) => {
    if (depth > 4) return;
    for await (const entry of dir.values()) {
      if (entry.name.startsWith(".")) continue;
      const next = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (["node_modules", "_site", "assets", "games", "vendor", "artifacts", "tmp", "output", "docs"].includes(entry.name)) {
        continue;
      }
      if (next.startsWith("docs/")) continue;
      if (entry.kind === "file" && /\.(md|markdown|docx)$/i.test(entry.name)) {
        if (/^(readme|license|md_creator|web_creator)\.md$/i.test(entry.name)) continue;
        files.push(await entry.getFile());
      } else if (entry.kind === "directory") {
        await walkDir(entry, files, depth + 1, next);
      }
    }
  };

  const importDirectory = async () => {
    if (!window.showDirectoryPicker) {
      setStatus("当前浏览器不能选择文件夹，请直接拖入文件。", true);
      return;
    }
    try {
      const dir = await window.showDirectoryPicker({ mode: "read" });
      const files = [];
      await walkDir(dir, files, 0, "");
      if (!files.length) {
        setStatus("这个文件夹里没有 .md 或 .docx", true);
        return;
      }
      await importFiles(files);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      setStatus(error.message || "无法读取文件夹", true);
    }
  };

  const isFileDrag = (event) =>
    Boolean(event.dataTransfer && [...event.dataTransfer.types].includes("Files"));

  const bindDrop = () => {
    const mask = document.getElementById("drop-mask");
    if (!mask || mask.dataset.bound === "true") return;
    mask.dataset.bound = "true";
    let depth = 0;
    window.addEventListener("dragover", (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
    });
    window.addEventListener("dragenter", (event) => {
      if (!isFileDrag(event)) return;
      depth += 1;
      mask.hidden = false;
    });
    window.addEventListener("dragleave", () => {
      depth = Math.max(0, depth - 1);
      if (!depth) mask.hidden = true;
    });
    window.addEventListener("drop", async (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      depth = 0;
      mask.hidden = true;
      await importFiles(await filesFromTransfer(event.dataTransfer));
    });
  };

  const bindFileInputs = () => {
    const input = document.getElementById("file-input");
    if (!input || input.dataset.bound === "true") return;
    input.dataset.bound = "true";
    input.addEventListener("change", () => {
      const files = [...input.files];
      input.value = "";
      importFiles(files);
    });
    document.querySelectorAll("[data-import]").forEach((button) => {
      button.addEventListener("click", () => input.click());
    });
  };

  const showReader = async (id) => {
    const note = await getNote(id);
    const root = document.getElementById("notes-root");
    if (!note) {
      root.innerHTML = `<section class="zh-feed"><p class="zh-empty">没有找到这篇笔记。 <a href="${url("/notes/")}">返回列表</a></p></section>`;
      return;
    }
    document.title = `${note.title || "笔记"} | ${SITE.title}`;
    root.innerHTML = `
      <div class="reader-tools">
        <a href="${url("/notes/")}">返回列表</a>
        <a href="${url("/write/")}?id=${encodeURIComponent(note.id)}">编辑</a>
      </div>
      <div id="reader-article"></div>
    `;
    const article = document.getElementById("reader-article");
    await renderArticleInto(article, note);
    if (window.SiteRender) window.SiteRender.refresh(article);
  };

  const showLibrary = async () => {
    const list = document.getElementById("notes-list");
    if (!list) return;
    const notes = sortNotes(await getAllNotes()).filter((note) => !isEmpty(note));
    list.innerHTML = notes.length
      ? notes.map(feedCard).join("")
      : '<p class="zh-empty">还没有本机笔记。把 Markdown 或 Word 拖到上方，会自动生成。</p>';
    if (window.SiteRender) window.SiteRender.syncAgree(list);
  };

  const attachEditLink = async () => {
    const host = document.querySelector("[data-source-path]");
    const slot = document.querySelector("[data-edit-slot]");
    if (!host || !slot) return;
    const path = host.dataset.sourcePath;
    const found = (await getAllNotes()).find((note) => note.originPath === path);
    if (found) {
      slot.innerHTML = `<a class="zh-text-link" href="${url("/write/")}?id=${encodeURIComponent(found.id)}">编辑</a>`;
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zh-text-link";
    button.textContent = "编辑";
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "正在载入…";
      try {
        const response = await fetch(rawUrl(path));
        if (!response.ok) throw new Error("这篇笔记还不能从网站载入，请把 Markdown 拖到写笔记页。");
        const note = noteFromMarkdown(await response.text(), path.split("/").pop(), {
          originPath: path,
          source: "repo",
        });
        if (host.dataset.title) note.title = host.dataset.title;
        await saveNote(note);
        location.href = `${url("/write/")}?id=${encodeURIComponent(note.id)}`;
      } catch (error) {
        button.disabled = false;
        button.textContent = error.message || "载入失败";
      }
    });
    slot.appendChild(button);
  };

  const bindWriterEvents = () => {
    bindFileInputs();
    bindDrop();
    const library = document.getElementById("writer-library");
    library.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-delete]");
      if (remove) {
        removeNote(remove.dataset.delete);
        return;
      }
      const open = event.target.closest("[data-open]");
      if (open) openNote(open.dataset.open);
      if (event.target.closest("#new-note")) createBlank();
    });
    ["note-title", "note-tags", "note-body"].forEach((id) => {
      document.getElementById(id).addEventListener("input", scheduleSave);
    });
    document.getElementById("note-visual").addEventListener("input", scheduleSave);
    document.getElementById("toggle-mode").addEventListener("click", async () => {
      captureForm();
      mode = mode === "preview" ? "edit" : "preview";
      await paint();
    });
    document.getElementById("download-note").addEventListener("click", downloadNote);
    document.getElementById("publish-note").addEventListener("click", publishCurrent);
    document.getElementById("token-settings").addEventListener("click", () => openTokenDialog(false));
    document.getElementById("sync-repo").addEventListener("click", () => {
      syncPublished().catch((error) => setStatus(error.message || "同步失败", true));
    });
    const dirButton = document.getElementById("import-dir");
    if (!window.showDirectoryPicker) dirButton.hidden = true;
    else dirButton.addEventListener("click", importDirectory);
    document.getElementById("token-cancel").addEventListener("click", () => {
      document.getElementById("publish-dialog").hidden = true;
    });
    document.getElementById("token-clear").addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      document.getElementById("github-token").value = "";
      setStatus("已清除本机令牌");
    });
    document.getElementById("token-save").addEventListener("click", () => {
      const token = document.getElementById("github-token").value.trim();
      if (!token) {
        setStatus("先填写 GitHub 令牌", true);
        return;
      }
      localStorage.setItem(TOKEN_KEY, token);
      document.getElementById("publish-dialog").hidden = true;
      if (publishAfterToken) publishCurrent();
      else setStatus("令牌已保存在这台浏览器");
    });
    document.getElementById("github-token").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("token-save").click();
      }
    });
    document.getElementById("publish-dialog").addEventListener("click", (event) => {
      if (event.target.id === "publish-dialog") event.currentTarget.hidden = true;
    });
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        persistCurrent()
          .then(() => setStatus("已保存到本机"))
          .catch(() => setStatus("保存失败", true));
      }
    });
  };

  const bootWriter = async () => {
    bindWriterEvents();
    await renderLibrary();
    const id = new URLSearchParams(location.search).get("id");
    if (id) await openNote(id);
    else {
      current = blankNote();
      mode = "edit";
      fillForm(current);
      await paint();
    }
    syncPublished().catch((error) => setStatus(error.message || "同步失败", true));
  };

  const bootNotesPage = async () => {
    bindFileInputs();
    bindDrop();
    const id = new URLSearchParams(location.search).get("id");
    if (id) await showReader(id);
    else await showLibrary();
  };

  const boot = () => {
    fillLocalFeed().catch(() => {});
    attachEditLink().catch(() => {});
    if (document.getElementById("writer")) {
      bootWriter().catch((error) => setStatus(error.message || "编辑器启动失败", true));
    }
    if (document.getElementById("notes-root")) {
      bootNotesPage().catch((error) => setStatus(error.message || "笔记页启动失败", true));
    }
  };

  window.NotesApp = {
    importFiles,
    importText: async (name, text) => {
      const note = noteFromMarkdown(text, name);
      await saveNote(note);
      await fillLocalFeed();
      return note;
    },
    getAllNotes,
    parseFrontMatter,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
