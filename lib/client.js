// Browser half of the permanent Skills Palette package.
// Loaded as a web client bundle: window.__ModuleLoader__.load({ id, factory }).
//   - React comes from require("react") (the reference bundles do the same).
//   - The skill catalog comes from the existing RPC via
//     ctx.get("connection").api.skills.list({}).
//   - The full body (read pane) is fetched via the package-private host.call
//     channel when present; otherwise the detail view degrades gracefully.
// Registers into the queried slots:
//   - sidebar.footer.action (id skills-palette-button): the trigger button
//   - shell.overlay (id skills-palette): the command-palette overlay
// Covers tickets 1-3: list + live search, read pane, keyboard nav,
// loading/empty/error states, light+dark theme tokens.

window.__ModuleLoader__.load({
  id: "@jamiebarker/dsh-client-ui-skills-palette",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");

    // --- styles (injected once at load, like the reference bundles) ---
    var css =
      ".skp-trigger{background:transparent;border:none;color:inherit;cursor:pointer;font-size:13px;padding:4px 8px;border-radius:6px}" +
      ".skp-trigger:hover{background:var(--dsw-alias-bg-layer-2)}" +
      ".skp-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.35);display:flex;align-items:flex-start;justify-content:center;padding-top:12vh;pointer-events:auto}" +
      ".skp-panel{width:600px;max-width:92vw;max-height:66vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,0.3);overflow:hidden;pointer-events:auto}" +
      ".skp-search{margin:10px 10px 6px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:14px;outline:none}" +
      ".skp-search:focus{border-color:var(--dsw-alias-brand-primary)}" +
      ".skp-body{overflow-y:auto;flex:1}" +
      ".skp-list{list-style:none;margin:0;padding:4px 8px 10px}" +
      ".skp-item{padding:8px 10px;border-radius:8px;cursor:pointer}" +
      ".skp-item:hover{background:var(--dsw-alias-bg-layer-1)}" +
      ".skp-item-active{background:var(--dsw-alias-bg-layer-2)}" +
      ".skp-panel-root{display:flex;flex-direction:column;width:100%;min-width:0;max-height:46vh}" +
      ".skp-panel-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px;background:transparent;border:none;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:6px 8px;border-radius:6px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase}" +
      ".skp-panel-toggle:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}" +
      ".skp-panel-title{font-weight:600}" +
      ".skp-head-right{display:flex;align-items:center;gap:8px}" +
      ".skp-open-full{opacity:0;font-size:12px;transition:opacity 120ms}" +
      ".skp-panel-toggle:hover .skp-open-full{opacity:1}" +
      ".skp-open-full:hover{color:var(--dsw-alias-label-primary)}" +
      ".skp-chev{font-size:11px;opacity:0.8}" +
      ".skp-panel-search{margin:2px 8px 6px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;outline:none;min-width:0}" +
      ".skp-panel-search:focus{border-color:var(--dsw-alias-brand-primary)}" +
      ".skp-panel-list{overflow-y:auto;overflow-x:hidden;flex:1;min-height:0}" +
      ".skp-panel-list .skp-item-desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}" +
      ".skp-item-head{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
      ".skp-item-name{font-weight:600;font-size:14px}" +
      ".skp-section{padding:8px 12px 4px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}" +
      ".skp-info{flex:none;width:20px;height:20px;line-height:18px;text-align:center;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;font-style:italic;cursor:pointer;opacity:0;transition:opacity 120ms}" +
      ".skp-item:hover .skp-info,.skp-item-active .skp-info,.skp-info:focus{opacity:1}" +
      ".skp-info:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary)}" +
      ".skp-send{flex:none;width:20px;height:20px;line-height:18px;text-align:center;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;cursor:pointer;opacity:0;transition:opacity 120ms}" +
      ".skp-item:hover .skp-send,.skp-item-active .skp-send,.skp-send:focus{opacity:1}" +
      ".skp-send:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}" +
      ".skp-item-desc{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:2px}" +
      ".skp-state{padding:20px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px}" +
      ".skp-footer{padding:8px 12px;border-top:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-secondary)}" +
      ".skp-back{background:transparent;border:1px solid var(--dsw-alias-border-l1);color:inherit;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;margin:10px 0 4px 10px}" +
      ".skp-detail-head{display:flex;align-items:center;gap:10px}" +
      ".skp-detail-name{font-weight:700;font-size:16px}" +
      ".skp-desc{font-size:13px;color:var(--dsw-alias-label-secondary);margin:0 10px 6px}" +
      ".skp-when{font-size:12px;color:var(--dsw-alias-label-secondary);margin:0 10px 6px}" +
      ".skp-detail-body{padding:4px 14px 14px}" +
      ".skp-h{margin:12px 0 6px;font-size:15px}" +
      ".skp-p{margin:6px 0;font-size:13px;line-height:1.5}" +
      ".skp-li{margin:4px 0 4px 8px;font-size:13px}" +
      ".skp-link{color:var(--dsw-alias-brand-primary);text-decoration:none}" +
      ".skp-code{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:8px;font-size:12px;overflow-x:auto;white-space:pre}";
    var tagId = "@jamiebarker/dsh-client-ui-skills-palette/styles";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "@jamiebarker/dsh-client-ui-skills-palette";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // --- recents + composer draft (mirrors src/recents.js) ---
    var RECENT_LIMIT = 8;

    function rememberSkill(recent, name, limit) {
      var list = Array.isArray(recent) ? recent : [];
      return [name].concat(list.filter(function (entry) { return entry !== name; })).slice(0, limit || RECENT_LIMIT);
    }

    function resolveRecents(recent, skills) {
      var list = Array.isArray(recent) ? recent : [];
      var byName = new Map(skills.map(function (skill) { return [skill.name, skill]; }));
      return list.map(function (name) { return byName.get(name); }).filter(function (skill) { return skill !== undefined; });
    }

    function recentsKey(cwd) {
      if (typeof cwd !== "string" || cwd === "") return undefined;
      return "skp:recents:" + cwd;
    }

    // The host runs a message as a command only when the trimmed draft starts
    // with "/", so the command leads and typed text follows as arguments.
    function composeDraft(draft, name) {
      var existing = typeof draft === "string" ? draft.trim() : "";
      return existing === "" ? "/" + name + " " : "/" + name + " " + existing;
    }

    // Storage is a convenience, never a dependency: a browser that blocks it
    // costs the recents list and nothing else.
    function readRecents(key) {
      if (key === undefined || typeof localStorage === "undefined") return [];
      try {
        var raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return [];
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.warn("[skills-palette] recents unreadable:", err);
        return [];
      }
    }
    function writeRecents(key, list) {
      if (key === undefined || typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch (err) {
        console.warn("[skills-palette] recents not saved:", err);
      }
    }

    // --- pure helpers ---
    function filterSkills(skills, query) {
      var q = (query || "").trim().toLowerCase();
      if (!q) return skills;
      return skills.filter(function (s) {
        return String(s.name).toLowerCase().includes(q) ||
          String(s.description || "").toLowerCase().includes(q);
      });
    }

    function renderInline(text) {
      var parts = [];
      var regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
      var last = 0;
      var m;
      var key = 0;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        var tok = m[0];
        if (tok.startsWith("**")) parts.push(React.createElement("strong", { key: key++ }, tok.slice(2, -2)));
        else if (tok.startsWith("`")) parts.push(React.createElement("code", { key: key++ }, tok.slice(1, -1)));
        else if (tok.startsWith("[")) {
          var mm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (mm) parts.push(React.createElement("a", { key: key++, href: mm[2], className: "skp-link" }, mm[1]));
          else parts.push(tok);
        } else parts.push(React.createElement("em", { key: key++ }, tok.slice(1, -1)));
        last = m.index + tok.length;
      }
      if (last < text.length) parts.push(text.slice(last));
      return parts;
    }

    function renderBody(content) {
      var lines = String(content || "").split("\n");
      if (lines.length && lines[0].trim() === "---") {
        var closeIdx = lines.findIndex(function (l, i) { return i > 0 && l.trim() === "---"; });
        if (closeIdx !== -1) lines = lines.slice(closeIdx + 1);
      }
      var out = [];
      var inCode = false;
      var code = [];
      lines.forEach(function (line) {
        if (line.trim().startsWith("```")) {
          if (inCode) { out.push(React.createElement("pre", { key: out.length, className: "skp-code" }, code.join("\n"))); code = []; }
          else inCode = true;
          return;
        }
        if (inCode) { code.push(line); return; }
        var h = line.match(/^(#{1,6})\s+(.*)/);
        if (h) out.push(React.createElement("h" + Math.min(h[1].length, 6), { key: out.length, className: "skp-h" }, renderInline(h[2])));
        else if (line.trim().match(/^\s*[-*]\s+/)) out.push(React.createElement("div", { key: out.length, className: "skp-li" }, "• ", renderInline(line.trim().replace(/^\s*[-*]\s+/, ""))));
        else if (line.trim().match(/^\s*\d+\.\s+/)) out.push(React.createElement("div", { key: out.length, className: "skp-li" }, renderInline(line.trim())));
        else if (line.trim() !== "") out.push(React.createElement("p", { key: out.length, className: "skp-p" }, renderInline(line)));
      });
      if (inCode) out.push(React.createElement("pre", { key: out.length, className: "skp-code" }, code.join("\n")));
      return out;
    }

    // --- data channel (mirrors src/catalog.js) ---
    // The host route is `skill.list`: it takes { sessionId } and answers an
    // RPC envelope, not a bare array.
    function unwrapSkillList(response) {
      var result = response === undefined || response === null ? undefined : response.result;
      if (result === undefined || result === null) throw new Error("skill.list returned no result envelope");
      if (!result.ok) {
        var error = result.error || {};
        throw new Error("skill.list failed: " + (error.code || "unknown") + ": " + (error.message || "no message"));
      }
      var skills = result.value === undefined || result.value === null ? undefined : result.value.skills;
      if (!Array.isArray(skills)) throw new Error("skill.list succeeded without a skills array");
      return skills;
    }

    function currentSessionId(ctx) {
      var sessions = ctx.get("sessions");
      if (sessions === undefined || sessions === null) return undefined;
      var list = sessions.list;
      if (list === undefined || list === null || typeof list.getSnapshot !== "function") return undefined;
      var snapshot = list.getSnapshot();
      if (snapshot === undefined || snapshot === null) return undefined;
      return snapshot.current;
    }

    // The recents list is per project, so it survives session churn inside
    // one workspace and never leaks between projects.
    function currentCwd(ctx) {
      var sessions = ctx.get("sessions");
      if (sessions === undefined || sessions === null || sessions.list === undefined) return undefined;
      var snapshot = sessions.list.getSnapshot();
      if (snapshot === undefined || snapshot === null || snapshot.current === undefined) return undefined;
      var summary = (snapshot.byId || {})[snapshot.current];
      return summary === undefined ? undefined : summary.cwd;
    }

    // The composer for the open session: sessions mints the scope, the
    // conversation service resolves that scope's input facade.
    function composerFor(ctx, sessionId) {
      var conversation = ctx.get("conversation");
      var sessions = ctx.get("sessions");
      if (conversation === undefined || conversation === null || conversation.input === undefined) return undefined;
      if (sessions === undefined || sessions === null || typeof sessions.scope !== "function") return undefined;
      var actx = sessions.scope(sessionId);
      if (actx === undefined) return undefined;
      return conversation.input.for(actx);
    }

    function focusComposer() {
      if (typeof document === "undefined") return;
      var box = document.querySelector("textarea[data-phase]");
      if (box !== null && box !== undefined && typeof box.focus === "function") box.focus();
    }

    function listSkills(ctx, sessionId) {
      var connection = ctx.get("connection");
      if (connection && connection.api && connection.api.skills && typeof connection.api.skills.list === "function") {
        return Promise.resolve(connection.api.skills.list({ sessionId: sessionId })).then(unwrapSkillList);
      }
      return Promise.reject(new Error("skills bridge unavailable"));
    }

    // The wire carries summaries only — there is no skill.get route. A host
    // half, when one is mounted, supplies the body through its own channel.
    function hostBridge() {
      if (typeof host === "undefined" || host === null) return undefined;
      return typeof host.call === "function" ? host : undefined;
    }
    function getSkillBody(name) {
      var bridge = hostBridge();
      if (bridge === undefined) return Promise.resolve(undefined);
      return bridge.call("skills/get", { name: name });
    }

    // --- plugin ---
    module.exports = {
      name: "dsh-client-ui-skills-palette",
      inject: [],
      apply(ctx) {
        var slots = ctx.get("slots");
        if (slots === undefined) return;

        var store = { open: false, query: "", panelOpen: false, panelQuery: "", skills: [], recent: [], loading: false, loaded: false, error: null, sessionId: undefined, detail: null, detailLoading: false, index: 0 };
        var listeners = new Set();
        function subscribe(fn) { listeners.add(fn); return function () { listeners.delete(fn); }; }
        function setState(patch) { Object.assign(store, patch); listeners.forEach(function (fn) { fn(); }); }

        // The catalog is per session: the host resolves it against that
        // session's project cwd. A cached list belongs to loadedFor only.
        var loadedFor;
        function ensureLoaded() {
          var sessionId = currentSessionId(ctx);
          if (sessionId === undefined) {
            loadedFor = undefined;
            setState({ sessionId: undefined, skills: [], loading: false, loaded: false, error: null });
            return;
          }
          // Already loaded, or still loading, for this same session: leave it.
          // Without the in-flight half, opening the palette during the first
          // load would fire a second identical request.
          if (loadedFor === sessionId && (store.loaded || store.loading) && store.error === null) return;
          loadedFor = sessionId;
          setState({ sessionId: sessionId, loading: true, loaded: false, error: null });
          listSkills(ctx, sessionId).then(function (list) {
            if (loadedFor !== sessionId) return;
            setState({ skills: list, loading: false, loaded: true });
          }).catch(function (err) {
            if (loadedFor !== sessionId) return;
            loadedFor = undefined;
            setState({ error: String((err && err.message) || err), loading: false, loaded: false });
          });
        }

        function open() {
          ensureLoaded();
          setState({ open: true, query: "", recent: readRecents(recentsKey(currentCwd(ctx))), detail: null, detailLoading: false, index: 0 });
        }

        // The sidebar section always starts expanded; a collapse applies to
        // the session only, so the next visit shows the list again.

        function togglePanel() {
          var next = !store.panelOpen;
          setState({ panelOpen: next, panelQuery: "", recent: readRecents(recentsKey(currentCwd(ctx))) });
          if (next) ensureLoaded();
        }

        // The primary action: put the skill in the composer, ready to send.
        function draftSkill(skill) {
          var sessionId = currentSessionId(ctx);
          if (sessionId === undefined) return undefined;
          var composer = composerFor(ctx, sessionId);
          if (composer === undefined) throw new Error("skills-palette: no composer for session " + String(sessionId));
          var snapshot = composer.state === undefined ? undefined : composer.state.getSnapshot();
          var draft = snapshot === undefined || snapshot === null ? "" : snapshot.draft;
          composer.actions.setDraft(composeDraft(draft, skill.name));
          return composer;
        }
        function rememberPick(skill) {
          var key = recentsKey(currentCwd(ctx));
          var next = rememberSkill(readRecents(key), skill.name);
          writeRecents(key, next);
          setState({ recent: next, open: false, detail: null, detailLoading: false });
        }
        function pick(skill) {
          var composer = draftSkill(skill);
          if (composer === undefined) return;
          rememberPick(skill);
          focusComposer();
        }
        // Like pick, but sends the message immediately: the skill becomes a
        // command the host runs right away instead of sitting in the box.
        function pickAndSend(skill) {
          var composer = draftSkill(skill);
          if (composer === undefined) return;
          composer.actions.submit();
          rememberPick(skill);
        }
        function close() { setState({ open: false }); }
        function toggle() { store.open ? close() : open(); }

        // The summary opens the read pane immediately; the body, when a host
        // half can supply it, fills in behind.
        function openDetail(summary) {
          var bridged = hostBridge() !== undefined;
          setState({ detail: summary, detailLoading: bridged });
          if (!bridged) return;
          getSkillBody(summary.name).then(function (skill) {
            if (store.detail !== summary) return;
            setState({ detail: skill && typeof skill === "object" ? skill : summary, detailLoading: false });
          }).catch(function (err) {
            if (store.detail !== summary) return;
            setState({ detailLoading: false, error: String((err && err.message) || err) });
          });
        }

        // The sidebar section starts expanded and filled: the list is meant
        // to be there without being asked for.
        setState({ panelOpen: true, recent: readRecents(recentsKey(currentCwd(ctx))) });
        ensureLoaded();

        // Switching session switches catalog: drop the cached list so the
        // next open (or an open palette) pulls the new session's skills.
        ctx.effect(function () {
          var sessions = ctx.get("sessions");
          if (sessions === undefined || sessions === null) return;
          var list = sessions.list;
          if (list === undefined || list === null || typeof list.subscribe !== "function") return;
          return list.subscribe(function () {
            if (currentSessionId(ctx) === store.sessionId) return;
            loadedFor = undefined;
            if (store.open || store.panelOpen) ensureLoaded();
            else setState({ skills: [], loaded: false, error: null, sessionId: currentSessionId(ctx) });
          });
        });

        ctx.effect(function () {
          if (typeof window === "undefined") return;
          function onKey(e) {
            if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "k") { e.preventDefault(); toggle(); }
            else if (e.key === "Escape" && store.open) close();
          }
          window.addEventListener("keydown", onKey);
          return function () { window.removeEventListener("keydown", onKey); };
        });

        function useStore() {
          var state = React.useState(0);
          React.useEffect(function () { return subscribe(function () { state[1](function (t) { return t + 1; }); }); }, []);
          return store;
        }

        // --- shared list rendering (the overlay and the sidebar section
        // present the same rows, so they share one builder) ---

        function skillRow(skill, active) {
          return React.createElement("li", {
            key: skill.name,
            "data-skill": skill.name,
            className: "skp-item" + (active ? " skp-item-active" : ""),
            onClick: function () { pick(skill); },
            title: "Insert /" + skill.name + " into the message box",
          },
            React.createElement("div", { className: "skp-item-head" },
              React.createElement("div", { className: "skp-item-name" }, skill.name),
              React.createElement("div", { className: "skp-head-right" },
                React.createElement("button", {
                  className: "skp-send",
                  title: "Send /" + skill.name + " now",
                  onClick: function (e) { e.stopPropagation(); pickAndSend(skill); },
                }, "➤"),
                React.createElement("button", {
                  className: "skp-info",
                  title: "About " + skill.name,
                  onClick: function (e) { e.stopPropagation(); openDetail(skill); setState({ open: true }); },
                }, "i"))),
            React.createElement("div", { className: "skp-item-desc" }, skill.description || ""));
        }

        /**
         * Recents lead while the search box is empty; typing collapses the view
         * to one filtered list. Returns the rendered sections and the flat order
         * the arrow keys walk.
         */
        function buildList(s, query, index) {
          var results = filterSkills(s.skills, query);
          var searching = query.trim() !== "";
          var recents = searching ? [] : resolveRecents(s.recent, s.skills);
          var rest = recents.length === 0 ? results : results.filter(function (skill) {
            return !recents.some(function (r) { return r.name === skill.name; });
          });
          var nodes = [];
          if (recents.length > 0) {
            nodes.push(React.createElement("div", { key: "recent-head", className: "skp-section" }, "Recent"));
            nodes.push(React.createElement("ul", { key: "recent", className: "skp-list" },
              recents.map(function (skill, i) { return skillRow(skill, i === index); })));
            if (rest.length > 0) nodes.push(React.createElement("div", { key: "all-head", className: "skp-section" }, "All skills"));
          }
          if (rest.length > 0) {
            nodes.push(React.createElement("ul", { key: "all", className: "skp-list" },
              rest.map(function (skill, i) { return skillRow(skill, recents.length + i === index); })));
          }
          return { visible: recents.concat(rest), nodes: nodes, results: results };
        }

        /** The message shown in place of an empty list. */
        function emptyMessage(s) {
          if (s.sessionId === undefined) return "Open a session to browse its skills";
          return s.skills.length === 0 ? "No skills available in this session" : "No skills match";
        }

        // The sidebar section: a Skills header that expands into search plus
        // the list, in place. The rail (56px column) has no room for it, so it
        // falls back to the control that opens the overlay.
        slots.inject("sidebar.footer.action", function () {
          return slots.register(
            { name: "sidebar.footer.action", id: "skills-panel", order: 20, label: "Skills" },
            function (props) {
              var s = useStore();
              var wide = props === undefined || props.wide !== false;
              if (!wide) {
                return React.createElement("button", { className: "skp-trigger", onClick: toggle, title: "Skills (Ctrl+K)" }, "✦");
              }

              // The header carries both controls: collapse, and open the full
              // palette (Ctrl+K is not dependable — browsers claim it).
              var header = React.createElement("button", {
                className: "skp-panel-toggle",
                onClick: togglePanel,
                title: s.panelOpen ? "Hide skills" : "Show skills",
              },
                React.createElement("span", { className: "skp-panel-title" }, "Skills"),
                React.createElement("span", { className: "skp-head-right" },
                  React.createElement("span", {
                    className: "skp-open-full",
                    role: "button",
                    title: "Open the full palette",
                    onClick: function (e) { e.stopPropagation(); open(); },
                  }, "⤢"),
                  React.createElement("span", { className: "skp-chev" }, s.panelOpen ? "⌄" : "›")));

              if (!s.panelOpen) return React.createElement("div", { className: "skp-panel-root" }, header);

              var built = buildList(s, s.panelQuery, -1);
              var listBody = s.loading ? React.createElement("div", { className: "skp-state" }, "Loading…")
                : s.error ? React.createElement("div", { className: "skp-state" }, "Failed to load skills: " + s.error)
                  : built.visible.length === 0 ? React.createElement("div", { className: "skp-state" }, emptyMessage(s))
                    : built.nodes;

              return React.createElement("div", { className: "skp-panel-root" },
                header,
                React.createElement("input", {
                  className: "skp-panel-search",
                  placeholder: "Search skills…",
                  value: s.panelQuery,
                  onChange: function (e) { setState({ panelQuery: e.target.value }); },
                  onKeyDown: function (e) { if (e.key === "Escape") setState({ panelQuery: "" }); },
                }),
                React.createElement("div", { className: "skp-panel-list" }, listBody));
            }
          );
        });

        slots.inject("shell.overlay", function () {
          return slots.register(
            { name: "shell.overlay", id: "skills-palette", order: 10 },
            function () {
              var s = useStore();
              if (!s.open) return null;
              // `visible` is the flat order the arrow keys and Enter walk.
              var built = buildList(s, s.query, s.index);
              var results = built.results;
              var visible = built.visible;
              var body;
              if (s.detail) {
                body = React.createElement("div", { className: "skp-detail" },
                  React.createElement("div", { className: "skp-detail-head" },
                    React.createElement("button", { className: "skp-back", onClick: function () { setState({ detail: null, detailLoading: false, index: 0 }); } }, "← Back"),
                    React.createElement("div", { className: "skp-detail-name" }, s.detail.name)),
                  s.detail.description ? React.createElement("div", { className: "skp-desc" }, renderInline(s.detail.description)) : null,
                  s.detail.whenToUse ? React.createElement("div", { className: "skp-when" }, "When to use: " + s.detail.whenToUse) : null,
                  React.createElement("div", { className: "skp-body skp-detail-body" },
                    s.detailLoading ? React.createElement("div", { className: "skp-state" }, "Loading…")
                      : s.detail.content ? renderBody(s.detail.content)
                        : React.createElement("div", { className: "skp-state" }, "The skill body is not available from the web GUI.")));
              } else if (s.detailLoading) {
                body = React.createElement("div", { className: "skp-state" }, "Loading…");
              } else {
                body = React.createElement("div", { className: "skp-body" },
                  s.loading ? React.createElement("div", { className: "skp-state" }, "Loading…")
                    : s.error ? React.createElement("div", { className: "skp-state" }, "Failed to load skills: " + s.error)
                      : results.length === 0 ? React.createElement("div", { className: "skp-state" }, emptyMessage(s))
                        : built.nodes);
              }
              return React.createElement("div", { className: "skp-backdrop", onClick: close },
                React.createElement("div", { className: "skp-panel", onClick: function (e) { e.stopPropagation(); } },
                  React.createElement("input", {
                    className: "skp-search",
                    placeholder: "Search skills…",
                    autoFocus: true,
                    value: s.query,
                    onChange: function (e) { setState({ query: e.target.value, index: 0, detail: null, detailLoading: false }); },
                    onKeyDown: function (e) {
                      if (e.key === "Escape") close();
                      else if (e.key === "ArrowDown") { e.preventDefault(); if (visible.length > 0) setState({ index: Math.min(s.index + 1, visible.length - 1) }); }
                      else if (e.key === "ArrowUp") { e.preventDefault(); if (visible.length > 0) setState({ index: Math.max(s.index - 1, 0) }); }
                      else if (e.key === "Enter") { if (!s.detail && visible[s.index]) pick(visible[s.index]); }
                    }
                  }),
                  body,
                  React.createElement("div", { className: "skp-footer" },
                    s.detail ? s.detail.name
                      : String(s.skills.length) + " skills" + (s.query.trim() ? " · " + String(results.length) + " shown" : ""))));
            }
          );
        });
      },
    };

    // The module loader takes the factory's return value as the module exports.
    // Without this the loader receives undefined and cordis rejects the plugin.
    return module.exports;
  }
});
