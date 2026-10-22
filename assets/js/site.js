(() => {
  const renderReveal = () => {
    document.querySelectorAll("[data-reveal]").forEach((item) => {
      item.classList.add("is-visible");
    });
  };

  const wrapTables = (root) => {
    const scope = root || document;
    scope.querySelectorAll(".zh-content table, .post-content table").forEach((table) => {
      if (table.parentElement && table.parentElement.classList.contains("table-wrap")) {
        return;
      }
      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  };

  const renderMermaid = () => {
    const mermaidBlocks = document.querySelectorAll(
      "pre > code.language-mermaid, pre > code.lang-mermaid, pre.language-mermaid"
    );
    mermaidBlocks.forEach((block) => {
      const target = block.tagName.toLowerCase() === "pre" ? block : block.parentElement;
      if (!target || target.dataset.mermaidProcessed === "true") {
        return;
      }
      const container = document.createElement("div");
      container.className = "mermaid";
      container.textContent = block.textContent;
      const wrapper =
        target.parentElement && target.parentElement.classList.contains("highlight")
          ? target.parentElement
          : target;
      wrapper.replaceWith(container);
      container.dataset.mermaidProcessed = "true";
    });
    const nodes = [...document.querySelectorAll(".mermaid")].filter(
      (node) => node.dataset.rendered !== "true"
    );
    if (!nodes.length) {
      return true;
    }
    if (!window.mermaid) {
      return false;
    }
    window.mermaid.initialize({ startOnLoad: false, theme: "default" });
    nodes.forEach((node) => {
      node.dataset.rendered = "true";
    });
    try {
      if (typeof window.mermaid.run === "function") {
        Promise.resolve(window.mermaid.run({ nodes })).catch(() => {});
      } else if (typeof window.mermaid.init === "function") {
        window.mermaid.init(undefined, nodes);
      }
    } catch (err) {
      return false;
    }
    return true;
  };

  const addCopyButtons = () => {
    document.querySelectorAll("pre > code").forEach((code) => {
      if (
        code.classList.contains("language-mermaid") ||
        code.classList.contains("lang-mermaid") ||
        code.classList.contains("no-copy")
      ) {
        return;
      }
      const pre = code.parentElement;
      if (!pre || pre.classList.contains("no-copy")) {
        return;
      }
      let wrapper = pre.closest(".highlighter-rouge") || pre.closest(".highlight") || pre;
      if (wrapper === pre) {
        const container = document.createElement("div");
        pre.parentNode.insertBefore(container, pre);
        container.appendChild(pre);
        wrapper = container;
      }
      if (wrapper.dataset.copyReady === "true") {
        return;
      }
      wrapper.dataset.copyReady = "true";
      wrapper.classList.add("code-wrap");

      const langTag = document.createElement("span");
      langTag.className = "code-lang";
      langTag.textContent = getLanguageLabel(code);

      const toast = document.createElement("span");
      toast.className = "code-toast";
      toast.textContent = "已复制";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy";
      button.textContent = "复制";
      let resetTimer;
      let toastTimer;
      button.addEventListener("click", async () => {
        const ok = await copyText(code.innerText);
        button.textContent = ok ? "已复制" : "失败";
        button.classList.toggle("copied", ok);
        toast.textContent = ok ? "已复制" : "复制失败";
        toast.classList.add("show");
        clearTimeout(resetTimer);
        clearTimeout(toastTimer);
        resetTimer = setTimeout(() => {
          button.textContent = "复制";
          button.classList.remove("copied");
        }, 1200);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
      });
      wrapper.appendChild(langTag);
      wrapper.appendChild(toast);
      wrapper.appendChild(button);
    });
  };

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        return false;
      }
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  };

  const getLanguageLabel = (code) => {
    const langClass = Array.from(code.classList).find((cls) => cls.startsWith("language-"));
    if (!langClass) {
      return "CODE";
    }
    const lang = langClass.replace("language-", "").toLowerCase();
    if (["plaintext", "text", "txt", "plain"].includes(lang)) return "TEXT";
    if (["bash", "shell", "sh", "zsh"].includes(lang)) return "SHELL";
    if (lang === "cpp") return "C++";
    if (lang === "csharp") return "C#";
    return lang.toUpperCase();
  };

  const renderMath = (root) => {
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise(root ? [root] : undefined);
      return true;
    }
    return false;
  };

  const scheduleMermaid = (retries = 8) => {
    if (retries <= 0) return;
    setTimeout(() => {
      if (!renderMermaid()) scheduleMermaid(retries - 1);
    }, 400);
  };

  const scheduleMath = (retries = 8) => {
    if (retries <= 0) return;
    setTimeout(() => {
      if (!renderMath()) scheduleMath(retries - 1);
    }, 400);
  };

  const syncAgree = (root) => {
    (root || document).querySelectorAll("[data-agree]").forEach((button) => {
      const on = localStorage.getItem(`chengzhi-agree:${button.dataset.agree}`) === "1";
      button.classList.toggle("is-on", on);
      button.textContent = on ? "已赞同" : "赞同";
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  };

  const applySearch = () => {
    const raw = new URLSearchParams(location.search).get("q");
    document.querySelectorAll(".zh-search input").forEach((input) => {
      if (raw) input.value = raw;
    });
    if (!raw) return;
    const query = raw.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll("[data-search-item]").forEach((item) => {
      const hay = `${item.dataset.title || ""} ${item.textContent || ""}`.toLowerCase();
      const match = hay.includes(query);
      item.hidden = !match;
      if (match) shown += 1;
    });
    const label = document.querySelector("[data-search-label]");
    if (label) {
      label.hidden = false;
      label.textContent = shown ? `包含「${raw.trim()}」的笔记` : `没有找到「${raw.trim()}」`;
    }
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-agree]");
    if (!button) return;
    const key = `chengzhi-agree:${button.dataset.agree}`;
    const on = localStorage.getItem(key) === "1";
    localStorage.setItem(key, on ? "0" : "1");
    syncAgree(button.parentElement || document);
  });

  const refresh = (root) => {
    renderReveal();
    wrapTables(root || document);
    const rendered = renderMermaid();
    addCopyButtons();
    const mathReady = renderMath(root);
    syncAgree(root || document);
    if (!rendered) scheduleMermaid();
    if (!mathReady) scheduleMath();
  };

  window.SiteRender = { refresh, syncAgree, applySearch };

  const run = () => {
    refresh();
    applySearch();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
