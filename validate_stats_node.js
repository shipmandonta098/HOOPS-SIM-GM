#!/usr/bin/env node
/**
 * Basketball GM Simulator - Stats Distribution Validator
 * Tests the stat generation logic without needing a browser
 */

// Helper functions matching the HTML version
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function n0(x) {
  return Number.isFinite(x) ? x : 0;
}

function safeDiv(a, b) {
  return b > 0 ? a / b : 0;
}

function safePct(m, a) {
  return a > 0 ? (m / a * 100) : 0;
}

// Simulated distributeStats logic (core stat generation)
function generateTeamStats(teamOvr, won) {
  const baseMultiplier = teamOvr > 75 ? 1.08 : teamOvr > 65 ? 1.0 : 0.95;
  
  // Team-level shot pools
  let fga = randInt(80, 95);
  let tpa = randInt(25, 40);
  fga = Math.max(fga, tpa); // Ensure FGA >= 3PA
  let fta = randInt(18, 30);
  
  // Shooting percentages with variance
  let fg2Pct = randInt(470, 490) / 1000; // 47-49%
  let tp3Pct = randInt(330, 360) / 1000; // 33-36%
  let ftPct = randInt(760, 780) / 1000; // 76-78%
  
  // Calculate FGM from FGA and percentages
  let fgm = Math.round(fga * fg2Pct);
  let tpm = Math.round(tpa * tp3Pct);
  let ftm = Math.round(fta * ftPct);
  
  // Calculate points
  let pts = fgm * 2 - tpm * 2 + tpm * 3 + ftm; // FGM*2 - 2PM*2 + 3PM*3 + FTM
  pts = clamp(Math.round(pts * baseMultiplier), 100, 145);
  
  // Calculate rebounds
  let missedFG = n0(fga - fgm);
  let missedFT = n0(fta - ftm);
  let orbPct = 0.26; // 26% offensive rebound rate
  let orbAttempts = Math.round(missedFG * (1 - orbPct) + missedFT * orbPct);
  let orb = Math.round(randInt(10, 15)); // Offensive rebounds
  let drb = clamp(randInt(27, 40), 42 - orb, 55 - orb); // Defensive rebounds
  let reb = orb + drb;
  reb = clamp(reb, 42, 55);
  
  // Calculate assists and turnovers
  let ast = Math.round(fgm * 0.63); // 63% of FGM
  ast = clamp(ast, 20, 32);
  
  // Turnovers: 14% of possessions
  let possessions = fga + 0.44 * fta - 1.07 * (fga - fgm + fta - ftm) + 1.07 * ast;
  let tov = Math.round(possessions * 0.14);
  tov = clamp(tov, 11, 17);
  
  // Steals: 63% of turnovers
  let stl = Math.round(tov * 0.63);
  stl = clamp(stl, 6, 10);
  
  // Blocks: 6.5% of 2PA with floor 3
  let twoPA = fga - tpa;
  let blk = Math.round(twoPA * 0.065);
  blk = Math.max(blk, 3);
  blk = clamp(blk, 3, 7);
  
  return {
    PPG: +(pts / 1).toFixed(1),  // 1 game
    FGA: +(fga / 1).toFixed(1),
    'FG%': (safePct(fgm, fga)).toFixed(1),
    '3PA': +(tpa / 1).toFixed(1),
    '3P%': (safePct(tpm, tpa)).toFixed(1),
    FTA: +(fta / 1).toFixed(1),
    'FT%': (safePct(ftm, fta)).toFixed(1),
    RPG: +(reb / 1).toFixed(1),
    APG: +(ast / 1).toFixed(1),
    SPG: +(stl / 1).toFixed(1),
    BPG: +(blk / 1).toFixed(1),
    TOPG: +(tov / 1).toFixed(1)
  };
}

// Run validation
function validateStats(numGames = 14) {
  console.log('\\n' + '='.repeat(80));
  console.log('BASKETBALL GM SIMULATOR - STATS VALIDATION');
  console.log('='.repeat(80) + '\\n');
  
  // Simulate two teams over multiple games
  const teamAStats = { PPG: 0, FGA: 0, 'FG%': 0, '3PA': 0, '3P%': 0, FTA: 0, 'FT%': 0, RPG: 0, APG: 0, SPG: 0, BPG: 0, TOPG: 0 };
  const teamBStats = { PPG: 0, FGA: 0, 'FG%': 0, '3PA': 0, '3P%': 0, FTA: 0, 'FT%': 0, RPG: 0, APG: 0, SPG: 0, BPG: 0, TOPG: 0 };
  
  const teamAOvr = 75; // Decent team
  const teamBOvr = 70; // Average team
  
  console.log(`Simulating ${numGames} games...\\n`);
  
  let teamAWins = 0, teamBWins = 0;
  const gameResults = [];
  
  for (let i = 0; i < numGames; i++) {
    const gameA = generateTeamStats(teamAOvr, Math.random() < 0.55); // Team A wins ~55% of time
    const gameB = generateTeamStats(teamBOvr, teamAStats.PPG > teamBStats.PPG);
    
    // Accumulate stats
    Object.keys(gameA).forEach(key => {
      teamAStats[key] += parseFloat(gameA[key]);
      teamBStats[key] += parseFloat(gameB[key]);
    });
    
    gameResults.push({ teamA: gameA, teamB: gameB });
  }
  
  // Calculate per-game averages
  Object.keys(teamAStats).forEach(key => {
    teamAStats[key] = +(teamAStats[key] / numGames).toFixed(1);
    teamBStats[key] = +(teamBStats[key] / numGames).toFixed(1);
  });
  
  // Display results
  console.log('TEAM A (OVR: 75) - ' + numGames + ' GAME AVERAGE');
  console.log('-'.repeat(50));
  console.table([teamAStats]);
  
  console.log('\\nTEAM B (OVR: 70) - ' + numGames + ' GAME AVERAGE');
  console.log('-'.repeat(50));
  console.table([teamBStats]);
  
  // Validate ranges
  const targetRanges = {
    'PPG': [100, 125],
    'FGA': [80, 95],
    'FG%': [47, 49],
    '3PA': [25, 40],
    '3P%': [33, 36],
    'FTA': [18, 30],
    'FT%': [76, 78],
    'RPG': [42, 55],
    'APG': [20, 32],
    'SPG': [6, 10],
    'BPG': [3, 7],
    'TOPG': [11, 17]
  };
  
  console.log('\\n' + '='.repeat(80));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(80) + '\\n');
  
  let allInRange = true;
  
  const checkTeam = (teamName, stats) => {
    console.log(teamName + ':');
    let teamInRange = true;
    Object.entries(targetRanges).forEach(([stat, [min, max]]) => {
      const value = stats[stat];
      const inRange = value >= min && value <= max;
      const status = inRange ? '✓' : '✗';
      
      if (!inRange) {
        teamInRange = false;
        allInRange = false;
      }
      
      console.log(`  ${status} ${stat.padEnd(6)}: ${String(value).padEnd(7)} (Target: ${min}-${max})`);
    });
    return teamInRange;
  };
  
  const teamAInRange = checkTeam('TEAM A', teamAStats);
  console.log();
  const teamBInRange = checkTeam('TEAM B', teamBStats);
  
  console.log('\\n' + '='.repeat(80));
  if (allInRange) {
    console.log('✓ ALL STATS WITHIN RANGE - VALIDATION PASSED!');
  } else {
    console.log('✗ SOME STATS OUT OF RANGE - REQUIRES TUNING');
  }
  console.log('='.repeat(80) + '\\n');
  
  return { teamA: teamAStats, teamB: teamBStats, passed: allInRange };
}

// Run the validation
const results = validateStats(14);
process.exit(results.passed ? 0 : 1);
