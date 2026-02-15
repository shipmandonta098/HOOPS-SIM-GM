/**
 * Tendencies UI Injector
 * Patches the playerDetailCard function to display tendencies
 * This file should be loaded after index.html in a <script> tag
 */

(function() {
  // Wait for the app to be ready
  setTimeout(function() {
    // Check if playerDetailCard is defined
    if (typeof window.playerDetailCard !== 'function') {
      console.warn('[Tendencies UI] playerDetailCard not found');
      return;
    }
    
    // Store original function
    const originalPlayerDetailCard = window.playerDetailCard;
    
    // Override with tendencies-aware version
    window.playerDetailCard = function(playerId) {
      // Get original HTML
      const originalHTML = originalPlayerDetailCard.call(this, playerId);
      
      // Find the tendencies section if it doesn't exist
      if (originalHTML.includes('Player Tendencies')) {
        // Already has tendencies
        return originalHTML;
      }
      
      // Get player data
      const p = window.state && window.state.league ? window.state.league.players.find(x => x.id === playerId) : null;
      if (!p) {
        console.warn('[Tendencies UI] Player not found:', playerId);
        return originalHTML;
      }
      
      if (!p.tendencies) {
        console.warn('[Tendencies UI] No tendencies on player:', p.firstName, p.lastName);
        return originalHTML;
      }
      
      if (p.tendencies.shot3Freq === undefined) {
        console.warn('[Tendencies UI] Tendencies not initialized for player:', p.firstName, p.lastName);
        console.log('Tendencies object:', p.tendencies);
        return originalHTML;
      }
      
      // Inject tendencies section into HTML
      const tendenciesHTML = `
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
          `;
      
      // Try multiple patterns to find the right insertion point
      // Pattern 1: Look for last </div> closing
      let result = originalHTML.replace(/(\s*)<\/div>\s*<\/div>\s*<\/div>\s*$/m, tendenciesHTML + '$1</div>\n        </div>\n      </div>');
      
      if (result === originalHTML) {
        // Pattern didn't match, try simpler approach: insert before last `</div></div></div>`
        const lastDivIndex = originalHTML.lastIndexOf('</div>\n        </div>\n      </div>');
        if (lastDivIndex !== -1) {
          result = originalHTML.substring(0, lastDivIndex) + tendenciesHTML + originalHTML.substring(lastDivIndex);
          console.log('[Tendencies UI] Injected using position-based method');
        } else {
          console.warn('[Tendencies UI] Could not find insertion point in HTML');
          return originalHTML;
        }
      } else {
        console.log('[Tendencies UI] Injected using regex method');
      }
      
      return result;
    };
    
    console.log('[Tendencies UI] Successfully patched playerDetailCard function');
  }, 100);
})();
