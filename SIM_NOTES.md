# Tendencies-Based Possession Sim - Implementation Guide

## Phase 2: Possession-Based Simulation Engine

### Key Changes Needed:

1. **Possession Calculation**
   - basePace = (teamA.style.pace + teamB.style.pace) / 2
   - possPerTeam = clamp(round(normal(basePace, 5)), 88, 112)

2. **Action Selection per Possession**
   - Weighted by: team shot distribution (threeRate/rimRate/midRate) + player tendencies
   - Shot types: 3PT, MID, RIM, PASS_DRIVE

3. **Shot Probability**
   - Rating-based: shooter rating vs defender rating
   - Archetype bonuses
   - Defense pressure factor

4. **Rebound Resolution**
   - Team-level chance: crashOReb vs defRebFreq
   - Player selection: REB rating + position bias + tendency

5. **Turnover/Steal**
   - ballSecurity vs defPressure
   - stealFreq affects steal chance

6. **Assist Assignment**
   - passFreq + team passRate influences%
   - Select passer from on-court players

7. **Stats Tracking**
   - Per-possession: count each stat type
   - Per-player: track usage, touches
   - Ensure no NaN (default 0, never divide by 0 games)

### Target Ranges
- Points: 95-125
- Rebounds: 40-55
- Assists: 20-32
- Turnovers: 11-17
- Steals: 6-10
- Blocks: 3-7

### Files to Modify
- index.html: playNextPossession, distributeStats, stats rendering

### Seed for Determinism
- Use seedable PRNG or capture seed state for reproducible results
