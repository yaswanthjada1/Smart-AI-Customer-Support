/**
 * AeroRAG Embeddable Customer Support AI Widget
 * Lightweight, zero-dependency embed script that injects a floating button and responsive iframe.
 */
(function() {
  // Prevent multiple initializations
  if (window.__AERORAG_WIDGET_INITIALIZED__) return;
  window.__AERORAG_WIDGET_INITIALIZED__ = true;

  // 1. Locate the invoking script element & extract attributes
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.includes('widget.js')) return scripts[i];
    }
    return scripts[scripts.length - 1];
  })();

  if (!currentScript) {
    console.error('[AeroRAG Widget] Unable to locate script tag.');
    return;
  }

  const companyId = currentScript.getAttribute('data-company-id');
  if (!companyId) {
    console.error('[AeroRAG Widget] Missing required data-company-id attribute on widget script tag.');
    return;
  }

  // Derive widget base URL from script source or current origin
  let widgetBaseUrl = '';
  try {
    const scriptUrl = new URL(currentScript.src, window.location.href);
    widgetBaseUrl = scriptUrl.origin;
  } catch (e) {
    widgetBaseUrl = window.location.origin;
  }

  const customBaseUrl = currentScript.getAttribute('data-widget-url');
  if (customBaseUrl) {
    widgetBaseUrl = customBaseUrl.replace(/\/+$/, '');
  }

  let isOpen = false;

  // 2. Create Outer Widget Host Container (Zero host style interference)
  const container = document.createElement('div');
  container.id = 'aerorag-root';
  container.style.cssText = `
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    z-index: 2147483647 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    line-height: normal !important;
  `;
  document.body.appendChild(container);

  // 3. Create Iframe Element
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'aerorag-iframe-wrapper';
  iframeContainer.style.cssText = `
    display: none;
    position: absolute !important;
    bottom: 72px !important;
    right: 0 !important;
    width: 380px !important;
    max-width: calc(100vw - 32px) !important;
    height: 600px !important;
    max-height: calc(100vh - 100px) !important;
    border-radius: 18px !important;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08) !important;
    overflow: hidden !important;
    background: #ffffff !important;
    opacity: 0;
    transform: translateY(12px) scale(0.96);
    transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  const iframe = document.createElement('iframe');
  iframe.id = 'aerorag-chat-iframe';
  iframe.src = `${widgetBaseUrl}/widget?companyId=${encodeURIComponent(companyId)}`;
  iframe.title = 'AeroRAG AI Support Assistant';
  iframe.style.cssText = `
    width: 100% !important;
    height: 100% !important;
    border: none !important;
    outline: none !important;
    background: transparent !important;
    display: block !important;
  `;
  iframe.setAttribute('allow', 'clipboard-write');
  iframeContainer.appendChild(iframe);
  container.appendChild(iframeContainer);

  // 4. Create Floating Launcher Button
  const launcher = document.createElement('button');
  launcher.id = 'aerorag-launcher-btn';
  launcher.setAttribute('aria-label', 'Open Customer Support Chat');
  launcher.innerHTML = `
    <div id="aerorag-icon-chat" style="display:flex;align-items:center;justify-content:center;transition:transform 0.2s ease;">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </div>
    <div id="aerorag-icon-close" style="display:none;align-items:center;justify-content:center;transition:transform 0.2s ease;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
  `;

  launcher.style.cssText = `
    width: 58px !important;
    height: 58px !important;
    border-radius: 50% !important;
    background: #4f46e5 !important;
    color: #ffffff !important;
    border: none !important;
    cursor: pointer !important;
    box-shadow: 0 8px 24px -4px rgba(79, 70, 229, 0.45), 0 4px 10px rgba(0, 0, 0, 0.1) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease !important;
    outline: none !important;
    padding: 0 !important;
    margin: 0 !important;
  `;

  launcher.addEventListener('mouseenter', () => {
    launcher.style.transform = 'scale(1.08)';
  });
  launcher.addEventListener('mouseleave', () => {
    launcher.style.transform = 'scale(1)';
  });

  container.appendChild(launcher);

  // 5. Open / Close Toggle Logic
  function toggleWidget(forceState) {
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;

    const chatIcon = document.getElementById('aerorag-icon-chat');
    const closeIcon = document.getElementById('aerorag-icon-close');

    if (isOpen) {
      iframeContainer.style.display = 'block';
      // Trigger animation frame for smooth CSS transition
      requestAnimationFrame(() => {
        iframeContainer.style.opacity = '1';
        iframeContainer.style.transform = 'translateY(0) scale(1)';
      });

      if (chatIcon) chatIcon.style.display = 'none';
      if (closeIcon) closeIcon.style.display = 'flex';
      launcher.setAttribute('aria-label', 'Close Customer Support Chat');

      // Notify iframe that it is open
      try {
        iframe.contentWindow.postMessage({ type: 'aerorag:state_change', isOpen: true }, '*');
      } catch (e) {}
    } else {
      iframeContainer.style.opacity = '0';
      iframeContainer.style.transform = 'translateY(12px) scale(0.96)';

      setTimeout(() => {
        if (!isOpen) iframeContainer.style.display = 'none';
      }, 220);

      if (chatIcon) chatIcon.style.display = 'flex';
      if (closeIcon) closeIcon.style.display = 'none';
      launcher.setAttribute('aria-label', 'Open Customer Support Chat');

      try {
        iframe.contentWindow.postMessage({ type: 'aerorag:state_change', isOpen: false }, '*');
      } catch (e) {}
    }
  }

  launcher.addEventListener('click', () => toggleWidget());

  // 6. Listen for postMessage from Iframe (e.g. close button inside iframe or theme color update)
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'aerorag:close') {
      toggleWidget(false);
    } else if (event.data.type === 'aerorag:set_primary_color' && event.data.color) {
      launcher.style.background = event.data.color;
      launcher.style.boxShadow = `0 8px 24px -4px ${event.data.color}66, 0 4px 10px rgba(0, 0, 0, 0.1)`;
    }
  });

  // 7. Inject Mobile Responsiveness CSS for Host Page
  const responsiveStyle = document.createElement('style');
  responsiveStyle.innerHTML = `
    @media (max-width: 480px) {
      #aerorag-iframe-wrapper {
        position: fixed !important;
        top: 10px !important;
        left: 10px !important;
        right: 10px !important;
        bottom: 80px !important;
        width: calc(100vw - 20px) !important;
        height: calc(100vh - 90px) !important;
        max-width: none !important;
        max-height: none !important;
        border-radius: 16px !important;
      }
    }
  `;
  document.head.appendChild(responsiveStyle);
})();
