# Orbital Syndicate

Orbital Syndicate is a browser-based **semi multiplayer space mining management sim**.
You lead a mining corporation, compete with AI rival syndicates, manage extraction
operations across asteroid belts, and respond to a live commodity market.

## Gameplay Features

- **Semi multiplayer simulation** via a live leaderboard against rival corporations.
- **Asteroid belt control** where influence impacts extraction yields.
- **Dynamic market economy** with fluctuating prices across multiple resources.
- **Mining operations and refining**, including ore-to-alloy conversion.
- **Contracts system** with payout and reputation rewards.
- **Persistent progression** using browser local storage.

## Project Structure

- `webpage/index.html` — application shell and UI layout.
- `webpage/css/game.css` — game styling and responsive layout.
- `webpage/js/game.js` — full game logic, simulation loop, and persistence.

## Run Locally

Because this project is fully static, you can run it with any local file server.

```bash
cd webpage
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

## Controls

- **Secure Lane**: Spend credits to gain influence in a belt.
- **Refine**: Convert raw ore into Star Alloy.
- **Buy/Sell**: Trade resources on the market.
- **Upgrade**: Improve mining, logistics, and security capabilities.
- **Run 8h Simulation**: Fast-forward strategic simulation ticks.
- **Reset Save**: Start a new corporation.

