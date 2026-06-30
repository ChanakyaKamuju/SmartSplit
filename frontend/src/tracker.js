(function () {
  const CONFIG = {
    endpoint: "http://localhost:5000/api/events",
    sessionKey: "cf_session_id",
  };
  const getSessionId = () => {
    let sid = localStorage.getItem(CONFIG.sessionKey);
    if (!sid) {
      sid = "sn_" + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem(CONFIG.sessionKey, sid);
    }
    return sid;
  };
  const sendEvent = (type, metadata = {}) => {
    const payload = {
      sessionId: getSessionId(),
      eventType: type,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      referrer: document.referrer || "direct",
      ...metadata,
    };
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      navigator.sendBeacon(CONFIG.endpoint, blob);
    } else {
      fetch(CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => console.error("Event send error:", err));
    }
  };

  // Track page views
  window.addEventListener("load", () => sendEvent("page_view"));
  // Track clicks
  window.addEventListener("click", (e) => {
    const target = e.target;
    sendEvent("click", {
      x: e.clientX,
      y: e.clientY,
      target: target.tagName,
    });
  });
})();
