#!/usr/bin/env python3
"""
Basketball GM Simulator - Stats Validation Script
Opens the app in a headless browser, initializes a league, and runs stat validation
"""

import time
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def validate_stats():
    """Run validation test and capture stats"""
    
    # Setup headless Chrome
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--start-maximized")
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        # Load the app
        html_path = Path(__file__).parent / "index.html"
        driver.get(f"file:///{html_path}")
        
        # Wait for app to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "app"))
        )
        
        print("✓ App loaded successfully")
        
        # Initialize league if needed
        time.sleep(2)
        driver.execute_script("if (!state.league || !state.league.teams) { createNewLeague(); }")
        time.sleep(2)
        
        print("✓ League initialized")
        
        # Run validation
        print("\nRunning 14-game validation simulation...\n")
        
        # Capture console logs
        logs = []
        js_code = """
        const originalLog = console.log;
        const originalTable = console.table;
        const captured = [];
        
        console.log = function(...args) {
            captured.push({type: 'log', msg: args.join(' ')});
            originalLog.apply(console, args);
        };
        
        console.table = function(data) {
            captured.push({type: 'table', data: data});
            originalTable.apply(console, [data]);
        };
        
        const results = simulateValidation(14);
        
        return {results: results, logs: captured};
        """
        
        result = driver.execute_script(js_code)
        
        # Extract and display results
        if result and result.get('results'):
            results = result['results']
            print("=" * 80)
            print("VALIDATION TEST RESULTS - 14 GAME SIMULATION")
            print("=" * 80)
            print()
            
            for team_id, stats in results.items():
                print(f"Team: {stats['team']}")
                print("-" * 40)
                print(f"  PPG:    {stats['PPG']:<6} (Target: 100-125)")
                print(f"  FGA:    {stats['FGA']:<6} (Target: 80-95)")
                print(f"  FG%:    {stats['FG%']:<6} (Target: 47-49%)")
                print(f"  3PA:    {stats['3PA']:<6} (Target: 25-40)")
                print(f"  3P%:    {stats['3P%']:<6} (Target: 33-36%)")
                print(f"  FTA:    {stats['FTA']:<6} (Target: 18-30)")
                print(f"  FT%:    {stats['FT%']:<6} (Target: 76-78%)")
                print(f"  RPG:    {stats['RPG']:<6} (Target: 42-55)")
                print(f"  APG:    {stats['APG']:<6} (Target: 20-32)")
                print(f"  SPG:    {stats['SPG']:<6} (Target: 6-10)")
                print(f"  BPG:    {stats['BPG']:<6} (Target: 3-7)")
                print(f"  TOPG:   {stats['TOPG']:<6} (Target: 11-17)")
                print()
            
            # Check if within ranges
            print("=" * 80)
            print("RANGE VALIDATION")
            print("=" * 80)
            
            ranges = {
                'PPG': (100, 125),
                'FGA': (80, 95),
                'FG%': (47, 49),
                '3PA': (25, 40),
                '3P%': (33, 36),
                'FTA': (18, 30),
                'FT%': (76, 78),
                'RPG': (42, 55),
                'APG': (20, 32),
                'SPG': (6, 10),
                'BPG': (3, 7),
                'TOPG': (11, 17)
            }
            
            all_in_range = True
            for team_id, stats in results.items():
                print(f"\n{stats['team']}:")
                for stat_name, (min_val, max_val) in ranges.items():
                    value = float(stats[stat_name])
                    in_range = min_val <= value <= max_val
                    status = "✓" if in_range else "✗"
                    
                    if not in_range:
                        all_in_range = False
                        print(f"  {status} {stat_name}: {value} (OUTSIDE {min_val}-{max_val})")
                    else:
                        print(f"  {status} {stat_name}: {value}")
            
            print("\n" + "=" * 80)
            if all_in_range:
                print("✓ ALL STATS WITHIN RANGE - VALIDATION PASSED!")
            else:
                print("✗ SOME STATS OUT OF RANGE - TUNING NEEDED")
            print("=" * 80)
            
        else:
            print("✗ Validation failed - no results returned")
            
    finally:
        driver.quit()
        print("\nBrowser closed.")

if __name__ == '__main__':
    validate_stats()
