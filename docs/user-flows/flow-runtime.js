(function () {
  function createNode(tag, className, text, editable) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    if (editable) node.setAttribute("contenteditable", "true");
    return node;
  }

  function initialsFromText(text) {
    var clean = (text || "").replace(/[^A-Za-z0-9 ]/g, " ").trim();
    if (!clean) return "#";
    var words = clean.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function splitByColon(text) {
    var idx = text.indexOf(":");
    if (idx === -1) return { key: "", value: text.trim() };
    return {
      key: text.slice(0, idx).trim(),
      value: text.slice(idx + 1).trim()
    };
  }

  function collectEntries(section) {
    var entries = [];
    if (!section) return entries;
    section.querySelectorAll(".wf-chip, .wf-item, .wf-line").forEach(function (node) {
      var text = (node.textContent || "").trim();
      if (!text) return;
      entries.push({
        type: node.classList.contains("wf-chip") ? "chip" : "line",
        text: text,
        muted: node.classList.contains("wf-muted")
      });
    });
    return entries;
  }

  function extractThreadTitle(entries) {
    var fallback = "Website Redesign";
    for (var i = 0; i < entries.length; i += 1) {
      var text = entries[i].text;
      if (/thread\s*:/i.test(text)) {
        return splitByColon(text).value || fallback;
      }
      if (/website redesign|mobile app sprint|q1 planning session|bug triage|marketing launch/i.test(text)) {
        return text.replace(/^.*?:\s*/, "").trim();
      }
    }
    return fallback;
  }

  function decorateSidebar(sidebar, entries) {
    if (!sidebar) return;
    var title = sidebar.querySelector(".wf-block-title");
    var titleText = title ? title.textContent : "Sidebar";

    sidebar.innerHTML = "";
    sidebar.appendChild(createNode("div", "wf-block-title", titleText, false));

    var profileText = "TaskChat | You";
    var hasProfileEntry = entries.some(function (entry) {
      return /profile|taskchat|you\s*\//i.test(entry.text);
    });
    if (hasProfileEntry) {
      var profileRow = createNode("div", "wf-profile", "", false);
      var profileAvatar = createNode("span", "wf-profile-avatar", "YO", true);
      var profileCopy = createNode("div", "wf-profile-copy", "", false);
      profileCopy.appendChild(createNode("div", "wf-profile-title", "TaskChat", true));
      profileCopy.appendChild(createNode("div", "wf-profile-sub", "You", true));
      profileRow.appendChild(profileAvatar);
      profileRow.appendChild(profileCopy);
      sidebar.appendChild(profileRow);
    } else if (entries.length) {
      profileText = entries[0].text;
      var profileRowSimple = createNode("div", "wf-profile", "", false);
      profileRowSimple.appendChild(createNode("span", "wf-profile-avatar", initialsFromText(profileText), true));
      var profileCopySimple = createNode("div", "wf-profile-copy", "", false);
      profileCopySimple.appendChild(createNode("div", "wf-profile-title", profileText.replace(/^.*?:\s*/, ""), true));
      profileCopySimple.appendChild(createNode("div", "wf-profile-sub", "Context", true));
      profileRowSimple.appendChild(profileCopySimple);
      sidebar.appendChild(profileRowSimple);
    }

    var searchText = "Search threads...";
    entries.forEach(function (entry) {
      if (/search/i.test(entry.text)) {
        searchText = entry.text.replace(/^.*?:\s*/i, "").trim() || searchText;
      }
    });
    var searchRow = createNode("div", "wf-search", "", false);
    searchRow.appendChild(createNode("span", "wf-search-icon", "⌕", false));
    searchRow.appendChild(createNode("div", "wf-search-text", searchText, true));
    sidebar.appendChild(searchRow);

    var threadEntries = entries.filter(function (entry) {
      return !/profile|taskchat|you\s*\/|search/i.test(entry.text);
    });

    if (!threadEntries.length) {
      threadEntries = [
        { text: "Pinned: Website Redesign" },
        { text: "All Threads: Bug Triage" }
      ];
    }

    var list = createNode("div", "wf-thread-list", "", false);
    var timePool = ["2m ago", "58m ago", "4h ago", "1d ago", "2d ago"];
    threadEntries.forEach(function (entry, idx) {
      var parsed = splitByColon(entry.text);
      var lowerKey = parsed.key.toLowerCase();
      var row = createNode("div", "wf-thread", "", false);
      if (/active|pinned|result/i.test(parsed.key || entry.text)) {
        row.classList.add("is-active");
      }

      var avatar = createNode("span", "wf-thread-avatar", initialsFromText(parsed.value || entry.text), true);
      var copy = createNode("div", "wf-thread-copy", "", false);
      var titleNode = createNode("div", "wf-thread-title", parsed.value || entry.text, true);
      var subText = parsed.key ? parsed.key : "Thread item";
      if (/all threads/i.test(lowerKey)) subText = "All threads";
      if (/pinned/i.test(lowerKey)) subText = "Pinned";
      copy.appendChild(titleNode);
      copy.appendChild(createNode("div", "wf-thread-sub", subText, true));

      var timeNode = createNode("span", "wf-thread-time", timePool[idx % timePool.length], true);
      var badgeText = "";
      var badgeMatch = entry.text.match(/\b(\d+)\b/);
      if (/unread|badge/i.test(entry.text) && badgeMatch) badgeText = badgeMatch[1];
      if (/active|pinned/i.test(lowerKey) && !badgeText) badgeText = "1";
      var badge = createNode("span", "wf-thread-badge", badgeText, true);
      if (!badgeText) badge.classList.add("is-hidden");

      row.appendChild(avatar);
      row.appendChild(copy);
      row.appendChild(timeNode);
      row.appendChild(badge);
      list.appendChild(row);
    });

    sidebar.appendChild(list);
  }

  function createMessageRow(sender, body, isSelf) {
    var row = createNode("div", "wf-msg-row" + (isSelf ? " is-self" : ""), "", false);
    var avatar = createNode("span", "wf-msg-avatar", initialsFromText(sender), true);
    var bubble = createNode("div", "wf-msg-bubble" + (isSelf ? " is-self" : ""), "", false);
    bubble.appendChild(createNode("div", "wf-msg-author", sender, true));
    bubble.appendChild(createNode("div", "wf-msg-text", body, true));
    row.appendChild(avatar);
    row.appendChild(bubble);
    return row;
  }

  function createTaskCard(text) {
    var title = text.replace(/^task card:\s*/i, "").trim() || "Set up design system tokens";
    var card = createNode("div", "wf-task-card", "", false);
    card.appendChild(createNode("div", "wf-task-title", title, true));
    card.appendChild(createNode("div", "wf-task-desc", "Define color palette, typography scale, and spacing tokens.", true));

    var badges = createNode("div", "wf-task-badges", "", false);
    badges.appendChild(createNode("span", "wf-task-badge", "Done", true));
    badges.appendChild(createNode("span", "wf-task-badge", "High", true));
    card.appendChild(badges);
    return card;
  }

  function decorateMain(main, entries) {
    if (!main) return;
    var title = main.querySelector(".wf-block-title");
    var shellTitle = title ? title.textContent : "Main Area";
    var threadTitle = extractThreadTitle(entries);
    var hasDate = entries.some(function (entry) {
      return /today|feb|\d{1,2}:\d{2}/i.test(entry.text);
    });

    main.innerHTML = "";
    main.appendChild(createNode("div", "wf-block-title", shellTitle, false));

    var top = createNode("div", "wf-main-top", "", false);
    top.appendChild(createNode("span", "wf-main-icon", "☰", false));
    var heading = createNode("div", "wf-main-heading", "", false);
    heading.appendChild(createNode("div", "wf-main-title", threadTitle, true));
    heading.appendChild(createNode("div", "wf-main-sub", "3 members / 5 tasks", true));
    top.appendChild(heading);

    var actions = createNode("div", "wf-main-actions", "", false);
    actions.appendChild(createNode("span", "wf-main-user", "YO", true));
    actions.appendChild(createNode("span", "wf-main-user", "SC", true));
    actions.appendChild(createNode("span", "wf-main-user", "AR", true));
    actions.appendChild(createNode("span", "wf-main-bell", "4", true));
    top.appendChild(actions);
    main.appendChild(top);

    var body = createNode("div", "wf-main-body", "", false);
    if (hasDate) {
      body.appendChild(createNode("div", "wf-date-pill", "Today", true));
    }

    var hasComposer = false;
    var entriesUsed = 0;
    entries.forEach(function (entry) {
      var text = entry.text;
      var lower = text.toLowerCase();

      if (/thread:|today|members|tasks|active:|recent:|search|profile|quick actions|context|sidebar|thread list/i.test(lower)) {
        return;
      }

      if (/^task card:/i.test(text) || (/task card/i.test(lower) && /\+/.test(text))) {
        body.appendChild(createTaskCard(text));
        entriesUsed += 1;
        return;
      }

      if (/^toast:/i.test(text)) {
        body.appendChild(createNode("div", "wf-toast", text.replace(/^toast:\s*/i, ""), true));
        entriesUsed += 1;
        return;
      }

      if (/^input:|composer input:|message input|send:|input cleared/i.test(lower)) {
        hasComposer = true;
        var composerText = text.replace(/^input:\s*/i, "").replace(/^composer input:\s*/i, "").trim();
        var composer = createNode("div", "wf-composer", "", false);
        composer.appendChild(createNode("div", "wf-composer-plus", "+", false));
        composer.appendChild(createNode("div", "wf-composer-input", composerText || "Message or type '/' for commands...", true));
        composer.appendChild(createNode("div", "wf-composer-send", "➤", false));
        body.appendChild(composer);
        entriesUsed += 1;
        return;
      }

      var msg = text.match(/^([A-Za-z ]{2,24}):\s(.+)/);
      if (msg && !/status|priority|tags|title|search|result|thread name|selected type|due date/i.test(msg[1].toLowerCase())) {
        body.appendChild(createMessageRow(msg[1].trim(), msg[2].trim(), /^you$/i.test(msg[1].trim())));
        entriesUsed += 1;
        return;
      }

      body.appendChild(createNode("div", "wf-state-note", text, true));
      entriesUsed += 1;
    });

    if (!entriesUsed) {
      body.appendChild(createTaskCard("Task card: Set up design system tokens"));
      body.appendChild(createMessageRow("Sarah Chen", "I've started working on the design tokens.", false));
    }

    if (!hasComposer) {
      var fallbackComposer = createNode("div", "wf-composer", "", false);
      fallbackComposer.appendChild(createNode("div", "wf-composer-plus", "+", false));
      fallbackComposer.appendChild(createNode("div", "wf-composer-input", "Message or type '/' for commands...", true));
      fallbackComposer.appendChild(createNode("div", "wf-composer-send", "➤", false));
      body.appendChild(fallbackComposer);
    }

    main.appendChild(body);
  }

  function decoratePanel(panel, entries) {
    if (!panel) return;
    var title = panel.querySelector(".wf-block-title");
    var titleText = title ? title.textContent : "Panel";

    panel.innerHTML = "";
    panel.appendChild(createNode("div", "wf-block-title", titleText, false));

    var shell = createNode("div", "wf-panel-shell", "", false);
    var header = createNode("div", "wf-panel-header", "", false);
    header.appendChild(createNode("div", "wf-panel-title", titleText, true));
    header.appendChild(createNode("div", "wf-panel-action", "Mark all read", true));
    shell.appendChild(header);

    var list = createNode("div", "wf-panel-list", "", false);
    var visibleEntries = entries.filter(function (entry) {
      return !/no panel|unused|closed/i.test(entry.text.toLowerCase());
    });

    if (!visibleEntries.length) {
      list.appendChild(createNode("div", "wf-panel-empty", "No active panel in this step", true));
    } else {
      visibleEntries.forEach(function (entry) {
        var text = entry.text;
        var lower = text.toLowerCase();
        var row = createNode("div", "wf-panel-row", "", false);

        if (/^\/\w+/.test(text)) {
          row.classList.add("is-command");
          var cmd = splitByColon(text.replace(/\s+-\s+/, ": "));
          row.appendChild(createNode("div", "wf-panel-row-title", cmd.key || text.split(" ")[0], true));
          row.appendChild(createNode("div", "wf-panel-row-sub", cmd.value || "Command action", true));
        } else if (/assignment|completed|comment|due|ago|unread/i.test(lower)) {
          row.classList.add("is-notification");
          row.appendChild(createNode("div", "wf-panel-dot", "", false));
          row.appendChild(createNode("div", "wf-panel-row-title", text, true));
        } else {
          row.appendChild(createNode("div", "wf-panel-row-title", text, true));
        }
        list.appendChild(row);
      });
    }

    shell.appendChild(list);
    panel.appendChild(shell);
  }

  function enhanceWireframeApp(app) {
    var sidebar = app.querySelector(".wf-sidebar");
    var main = app.querySelector(".wf-main");
    var panel = app.querySelector(".wf-panel");
    decorateSidebar(sidebar, collectEntries(sidebar));
    decorateMain(main, collectEntries(main));
    decoratePanel(panel, collectEntries(panel));
  }

  function setupThreeViewportWireframes(root) {
    var mocks = root.querySelectorAll(".ui-mock");
    mocks.forEach(function (mock) {
      if (mock.querySelector(".wireframe-views")) return;
      var baseApp = mock.querySelector(".wireframe-app");
      if (!baseApp) return;

      var views = document.createElement("div");
      views.className = "wireframe-views";

      [
        { id: "desktop", label: "Desktop" },
        { id: "mobile", label: "Mobile" }
      ].forEach(function (device) {
        var viewport = document.createElement("section");
        viewport.className = "wireframe-viewport";
        viewport.setAttribute("data-device", device.id);

        var title = document.createElement("div");
        title.className = "wireframe-viewport-title";
        title.textContent = device.label;

        var clone = baseApp.cloneNode(true);
        clone.setAttribute("data-device-app", device.id);
        enhanceWireframeApp(clone);

        viewport.appendChild(title);
        viewport.appendChild(clone);
        views.appendChild(viewport);
      });

      baseApp.replaceWith(views);
    });
  }

  function setupWireframeControls(root) {
    var mocks = root.querySelectorAll(".ui-mock");
    mocks.forEach(function (mock) {
      var defaultClasses = mock.getAttribute("data-default-classes") || mock.className;
      var controls = mock.querySelector(".wireframe-controls");

      if (controls) {
        var resetButtonInControls = controls.querySelector("[data-reset-wireframe]");
        [
          { className: "hide-messages", label: "Messages" },
          { className: "hide-task-cards", label: "Task card" },
          { className: "hide-composer", label: "Composer" },
          { className: "hide-toast", label: "Toast" }
        ].forEach(function (entry) {
          if (controls.querySelector('[data-toggle-class="' + entry.className + '"]')) return;
          var btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = entry.label;
          btn.setAttribute("data-toggle-class", entry.className);
          if (resetButtonInControls) {
            controls.insertBefore(btn, resetButtonInControls);
          } else {
            controls.appendChild(btn);
          }
        });
      }

      mock.querySelectorAll("[data-toggle-class]").forEach(function (button) {
        var className = button.getAttribute("data-toggle-class");
        var labelMap = {
          "show-sidebar": "Show sidebar",
          "show-panel": "Show panel",
          "is-mobile": "Focus mobile",
          "hide-messages": "Messages",
          "hide-task-cards": "Task card",
          "hide-composer": "Composer",
          "hide-toast": "Toast"
        };
        if (labelMap[className]) button.textContent = labelMap[className];
        button.addEventListener("click", function () {
          mock.classList.toggle(className);
          button.classList.toggle("is-on", mock.classList.contains(className));
        });

        if (mock.classList.contains(className)) {
          button.classList.add("is-on");
        }
      });

      var resetButton = mock.querySelector("[data-reset-wireframe]");
      if (resetButton) {
        resetButton.addEventListener("click", function () {
          mock.className = defaultClasses;
          mock.querySelectorAll("[data-toggle-class]").forEach(function (button) {
            var className = button.getAttribute("data-toggle-class");
            button.classList.toggle("is-on", mock.classList.contains(className));
          });
        });
      }
    });
  }

  function setupStepNavigation(root) {
    var stepsContainer = root.querySelector("[data-flow-steps]");
    if (!stepsContainer) return;

    var cards = Array.from(stepsContainer.querySelectorAll(".step-card"));
    if (!cards.length) return;

    var prevButton = root.querySelector("[data-flow-prev]");
    var nextButton = root.querySelector("[data-flow-next]");
    var showAllCheckbox = root.querySelector("[data-flow-show-all]");
    var chipContainer = root.querySelector("[data-flow-index]");
    var statusNode = root.querySelector("[data-flow-status]");
    var activeIndex = 0;

    if (showAllCheckbox) {
      showAllCheckbox.checked = false;
    }

    if (chipContainer) {
      cards.forEach(function (card, idx) {
        var title = card.getAttribute("data-step-title") || ("Step " + (idx + 1));
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "flow-step-chip";
        chip.textContent = (idx + 1) + ". " + title;
        chip.title = title;
        chip.addEventListener("click", function () {
          activeIndex = idx;
          if (showAllCheckbox) showAllCheckbox.checked = false;
          render();
        });
        chipContainer.appendChild(chip);
      });
    }

    function render() {
      var showAll = showAllCheckbox ? showAllCheckbox.checked : false;

      cards.forEach(function (card, idx) {
        card.style.display = showAll || idx === activeIndex ? "block" : "none";
      });

      if (chipContainer) {
        var chips = chipContainer.querySelectorAll(".flow-step-chip");
        chips.forEach(function (chip, idx) {
          chip.classList.toggle("is-active", idx === activeIndex && !showAll);
        });
      }

      if (prevButton) prevButton.disabled = showAll || activeIndex === 0;
      if (nextButton) nextButton.disabled = showAll || activeIndex === cards.length - 1;

      if (statusNode) {
        var activeTitle = cards[activeIndex].getAttribute("data-step-title") || ("Step " + (activeIndex + 1));
        statusNode.textContent = showAll
          ? "Showing all " + cards.length + " steps"
          : "Step " + (activeIndex + 1) + " of " + cards.length + " - " + activeTitle;
      }
    }

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        activeIndex = Math.max(0, activeIndex - 1);
        render();
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        activeIndex = Math.min(cards.length - 1, activeIndex + 1);
        render();
      });
    }

    if (showAllCheckbox) {
      showAllCheckbox.addEventListener("change", render);
    }

    render();
  }

  var roots = document.querySelectorAll("[data-flow-root]");
  roots.forEach(function (root) {
    setupThreeViewportWireframes(root);
    setupStepNavigation(root);
    setupWireframeControls(root);
  });
})();
