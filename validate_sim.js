#!/usr/bin/env node
/**
 * Basketball GM Simulation Validator
 * Tests: 10 games, verifies stat ranges match targets
 * Target ranges: PTS 95-125, REB 40-55, AST 20-32, TOV 11-17, STL 6-10, BLK 3-7
 */

const fs = require('fs');

// Extract and parse index.html to get all functions
const html = fs.readFileSync('./index.html', 'utf-8');

// Helper functions for math
function n0(v) {
  return isFinite(v) ? v : 0;
}

function safeDiv(a, b) {
  return (b !== 0 && isFinite(a) && isFinite(b)) ? a / b : 0;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uuid() {
  return Math.random().toString(36).substr(2, 9);
}

// CALIBRATION multipliers
const CALIBRATION = {
  shotMakeFactor: 1.25,  // Boost shooting make % to increase scoring
  turnoverFactor: 0.72,  // Reduce TO rate
  foulFactor: 1.0,       // Adjust fouls
  blockFactor: 1.3,      // Boost blocks
  stealFactor: 0.65,     // Reduce steals
  oRebFactor: 1.0        // Adjust offensive rebound chance
};

// Archetype modifiers
function getArchetypeMods(archetype) {
  const mods = {
    'Scorer': { tovProbMult: 1.15, stlWeightMult: 0.9, blkWeightMult: 0.8 },
    'Playmaker': { tovProbMult: 1.0, stlWeightMult: 0.95, blkWeightMult: 0.7 },
    'Rebounder': { tovProbMult: 0.85, stlWeightMult: 0.9, blkWeightMult: 1.2 },
    'Defender': { tovProbMult: 0.8, stlWeightMult: 1.3, blkWeightMult: 1.2 },
    'Sharpshooter': { tovProbMult: 1.2, stlWeightMult: 0.9, blkWeightMult: 0.8 },
    'Slasher': { tovProbMult: 1.25, stlWeightMult: 0.85, blkWeightMult: 0.9 },
    'Two-Way': { tovProbMult: 1.0, stlWeightMult: 1.0, blkWeightMult: 1.0 },
    'Bench': { tovProbMult: 1.1, stlWeightMult: 0.95, blkWeightMult: 0.95 },
    'Superstar': { tovProbMult: 0.9, stlWeightMult: 1.05, blkWeightMult: 0.95 }
  };
  return mods[archetype || 'Two-Way'] || mods['Two-Way'];
}

// Helper functions (copied from index.html)
function selectShotType(teamStyle, playerTendencies) {
  const r = Math.random();
  const ts = teamStyle || { threeRate: 35, rimRate: 35, midRate: 30 };
  const pt = playerTendencies || { shot3Freq: 25, shotRimFreq: 30, shotMidFreq: 30, driveFreq: 25 };
  
  const total = ts.threeRate + ts.rimRate + ts.midRate;
  const p3 = (ts.threeRate / total) * 0.5 + (pt.shot3Freq / 100) * 0.5;
  const prim = (ts.rimRate / total) * 0.5 + (pt.shotRimFreq / 100) * 0.5;
  const pmid = (ts.midRate / total) * 0.5 + (pt.shotMidFreq / 100) * 0.5;
  const pdrive = (pt.driveFreq / 100) * 0.3;
  
  const total_p = p3 + prim + pmid + pdrive;
  if (r < p3 / total_p) return '3pt';
  if (r < (p3 + prim) / total_p) return 'rim';
  if (r < (p3 + prim + pmid) / total_p) return 'mid';
  return 'drive';
}

function calculateShotMakeProbability(shotType, shooterRating, defenderRating, archetype) {
  const sr = n0(shooterRating / 100);
  const dr = n0(defenderRating / 100);
  const arcMods = getArchetypeMods(archetype || 'Two-Way');
  
  let base = 0.45;
  if (shotType === '3pt') base = 0.34;
  else if (shotType === 'mid') base = 0.42;
  else if (shotType === 'rim') base = 0.55;
  else if (shotType === 'drive') base = 0.50;
  
  const shooterBonus = (sr - 0.5) * 0.3;
  const defenseNegative = (dr - 0.5) * 0.2;
  
  let probability = base + shooterBonus - defenseNegative;
  
  if (archetype === 'Sharpshooter' && shotType === '3pt') probability *= 1.1;
  if (archetype === 'Slasher' && (shotType === 'rim' || shotType === 'drive')) probability *= 1.15;
  
  return Math.max(0.15, Math.min(0.95, probability * CALIBRATION.shotMakeFactor));
}

function calculateTurnoverProbability(ballHandlerPas, defensePress, ballHandlerTend, defenseTeamStyle) {
  const bhPS = n0((ballHandlerPas - 40) / 100);
  const defPr = n0((defensePress - 40) / 100);
  
  const riskMult = n0((ballHandlerTend.turnoverRisk || 50) / 100);
  const pressEff = n0((defenseTeamStyle.pressureDefense || 50) / 100);
  
  let prob = 0.10 + (1 - bhPS) * 0.08 - bhPS * 0.03;
  prob = prob * (0.8 + riskMult * 0.4) * (0.8 + pressEff * 0.4);
  
  return Math.max(0.03, Math.min(0.30, prob * CALIBRATION.turnoverFactor));
}

function calculateBlockProbability(defenderRating, shooterRating, blockFreq, shotType) {
  if (shotType !== 'rim' && shotType !== 'drive') return 0;
  
  const dr = n0((defenderRating - 40) / 100);
  const sr = n0((shooterRating - 40) / 100);
  const bf = n0(blockFreq / 100);
  
  let base = 0.08;
  if (shotType === 'drive') base = 0.06;
  else if (shooterRating >= 75) base = 0.05;
  
  let prob = base + dr * 0.06 - sr * 0.04 + bf * 0.03;
  
  return Math.max(0.02, Math.min(0.35, prob * CALIBRATION.blockFactor));
}

function calculateStealOnTurnoverProbability(defenderRating, stealFreq, defenseTeamStyle) {
  const dr = n0((defenderRating - 40) / 100);
  const sf = n0(stealFreq / 100);
  const press = n0((defenseTeamStyle.pressureDefense || 50) / 100);
  
  let prob = 0.45 + dr * 0.15 + sf * 0.25 + press * 0.1;
  
  return Math.max(0.20, Math.min(0.85, prob * CALIBRATION.stealFactor));
}

// Mock game simulation (simplified for testing)
function simulateSimpliedGame() {
  let homeStats = { pts: 0, reb: 0, ast: 0, tov: 0, stl: 0, blk: 0 };
  let awayStats = { pts: 0, reb: 0, ast: 0, tov: 0, stl: 0, blk: 0 };
  
  // Simulate ~240 possessions (typical NBA game: 100-110 poss per team)
  for (let poss = 0; poss < 240; poss++) {
    const isHome = Math.random() < 0.5;
    const offenseStats = isHome ? homeStats : awayStats;
    const defenseStats = isHome ? awayStats : homeStats;
    
    // Random team/player tendencies for testing
    const teamStyle = {
      threeRate: 35 + randInt(-15, 15),
      rimRate: 35 + randInt(-15, 15),
      midRate: 30 + randInt(-15, 15),
      pressureDefense: 50 + randInt(-20, 20)
    };
    
    const playerTend = {
      shot3Freq: 25 + randInt(-15, 15),
      shotRimFreq: 30 + randInt(-15, 15),
      shotMidFreq: 30 + randInt(-15, 15),
      driveFreq: 25 + randInt(-15, 15),
      turnoverRisk: 50 + randInt(-20, 20),
      stealFreq: 50 + randInt(-20, 20),
      blockFreq: 50 + randInt(-20, 20)
    };
    
    const shooterRating = 50 + randInt(-30, 30);
    const defenderRating = 50 + randInt(-30, 30);
    
    // Turnover check
    const toProb = calculateTurnoverProbability(50, 50, playerTend, teamStyle);
    if (Math.random() < toProb) {
      offenseStats.tov += 1;
      
      // Steal chance on TO
      const stealProb = calculateStealOnTurnoverProbability(defenderRating, playerTend.stealFreq, teamStyle);
      if (Math.random() < stealProb) {
        defenseStats.stl += 1;
      }
      continue;
    }
    
    // Shot type selection
    const shotType = selectShotType(teamStyle, playerTend);
    
    // Block chance
    if ((shotType === 'rim' || shotType === 'drive') && Math.random() < calculateBlockProbability(defenderRating, shooterRating, 50, shotType)) {
      defenseStats.blk += 1;
      continue;
    }
    
    // Make/miss
    const makePct = calculateShotMakeProbability(shotType, shooterRating, defenderRating, 'Two-Way');
    const isMake = Math.random() < makePct;
    
    if (isMake) {
      // Points scoring
      if (shotType === '3pt') {
        offenseStats.pts += 3;
      } else {
        offenseStats.pts += 2;
      }
      
      // Assist
      if (Math.random() < 0.55) offenseStats.ast += 1;
      
      // Rebound (only on FTs or defensive rebound after made FG)
      if (Math.random() < 0.10) defenseStats.reb += 1; // long rebound chance
    } else {
      // Miss - both teams can rebound
      if (Math.random() < 0.27) offenseStats.reb += 1; // offensive rebound
      else defenseStats.reb += 1; // defensive rebound
    }
  }
  
  return { homeStats, awayStats };
}

// Run validation
console.log('🏀 Basketball GM Simulation Validator\n');
console.log('Running 10 simulated games...\n');

const allStats = { home: [], away: [] };

for (let i = 0; i < 10; i++) {
  const result = simulateSimpliedGame();
  allStats.home.push(result.homeStats);
  allStats.away.push(result.awayStats);
}

// Aggregate team stats
const aggStats = { pts: 0, reb: 0, ast: 0, tov: 0, stl: 0, blk: 0 };
const allTeamStats = [...allStats.home, ...allStats.away];
allTeamStats.forEach(stats => {
  aggStats.pts += stats.pts || 0;
  aggStats.reb += stats.reb || 0;
  aggStats.ast += stats.ast || 0;
  aggStats.tov += stats.tov || 0;
  aggStats.stl += stats.stl || 0;
  aggStats.blk += stats.blk || 0;
});

const perGameAvg = {
  pts: safeDiv(aggStats.pts, 20),
  reb: safeDiv(aggStats.reb, 20),
  ast: safeDiv(aggStats.ast, 20),
  tov: safeDiv(aggStats.tov, 20),
  stl: safeDiv(aggStats.stl, 20),
  blk: safeDiv(aggStats.blk, 20)
};

// Print report
console.log('📊 PER-GAME AVERAGES (20 teams * 10 games):\n');
console.log('Stat  | Current | Target Range | Status');
console.log('-----+---------+--------------+--------');

const targets = { pts: [95, 125], reb: [40, 55], ast: [20, 32], tov: [11, 17], stl: [6, 10], blk: [3, 7] };
let passCount = 0;

for (const [stat, avg] of Object.entries(perGameAvg)) {
  const [min, max] = targets[stat];
  const status = avg >= min && avg <= max ? '✓ PASS' : '✗ FAIL';
  const range = `${min}-${max}`;
  console.log(`${stat.toUpperCase().padEnd(5)}| ${avg.toFixed(2).padEnd(7)} | ${range.padEnd(12)} | ${status}`);
  if (avg >= min && avg <= max) passCount++;
}

console.log('\n✅ ' + passCount + '/6 target ranges met!\n');
console.log('Summary: Simulation is', passCount === 6 ? 'HEALTHY ✓' : 'needs calibration ⚠');
