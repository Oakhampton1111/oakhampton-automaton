(() => {
  const services = [{"id":"workflow-repair","name":"Workflow Repair","price":"AUD $995","description":"Repair an n8n, Make, Zapier, webhook or API workflow","keywords":["workflow","n8n","make","zapier","webhook","retry"]},{"id":"openclaw-deployment","name":"OpenClaw Production Recovery","price":"AUD $995","description":"Recover an OpenClaw, Docker, connector, routing or VPS deployment","keywords":["openclaw","docker","vps","connector","routing"]},{"id":"document-automation","name":"Document Automation Pilot","price":"AUD $1,495","description":"Automate PDF, invoice, spreadsheet and document extraction workflows","keywords":["document","pdf","invoice","extract","spreadsheet","ocr"]},{"id":"api-integration","name":"API Integration Pilot","price":"AUD $1,495","description":"Connect CRMs, email, storage, databases and internal tools","keywords":["api","integrat","crm","hubspot","salesforce","database"]},{"id":"automation-diagnosis","name":"Automation Diagnosis","price":"AUD $495","description":"Map one manual process and identify the smallest useful automation","keywords":["manual","diagnos","process","assess","plan"]},{"id":"custom-agent","name":"Custom Agent Prototype","price":"AUD $1,995","description":"Prototype a persistent research, monitoring or operational agent","keywords":["agent","monitor","research","autonomous","customer service"]}];
  let open = false;

  const escapeHtml = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );

  const style = document.createElement("style");
  style.textContent =
    ".oak-chat-launch{position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:999px;padding:14px 18px;background:#102638;color:#fff;font:700 15px system-ui;box-shadow:0 12px 36px #10263844;cursor:pointer}.oak-chat{position:fixed;right:22px;bottom:82px;width:min(390px,calc(100vw - 28px));max-height:640px;z-index:9999;background:#fff;border:1px solid #dce5e9;border-radius:18px;box-shadow:0 24px 80px #10263833;display:none;overflow:hidden;font:14px/1.5 system-ui;color:#102638}.oak-chat.on{display:block}.oak-head{padding:18px;background:#102638;color:#fff}.oak-head strong{display:block;font-size:18px}.oak-body{padding:16px;max-height:440px;overflow:auto}.oak-msg{padding:11px 13px;border-radius:12px;background:#f2f6f6;margin:0 0 10px}.oak-options{display:grid;gap:8px}.oak-options button,.oak-send{border:1px solid #d3e0e3;background:#fff;padding:10px;border-radius:9px;text-align:left;cursor:pointer;font-weight:700}.oak-input{display:flex;gap:8px;padding:12px;border-top:1px solid #dce5e9}.oak-input input{flex:1;padding:10px;border:1px solid #aebcc3;border-radius:8px}.oak-send{background:#087c78;color:#fff;text-align:center}.oak-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.oak-actions a{padding:9px 11px;border-radius:8px;background:#102638;color:#fff;text-decoration:none;font-weight:700}.oak-note{font-size:11px;color:#667681;margin-top:10px}";
  document.head.appendChild(style);

  const launch = document.createElement("button");
  launch.className = "oak-chat-launch";
  launch.textContent = "Need help choosing?";
  launch.setAttribute("aria-label", "Open service concierge");
  launch.setAttribute("aria-expanded", "false");

  const box = document.createElement("aside");
  box.className = "oak-chat";
  box.setAttribute("aria-live", "polite");
  box.setAttribute("aria-label", "Oakhampton service concierge");
  box.innerHTML =
    '<div class="oak-head"><strong>Oakhampton Concierge</strong><span>Find the smallest suitable service</span></div><div class="oak-body" id="oakBody"><div class="oak-msg">What are you trying to fix or automate? Choose a category or describe the outcome below.</div><div class="oak-options" id="oakOptions"></div><div class="oak-note">Do not enter passwords, private keys or sensitive documents.</div></div><div class="oak-input"><input id="oakInput" maxlength="500" aria-label="Describe the outcome" placeholder="e.g. My n8n workflow creates duplicates"><button class="oak-send" id="oakSend">Send</button></div>';
  document.body.append(launch, box);

  const body = box.querySelector("#oakBody");
  const options = box.querySelector("#oakOptions");
  const input = box.querySelector("#oakInput");

  function track(action, offerId = "") {
    fetch("/api/commerce/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "concierge_event",
        offerId,
        source: new URLSearchParams(location.search).get("utm_source") || "direct",
        campaign: new URLSearchParams(location.search).get("campaign") || "",
        action,
        landing: location.pathname,
      }),
    }).catch(() => {});
  }

  function recommend(service) {
    options.style.display = "none";
    body.insertAdjacentHTML(
      "beforeend",
      `<div class="oak-msg"><strong>${escapeHtml(service.name)}</strong><br>${escapeHtml(service.description)}<br><strong>${escapeHtml(service.price)}</strong><div class="oak-actions"><a href="/automation-services/${encodeURIComponent(service.id)}/example/">View example</a><a href="/automation-services/agent-desk/?offer=${encodeURIComponent(service.id)}&source=concierge&campaign=guided">Choose and pay</a></div></div>`,
    );
    body.scrollTop = body.scrollHeight;
    track("recommend", service.id);
  }

  services.forEach((service) => {
    const button = document.createElement("button");
    button.textContent = service.name;
    button.addEventListener("click", () => recommend(service));
    options.appendChild(button);
  });

  function classify() {
    const query = input.value.trim().toLowerCase();
    if (!query) return;
    const best = services
      .map((service) => [
        service,
        service.keywords.reduce(
          (score, keyword) => score + (query.includes(keyword) ? 1 : 0),
          0,
        ),
      ])
      .sort((a, b) => b[1] - a[1])[0];
    body.insertAdjacentHTML(
      "beforeend",
      `<div class="oak-msg"><strong>You:</strong> ${escapeHtml(query)}</div>`,
    );
    input.value = "";
    if (best[1]) {
      recommend(best[0]);
    } else {
      body.insertAdjacentHTML(
        "beforeend",
        '<div class="oak-msg">This needs a short scope. Send a non-sensitive brief and we will identify the smallest useful deliverable.<div class="oak-actions"><a href="/automation-services/agent-desk/#request">Request scope</a><a href="/automation-services/book/">Book a project call</a></div></div>',
      );
      track("custom_scope");
    }
  }

  launch.addEventListener("click", () => {
    open = !open;
    box.classList.toggle("on", open);
    launch.textContent = open ? "Close" : "Need help choosing?";
    launch.setAttribute("aria-expanded", String(open));
    if (open) {
      input.focus();
      track("open");
    }
  });
  box.querySelector("#oakSend").addEventListener("click", classify);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") classify();
  });
})();
