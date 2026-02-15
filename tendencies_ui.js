/**
 * Tendencies UI Injector
 * Directly patches the playerDetailCard function to include tendencies
 */

(function() {
  console.log('[Tendencies UI] Script loaded');

  // Wait a bit for app to initialize
  setTimeout(function() {
    if (typeof window.playerDetailCard !== 'function') {
      console.warn('[Tendencies UI] playerDetailCard not found yet');
      return;
    }
    
    const originalFunc = window.playerDetailCard;
    
    window.playerDetailCard = function(playerId) {
      const p = window.state?.league?.players?.find(x => x.id === playerId);
      if (!p) return originalFunc.call(this, playerId);
      
      // Check if player has tendencies
      if (!p.tendencies || p.tendencies.shot3Freq === undefined) {
        console.warn('[Tendencies UI] Player has no tendencies:', p.firstName, p.lastName);
        return originalFunc.call(this, playerId);
      }
      
      // Build HTML with tendencies included
      const t = window.teamById?.(p.teamId);
      const logoSvg = t?.color ? window.generateTeamLogo?.(t.abbrev, t.color, 28) : '';
      const playerName = window.playerName?.(p) || `${p.firstName} ${p.lastName}`;
      const money = window.money?.(p.salary) || '$' + p.salary;
      const escapeHtml = window.escapeHtml || (x => x);
      
      const html = `
        <div class="card">
          <div class="hd">
            <h2>${escapeHtml(playerName)} <span class="tag">${p.pos}</span></h2>
            <div class="hint">${logoSvg} ${escapeHtml(t?.name || 'Team')} · Salary ${money}</div>
          </div>
          <div class="bd">
            <div class="kpis">
              <div class="kpi"><div class="label">OVR</div><div class="value">${p.ovr}</div><div class="delta">Overall rating</div></div>
              <div class="kpi"><div class="label">POT</div><div class="value">${p.pot}</div><div class="delta">Potential</div></div>
              <div class="kpi"><div class="label">Mood</div><div class="value">${p.mood}</div><div class="delta">0–100</div></div>
              <div class="kpi"><div class="label">Stamina</div><div class="value">${p.stamina}</div><div class="delta">0–100</div></div>
            </div>

            <div style="margin-top:14px; line-height:1.7;" class="muted">
              Age: <b>${p.age}</b><br/>
              Games: <b>${p.stats?.gp || 0}</b><br/>
              Totals: <b>${p.stats?.pts || 0}</b> PTS · <b>${p.stats?.reb || 0}</b> REB · <b>${p.stats?.ast || 0}</b> AST<br/>
            </div>
            
            <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--line);">
              <h4 style="margin-bottom:8px; font-weight:600; color:var(--accent);">Player Tendencies (0–100)</h4>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; line-height:1.8;">
                <div>Shot 3-Freq: <b>${p.tendencies.shot3Freq}</b></div>
                <div>Shot Rim-Freq: <b>${p.tendencies.shotRimFreq}</b></div>
                <div>Shot Mid-Freq: <b>${p.tendencies.shotMidFreq}</b></div>
                <div>Pass Freq: <b>${p.tendencies.passFreq}</b></div>
                <div>Drive Freq: <b>${p.tendencies.driveFreq}</b></div>
                <div>Foul Draw: <b>${p.tendencies.foulDrawFreq}</b></div>
                <div>Steal Freq: <b>${p.tendencies.stealFreq}</b></div>
                <div>Block Freq: <b>${p.tendencies.blockFreq}</b></div>
                <div>OReb Freq: <b>${p.tendencies.offRebFreq}</b></div>
                <div>DReb Freq: <b>${p.tendencies.defRebFreq}</b></div>
                <div>TO Risk: <b>${p.tendencies.turnoverRisk}</b></div>
                <div>Usage Rate: <b>${p.tendencies.usage}</b></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      console.log('[Tendencies UI] Rendered tendencies for:', p.firstName, p.lastName);
      return html;
    };
    
    console.log('[Tendencies UI] ✅ Successfully patched playerDetailCard');
  }, 200);
})();
