/* ---------- Settings Mo can change ---------- */
const SITE = {
  name: "Loren Berkovics, LCSW",
  title: "Licensed Clinical Social Worker & Trauma Therapist",
  /* Paste the Web app address from Google Apps Script here (see README).
     It powers the blog and the consultation form. */
  scriptUrl: "",
  /* Used only while scriptUrl is empty, so the blog still shows something. */
  fallbackPostsUrl: "posts.json"
};

/* ---------- Shared header and footer ---------- */
(function () {
  const page = document.body.dataset.page || "";
  const link = (href, label, key) =>
    `<a href="${href}" class="${page === key ? "active" : ""}">${label}</a>`;

  const header = `
  <header class="site"><div class="wrap">
    <a class="brand" href="index.html">${SITE.name}<small>Trauma therapy &middot; online</small></a>
    <button class="menu-btn" aria-label="Open menu" aria-expanded="false" id="menuBtn">Menu</button>
    <nav class="main" id="mainNav" aria-label="Main">
      ${link("about.html", "About", "about")}
      ${link("help.html", "How I help", "help")}
      ${link("working-together.html", "Working together", "work")}
      ${link("blog.html", "Blog", "blog")}
      <a class="btn" href="contact.html">Free consultation</a>
    </nav>
  </div></header>`;

  const footer = `
  <footer class="site"><div class="wrap">
    <div>
      <strong>${SITE.name}</strong><br>${SITE.title}<br>
      Online sessions for clients in New York, Florida, and Rhode Island.
      <div class="crisis">If you're in crisis or in immediate danger, call or text 988 (Suicide &amp; Crisis Lifeline) or call 911.</div>
    </div>
    <div>
      <a href="contact.html">Contact</a><br>
      <a href="blog.html">Blog</a><br>
      <span>&copy; <span id="yr"></span> Loren Berkovics</span>
    </div>
  </div></footer>`;

  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer);
  document.getElementById("yr").textContent = new Date().getFullYear();

  const btn = document.getElementById("menuBtn");
  const nav = document.getElementById("mainNav");
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
})();

/* ---------- Blog helpers ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtDate(d) {
  const dt = new Date(d + "T12:00:00");
  return isNaN(dt) ? "" : dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
async function loadPosts() {
  const url = SITE.scriptUrl ? SITE.scriptUrl + "?action=posts" : SITE.fallbackPostsUrl;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't load posts");
  const data = await res.json();
  return (data.posts || [])
    .filter(p => p.published !== false)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
function postCard(p) {
  return `<a class="post-card" href="post.html?id=${encodeURIComponent(p.id)}">
    <div class="meta">${esc(fmtDate(p.date))}</div>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.summary || "")}</p>
  </a>`;
}

/* Latest posts on the home page */
async function renderLatest(el, n) {
  try {
    const posts = (await loadPosts()).slice(0, n);
    el.innerHTML = posts.length ? posts.map(postCard).join("") : `<p>New posts are coming soon.</p>`;
  } catch (e) {
    el.innerHTML = `<p>New posts are coming soon.</p>`;
  }
}
/* Full list on the blog page */
async function renderAll(el) {
  try {
    const posts = await loadPosts();
    el.innerHTML = posts.length ? posts.map(postCard).join("") : `<p>New posts are coming soon.</p>`;
  } catch (e) {
    el.innerHTML = `<p>Couldn't load the posts right now. Try again in a moment.</p>`;
  }
}
/* Single post */
async function renderPost(titleEl, metaEl, bodyEl) {
  const id = new URLSearchParams(location.search).get("id");
  try {
    const p = (await loadPosts()).find(x => x.id === id);
    if (!p) throw new Error("missing");
    document.title = p.title + " | " + SITE.name;
    titleEl.textContent = p.title;
    metaEl.textContent = fmtDate(p.date);
    if (p.html) {
      /* Already cleaned and escaped by the Google script. */
      bodyEl.innerHTML = p.html;
    } else {
      /* Fallback posts.json: plain paragraphs separated by blank lines. */
      bodyEl.innerHTML = String(p.body || "")
        .split(/\n\s*\n/).map(t => `<p>${esc(t.trim()).replace(/\n/g, "<br>")}</p>`).join("");
    }
  } catch (e) {
    titleEl.textContent = "Post not found";
    bodyEl.innerHTML = `<p>That post isn't available. <a href="blog.html">Back to the blog</a></p>`;
  }
}

/* ---------- Consultation form ---------- */
function initContactForm(form) {
  const status = form.querySelector(".form-status");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    status.className = "form-status";
    const data = new FormData(form);
    if (data.get("website")) return; /* hidden spam trap */
    if (!data.get("name") || !(data.get("email") || data.get("phone"))) {
      status.classList.add("err");
      status.textContent = "Enter your name and an email or phone number.";
      return;
    }
    if (!SITE.scriptUrl) {
      status.classList.add("err");
      status.textContent = "This form isn't connected yet. For now, please reach out another way.";
      return;
    }
    try {
      /* Google Apps Script answers from another address, so the reply can't be read.
         A request that goes through without a network error is treated as sent. */
      await fetch(SITE.scriptUrl, { method: "POST", mode: "no-cors", body: new URLSearchParams(data) });
      form.reset();
      status.classList.add("ok");
      status.textContent = "Thank you. I'll be in touch soon to find a time to talk.";
    } catch (err) {
      status.classList.add("err");
      status.textContent = "Something went wrong sending that. Please try again.";
    }
  });
}
