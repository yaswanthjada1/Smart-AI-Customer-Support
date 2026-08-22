(function() {
  // Find script element and configuration
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const companyId = currentScript ? currentScript.getAttribute('data-company-id') : null;
  const apiHost = (currentScript ? currentScript.getAttribute('data-api-host') : null) || window.location.origin;

  if (!companyId) {
    console.error('[AeroRAG Widget] Missing data-company-id attribute on script tag.');
    return;
  }

  // Session handling
  let sessionId = localStorage.getItem('aerorag_session_' + companyId);
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('aerorag_session_' + companyId, sessionId);
  }

  // Default configuration
  let config = {
    bot_name: 'Support Assistant',
    welcome_message: 'Hello! How can I help you today?',
    primary_color: '#4f46e5',
    logo_url: null,
    company_name: 'Support'
  };

  let isOpen = false;
  let messages = [];

  // Create Container
  const container = document.createElement('div');
  container.id = 'aerorag-widget-container';
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  container.style.right = '24px';
  container.style.zIndex = '999999';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  document.body.appendChild(container);

  // Create Floating Launcher Button
  const launcher = document.createElement('button');
  launcher.id = 'aerorag-launcher';
  launcher.innerHTML = `
    <svg id="aerorag-icon-open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <svg id="aerorag-icon-close" style="display:none;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  launcher.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: ${config.primary_color};
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
    outline: none;
  `;
  launcher.addEventListener('mouseenter', () => launcher.style.transform = 'scale(1.08)');
  launcher.addEventListener('mouseleave', () => launcher.style.transform = 'scale(1)');
  container.appendChild(launcher);

  // Create Chat Window Box
  const chatWindow = document.createElement('div');
  chatWindow.id = 'aerorag-window';
  chatWindow.style.cssText = `
    display: none;
    position: absolute;
    bottom: 75px;
    right: 0;
    width: 380px;
    max-width: calc(100vw - 32px);
    height: 580px;
    max-height: calc(100vh - 120px);
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
    flex-direction: column;
    overflow: hidden;
    animation: aerorag-appear 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  container.appendChild(chatWindow);

  // Add Styles
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes aerorag-appear {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .aerorag-msg { margin-bottom: 12px; font-size: 13px; line-height: 1.5; }
    .aerorag-msg-user { align-self: flex-end; background: ${config.primary_color}; color: white; padding: 10px 14px; border-radius: 16px 16px 4px 16px; max-width: 80%; }
    .aerorag-msg-assistant { align-self: flex-start; background: #1e293b; color: #f1f5f9; padding: 12px 14px; border-radius: 16px 16px 16px 4px; max-width: 85%; border: 1px solid rgba(255,255,255,0.06); }
    .aerorag-citation { display: inline-flex; align-items: center; gap: 4px; background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 6px; padding: 2px 6px; font-size: 10px; font-weight: 500; margin-top: 6px; margin-right: 4px; }
  `;
  document.head.appendChild(style);

  // Render Chat Window Contents
  function renderChatWindow() {
    chatWindow.innerHTML = `
      <div style="padding: 16px; background: ${config.primary_color}; color: white; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
            ${config.logo_url ? `<img src="${config.logo_url}" style="width:100%;height:100%;border-radius:10px;object-fit:cover;"/>` : '🤖'}
          </div>
          <div>
            <div style="font-weight: 700; font-size: 14px;">${config.bot_name}</div>
            <div style="font-size: 11px; opacity: 0.85;">${config.company_name} Support</div>
          </div>
        </div>
        <button id="aerorag-close-btn" style="background: none; border: none; color: white; cursor: pointer; padding: 4px; border-radius: 6px;">✕</button>
      </div>

      <div id="aerorag-messages-container" style="flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #0b1329;">
        <!-- Messages render here -->
      </div>

      <div style="padding: 12px 14px; background: #0f172a; border-top: 1px solid #1e293b; display: flex; gap: 8px;">
        <input id="aerorag-input" type="text" placeholder="Ask a question..." style="flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 10px 14px; color: white; font-size: 13px; outline: none;" />
        <button id="aerorag-send-btn" style="background: ${config.primary_color}; border: none; border-radius: 12px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    `;

    document.getElementById('aerorag-close-btn').addEventListener('click', toggleWidget);
    document.getElementById('aerorag-send-btn').addEventListener('click', sendMessage);
    document.getElementById('aerorag-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    renderMessages();
  }

  function renderMessages() {
    const container = document.getElementById('aerorag-messages-container');
    if (!container) return;

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="aerorag-msg aerorag-msg-assistant">
          ${config.welcome_message}
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(m => {
      if (m.role === 'user') {
        return `<div class="aerorag-msg aerorag-msg-user">${escapeHtml(m.content)}</div>`;
      }

      let citationsHtml = '';
      if (m.sources && m.sources.length > 0) {
        citationsHtml = '<div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px;">' +
          m.sources.map(s => `<span class="aerorag-citation">📄 ${escapeHtml(s.document)}${s.page ? ' (p.' + s.page + ')' : ''}</span>`).join('') +
          '</div>';
      }

      let escalationHtml = '';
      if (m.escalation_required) {
        escalationHtml = `
          <div style="margin-top: 10px; padding: 8px 10px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; font-size: 11px; color: #fbbf24; display: flex; align-items: center; justify-content: space-between;">
            <span>Support agent assistance requested</span>
            <span style="font-weight: bold; text-decoration: underline; cursor: pointer;">Ticket #AF-${Math.floor(1000 + Math.random()*9000)}</span>
          </div>
        `;
      }

      return `
        <div class="aerorag-msg aerorag-msg-assistant">
          <div>${escapeHtml(m.content)}</div>
          ${citationsHtml}
          ${escalationHtml}
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function sendMessage() {
    const input = document.getElementById('aerorag-input');
    const question = input.value.trim();
    if (!question) return;

    input.value = '';
    messages.push({ role: 'user', content: question });
    renderMessages();

    // Add loading placeholder
    const loadingId = 'loading-' + Date.now();
    const container = document.getElementById('aerorag-messages-container');
    const loadingElem = document.createElement('div');
    loadingElem.id = loadingId;
    loadingElem.className = 'aerorag-msg aerorag-msg-assistant';
    loadingElem.style.opacity = '0.7';
    loadingElem.innerHTML = 'Thinking & searching knowledge base...';
    container.appendChild(loadingElem);
    container.scrollTop = container.scrollHeight;

    try {
      const res = await fetch(`${apiHost}/api/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          session_id: sessionId,
          message: question,
        }),
      });

      const data = await res.json();
      const loadElem = document.getElementById(loadingId);
      if (loadElem) loadElem.remove();

      if (res.ok) {
        messages.push({
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
          escalation_required: data.escalation_required || false,
        });
      } else {
        messages.push({
          role: 'assistant',
          content: data.error || 'Unable to complete request. Please try again.',
          sources: [],
          escalation_required: true,
        });
      }
      renderMessages();
    } catch (err) {
      const loadElem = document.getElementById(loadingId);
      if (loadElem) loadElem.remove();
      messages.push({
        role: 'assistant',
        content: 'Connection error. Please check your network and try again.',
        sources: [],
        escalation_required: true,
      });
      renderMessages();
    }
  }

  function toggleWidget() {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    document.getElementById('aerorag-icon-open').style.display = isOpen ? 'none' : 'block';
    document.getElementById('aerorag-icon-close').style.display = isOpen ? 'block' : 'none';

    if (isOpen) {
      setTimeout(() => {
        const input = document.getElementById('aerorag-input');
        if (input) input.focus();
      }, 100);
    }
  }

  launcher.addEventListener('click', toggleWidget);

  // Fetch Public Configuration
  fetch(`${apiHost}/api/public/config/${companyId}`)
    .then(r => r.json())
    .then(data => {
      if (data && !data.error) {
        config = { ...config, ...data };
        launcher.style.background = config.primary_color;
        renderChatWindow();
      } else {
        renderChatWindow();
      }
    })
    .catch(() => {
      renderChatWindow();
    });
})();
