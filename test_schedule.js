// Test Schedule Generation
// Run this in console or Node.js to verify schedule logic

// Mock functions needed for testing
function uuid() {
  return Math.random().toString(36).substr(2, 9);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Copy schedule generation functions from index.html
function assignConferencesAndDivisions(league) {
  const teams = [...league.teams].sort((a,b) => a.name.localeCompare(b.name));
  
  // East: first 15, West: last 15
  const east = teams.slice(0, 15);
  const west = teams.slice(15, 30);
  
  // Assign divisions
  const divisions = ["1", "2", "3"];
  
  // East divisions
  east.forEach((team, idx) => {
    team.conf = "East";
    team.div = `East-${divisions[Math.floor(idx / 5)]}`;
  });
  
  // West divisions
  west.forEach((team, idx) => {
    team.conf = "West";
    team.div = `West-${divisions[Math.floor(idx / 5)]}`;
  });
}

function getDivisionOpponents(team, league) {
  return league.teams.filter(t => t.div === team.div && t.id !== team.id);
}

function getConferenceNonDivisionOpponents(team, league) {
  return league.teams.filter(t => t.conf === team.conf && t.div !== team.div);
}

function getInterConferenceOpponents(team, league) {
  return league.teams.filter(t => t.conf !== team.conf);
}

function generateSchedule(league) {
  const teams = league.teams;
  const season = league.meta.season;
  const games = [];
  let gameIdx = 0;

  const matchups = {};

  // Build matchup matrix for entire league
  teams.forEach(team => {
    // Division games (4 total: 2 home, 2 away)
    getDivisionOpponents(team, league).forEach(opponent => {
      const key = [team.id, opponent.id].sort().join("_");
      if (!matchups[key]) {
        matchups[key] = [];
        matchups[key].push({ home: team.id, away: opponent.id, count: 2 });
        matchups[key].push({ home: opponent.id, away: team.id, count: 2 });
      }
    });

    // Inter-conference games (2 total: 1 home, 1 away)
    getInterConferenceOpponents(team, league).forEach(opponent => {
      const key = [team.id, opponent.id].sort().join("_");
      if (!matchups[key]) {
        matchups[key] = [];
        matchups[key].push({ home: team.id, away: opponent.id, count: 1 });
        matchups[key].push({ home: opponent.id, away: team.id, count: 1 });
      }
    });

    // Conference non-division games (36 total)
    const confNonDiv = getConferenceNonDivisionOpponents(team, league);
    const confNonDivIds = confNonDiv.map(t => t.id).sort();
    
    // Rotate which 6 get 4 games and which 4 get 3 games
    const offset = (season % confNonDiv.length);
    const rotated = [...confNonDivIds.slice(offset), ...confNonDivIds.slice(0, offset)];
    
    const playFourTimes = rotated.slice(0, 6);
    const playThreeTimes = rotated.slice(6, 10);

    playFourTimes.forEach(oppId => {
      const key = [team.id, oppId].sort().join("_");
      if (!matchups[key]) {
        matchups[key] = [];
        if (season % 2 === 0) {
          matchups[key].push({ home: team.id, away: oppId, count: 2 });
          matchups[key].push({ home: oppId, away: team.id, count: 2 });
        } else {
          matchups[key].push({ home: team.id, away: oppId, count: 2 });
          matchups[key].push({ home: oppId, away: team.id, count: 2 });
        }
      }
    });

    playThreeTimes.forEach((oppId, idx) => {
      const key = [team.id, oppId].sort().join("_");
      if (!matchups[key]) {
        matchups[key] = [];
        if (idx % 2 === 0) {
          matchups[key].push({ home: team.id, away: oppId, count: 2 });
          matchups[key].push({ home: oppId, away: team.id, count: 1 });
        } else {
          matchups[key].push({ home: team.id, away: oppId, count: 1 });
          matchups[key].push({ home: oppId, away: team.id, count: 2 });
        }
      }
    });
  });

  // Expand matchups into individual games
  Object.values(matchups).forEach(matchupList => {
    matchupList.forEach(m => {
      for (let i = 0; i < m.count; i++) {
        games.push({
          id: uuid(),
          season,
          day: 0,
          homeTid: m.home,
          awayTid: m.away,
          played: false
        });
      }
    });
  });

  // Assign games to days (schedule across season)
  const maxDays = 175;
  const byTeam = {};
  teams.forEach(t => byTeam[t.id] = []);

  // Simple scheduling: iterate through days and assign games
  const unscheduled = [...games];
  let dayAssignments = {};
  
  for (let day = 1; day <= maxDays && unscheduled.length > 0; day++) {
    dayAssignments[day] = [];
    const dayTeams = new Set();

    // Find feasible games for this day
    for (let i = 0; i < unscheduled.length; i++) {
      const game = unscheduled[i];
      if (!dayTeams.has(game.homeTid) && !dayTeams.has(game.awayTid)) {
        game.day = day;
        dayAssignments[day].push(game);
        dayTeams.add(game.homeTid);
        dayTeams.add(game.awayTid);
        unscheduled.splice(i, 1);
        if (dayTeams.size >= 28) break; // ~14 games max per day
      }
    }
  }

  // Assign remaining games if any
  unscheduled.forEach((game, idx) => {
    game.day = Math.floor(idx / 15) + maxDays + 1;
  });

  // Build byTeam index
  games.forEach(game => {
    byTeam[game.homeTid].push(game.id);
    byTeam[game.awayTid].push(game.id);
  });

  // Sort each team's games by day
  Object.keys(byTeam).forEach(tid => {
    byTeam[tid].sort((a, b) => {
      const dayA = games.find(g => g.id === a).day;
      const dayB = games.find(g => g.id === b).day;
      return dayA - dayB;
    });
  });

  return {
    season,
    games,
    byTeam,
    maxDays: Math.max(...games.map(g => g.day))
  };
}

// Create test league
function createTestLeague() {
  const teams = [];
  const teamNames = [
    "New York", "LA", "Miami", "Chicago", "Boston", 
    "Denver", "Dallas", "Phoenix", "Golden State", "Houston",
    "Memphis", "Toronto", "Milwaukee", "Philadelphia", "Atlanta",
    "Washington", "Charlotte", "Orlando", "Indiana", "Cleveland",
    "Brooklyn", "Detroit", "Minnesota", "New Orleans", "Portland",
    "San Antonio", "Utah", "Sacramento", "Oklahoma City", "Lakers"
  ];
  
  teamNames.forEach(name => {
    teams.push({
      id: uuid(),
      name,
      abbrev: name.slice(0, 3).toUpperCase(),
      wins: 0,
      losses: 0,
      conf: "",
      div: ""
    });
  });

  return {
    meta: {
      name: "Test League",
      season: 2026,
      day: 1
    },
    teams,
    players: []
  };
}

// Run tests
console.log("=== BASKETBALL GM SCHEDULE TEST ===\n");

const league = createTestLeague();
console.log(`Created test league with ${league.teams.length} teams`);

// Assign conferences and divisions
assignConferencesAndDivisions(league);
console.log("\n✓ Assigned conferences and divisions:");
league.teams.forEach(t => {
  console.log(`  ${t.name}: ${t.conf} - ${t.div}`);
});

// Generate schedule
const schedule = generateSchedule(league);
console.log(`\n✓ Generated schedule with ${schedule.games.length} total games`);
console.log(`  Max days: ${schedule.maxDays}`);
console.log(`  Games per day range: ${Math.min(...Object.values(schedule)).length || 0} - ${Math.max(...Object.values(schedule)).length || 0}`);

// Verify 82 games per team
console.log("\n=== GAMES PER TEAM ===");
const gamesPerTeam = {};
league.teams.forEach(team => {
  const games = schedule.games.filter(g => g.homeTid === team.id || g.awayTid === team.id).length;
  gamesPerTeam[team.id] = games;
});

const allTeams82 = Object.values(gamesPerTeam).every(c => c === 82);
console.log(`All teams have exactly 82 games: ${allTeams82 ? '✓' : '✗'}`);

const counts = {};
Object.values(gamesPerTeam).forEach(c => {
  counts[c] = (counts[c] || 0) + 1;
});
console.log("Distribution:");
Object.entries(counts).forEach(([games, teams]) => {
  console.log(`  ${games} games: ${teams} teams`);
});

// Verify game distribution per team
console.log("\n=== GAME DISTRIBUTION PER TEAM (Sample: First 3 Teams) ===");
league.teams.slice(0, 3).forEach(team => {
  const teamGames = schedule.games.filter(g => g.homeTid === team.id || g.awayTid === team.id);
  
  // Count by opponent and type
  const divGames = teamGames.filter(g => {
    const opp = g.homeTid === team.id ? teamById2(g.awayTid, league) : teamById2(g.homeTid, league);
    return opp.div === team.div;
  }).length;
  
  const interConfGames = teamGames.filter(g => {
    const opp = g.homeTid === team.id ? teamById2(g.awayTid, league) : teamById2(g.homeTid, league);
    return opp.conf !== team.conf;
  }).length;
  
  const intraConfNonDivGames = teamGames.filter(g => {
    const opp = g.homeTid === team.id ? teamById2(g.awayTid, league) : teamById2(g.homeTid, league);
    return opp.conf === team.conf && opp.div !== team.div;
  }).length;
  
  console.log(`\n${team.name} (${team.div}):`);
  console.log(`  Division games: ${divGames} (expect 12)`);
  console.log(`  Inter-conference games: ${interConfGames} (expect 30)`);
  console.log(`  Intra-conf non-div games: ${intraConfNonDivGames} (expect 40)`);
  console.log(`  Total: ${divGames + interConfGames + intraConfNonDivGames}`);
});

// Verify no team plays twice the same day
console.log("\n=== VERIFYING NO DOUBLE-BOOKINGS ===");
const dayTeamCounts = {};
schedule.games.forEach(game => {
  if (!dayTeamCounts[game.day]) {
    dayTeamCounts[game.day] = {};
  }
  dayTeamCounts[game.day][game.homeTid] = (dayTeamCounts[game.day][game.homeTid] || 0) + 1;
  dayTeamCounts[game.day][game.awayTid] = (dayTeamCounts[game.day][game.awayTid] || 0) + 1;
});

let doubleBookings = 0;
Object.entries(dayTeamCounts).forEach(([day, teamCounts]) => {
  Object.entries(teamCounts).forEach(([teamId, count]) => {
    if (count > 1) {
      doubleBookings++;
      console.log(`  ✗ Day ${day}: Team ${teamId} plays ${count} times!`);
    }
  });
});

if (doubleBookings === 0) {
  console.log("✓ No double-bookings detected");
}

// Helper
function teamById2(id, league) {
  return league.teams.find(t => t.id === id);
}

console.log("\n=== TEST COMPLETE ===");
