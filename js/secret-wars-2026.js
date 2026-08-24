/* Multiverse D616 — Charactermancer Site
 * Secret Wars 2026 compatibility layer
 * Site v0.0.18 / Multiverse-D616 v0.1.76
 */
(function(){
  'use strict';

  const SITE_VERSION = '0.0.18';
  const SYSTEM_VERSION = '0.1.76';

  function stampSystemVersion(document){
    if (!document || typeof document !== 'object') return document;

    try {
      document._stats = document._stats || {};
      document._stats.systemId = 'multiverse-d616';
      document._stats.systemVersion = SYSTEM_VERSION;

      if (document._stats.exportSource) {
        document._stats.exportSource.systemId = 'multiverse-d616';
        document._stats.exportSource.systemVersion = SYSTEM_VERSION;
      }
    } catch (_) {}

    if (Array.isArray(document.items)) {
      for (const item of document.items) stampSystemVersion(item);
    }

    return document;
  }

  function enforceOriginMinimumRank(root, app){
    if (!root || !app) return;

    const rank = Number(app.state?.rank ?? 1) || 1;
    const origins = Array.from(app.state?.data?.origins || []);
    const byName = new Map(
      origins.map(origin => [String(origin?.name || '').trim().toLowerCase(), origin])
    );

    for (const row of root.querySelectorAll('.mmc-pwr')) {
      const name = String(row.querySelector('.name')?.textContent || '').trim().toLowerCase();
      const origin = byName.get(name);
      if (!origin) continue;

      const minimumRank = Number(origin.system?.minimumRank ?? 0) || 0;
      if (!minimumRank || rank >= minimumRank) continue;

      const button = row.querySelector('button[data-pick], button.mmc-btn');
      if (!button) continue;

      button.disabled = true;
      button.removeAttribute('data-pick');
      button.textContent = `Rank ${minimumRank}`;
      button.title = `Requer Rank ${minimumRank}`;
    }
  }

  function install(app){
    if (!app || app.__secretWars2026Installed) return;
    app.__secretWars2026Installed = true;

    // The site used to force v0.1.51 in exported Foundry JSONs.
    // Keep the existing exporter intact, then normalize the resulting Actor and embedded Items
    // to the current Multiverse-D616 version.
    if (typeof app._buildFoundryActorJson === 'function') {
      const originalBuildFoundryActorJson = app._buildFoundryActorJson.bind(app);
      app._buildFoundryActorJson = function(...args){
        return stampSystemVersion(originalBuildFoundryActorJson(...args));
      };
    }

    // Enforce minimumRank on Origins. Secret Wars adds Weird Science: Power Cosmic,
    // which is only available to Rank 5+ characters.
    if (typeof app._renderListStep === 'function') {
      const originalRenderListStep = app._renderListStep.bind(app);
      app._renderListStep = function(kind, ...args){
        const result = originalRenderListStep(kind, ...args);
        if (kind === 'origin') enforceOriginMinimumRank(result, app);
        return result;
      };
    }

    // If the user is already on the Origin step when this layer installs, refresh once.
    try {
      if (app.steps?.[app.step] === 'origin') app.render(true);
    } catch (_) {}
  }

  function updateVersionLabel(){
    const version = document.getElementById('version');
    if (version) version.textContent = `v${SITE_VERSION} • D616 v${SYSTEM_VERSION} • Secret Wars 2026`;
  }

  function boot(){
    if (window.mmcApp) {
      install(window.mmcApp);
      updateVersionLabel();
      return;
    }

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (window.mmcApp) {
        clearInterval(timer);
        install(window.mmcApp);
        updateVersionLabel();
      } else if (tries >= 100) {
        clearInterval(timer);
      }
    }, 50);
  }

  window.MMC_SECRET_WARS_2026 = Object.freeze({
    siteVersion: SITE_VERSION,
    systemVersion: SYSTEM_VERSION,
    source: 'Marvel Multiverse RPG — Secret Wars Expansion (2026)'
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
