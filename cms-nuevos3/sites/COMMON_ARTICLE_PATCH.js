(function () {
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const defaultImg = "../logo-header.png";

  const loadingEl = document.getElementById("article-loading");
  const errorEl = document.getElementById("article-error");
  const contentEl = document.getElementById("article-content");
  const preloaderEl = document.getElementById("site-preloader");

  function esc(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "<")
      .replaceAll(">", ">")
      .replaceAll('"', """)
      .replaceAll("'", "&#39;");
  }

  function safeUrl(url) {
    try {
      return new URL(url || defaultImg, location.origin).href;
    } catch {
      return defaultImg;
    }
  }

  function hidePreloader() {
    if (preloaderEl) preloaderEl.classList.add("hidden");
  }

  function showError() {
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) errorEl.style.display = "block";
    hidePreloader();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "";
  }

  function setHref(id, value) {
    const el = document.getElementById(id);
    if (el) el.href = value;
  }

  function renderBodySafely(target, html, fallbackText) {
    if (!target) return;
    target.textContent = "";
    if (!html || typeof html !== "string") {
      const p = document.createElement("p");
      p.textContent = fallbackText || "";
      target.appendChild(p);
      return;
    }

    const tpl = document.createElement("template");
    tpl.innerHTML = html;

    tpl.content.querySelectorAll("script,iframe,object,embed,link,style").forEach((n) => n.remove());

    tpl.content.querySelectorAll("*").forEach((node) => {
      [...node.attributes].forEach((attr) => {
        const n = attr.name.toLowerCase();
        const v = String(attr.value || "");
        if (n.startsWith("on")) node.removeAttribute(attr.name);
        if ((n === "src" || n === "href") && /^\s*javascript:/i.test(v)) node.removeAttribute(attr.name);
      });
    });

    target.appendChild(tpl.content);
  }

  async function init() {
    if (!slug) {
      showError();
      return;
    }

    try {
      const res = await fetch("https://cms-nuevos3.sebastianvernis.workers.dev/api/articles/" + encodeURIComponent(slug));
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      const a = data?.article;
      if (!a) throw new Error("empty");

      document.title = (a.title || "Artículo") + " - " + (document.title.split(" - ").slice(-1)[0] || "News");
      const desc = document.getElementById("page-desc");
      if (desc) desc.content = a.excerpt || a.desc || "";

      const cat = a.category || "Noticias";
      setText("art-category-breadcrumb", cat);
      setText("art-category-badge", cat);

      const badge = document.getElementById("art-category-badge");
      if (badge) badge.className = "article-category-badge cat-" + String(cat).toLowerCase().replace(/\s+/g, "-");

      setText("art-title", a.title || "");
      setText("art-author", a.author || "Redacción");
      setText(
        "art-date",
        a.publishedAt
          ? new Date(a.publishedAt).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "",
      );

      const imgWrapper = document.getElementById("art-image-wrapper");
      const img = document.getElementById("art-image");
      if (img) {
        if (a.imageUrl) {
          img.src = safeUrl(a.imageUrl);
          img.alt = a.title || "Imagen del artículo";
          img.onerror = function () {
            this.src = safeUrl(defaultImg);
            this.alt = "Imagen no disponible";
          };
        } else if (imgWrapper) {
          imgWrapper.style.display = "none";
        }
      }

      const body = document.getElementById("art-body");
      const raw = a.content || "";
      const fallback = a.excerpt || a.desc || "";
      renderBodySafely(body, raw, fallback);

      const shareUrl = encodeURIComponent(location.href);
      const shareText = encodeURIComponent(a.title || "");
      setHref("share-fb", "https://www.facebook.com/sharer/sharer.php?u=" + shareUrl);
      setHref("share-tw", "https://twitter.com/intent/tweet?url=" + shareUrl + "&text=" + shareText);
      setHref("share-wa", "https://wa.me/?text=" + shareText + "%20" + shareUrl);

      if (loadingEl) loadingEl.style.display = "none";
      if (contentEl) contentEl.style.display = "block";
      hidePreloader();
    } catch {
      showError();
    }
  }

  init();
})();
