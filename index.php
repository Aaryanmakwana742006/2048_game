<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>2048 Game</title>
    <script src="game.js" defer></script>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
        :root {
            --bg: #f7f7f7;
            --panel: #fff;
            --text: #333;
            --muted: #666;
            --accent: #51a7f9;
            --success: #31c48d;
            --secondary-bg: #eee;
            --secondary-text: #333;
        }

        [data-theme="dark"] {
            --bg: #0f1724;
            --panel: #071526;
            --text: #e6eef8;
            --muted: #9fb6d3;
            --accent: #3aa0ff;
            --success: #21ad75;
            --secondary-bg: #1f2a3c;
            --secondary-text: #e6eef8;
        }

        html,body { height: 100%; margin:0; padding:0; }
        body {
            background: var(--bg);
            color: var(--text);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            user-select:none;
        }

        header { text-align:center; margin:24px 0 4px; }
        h1 { font-size:44px; margin:0; font-weight:700; }
        p.lead { font-size:16px; color:var(--muted); margin-top:6px; }

        .panel {
            background: var(--panel);
            border-radius: 16px;
            box-shadow: 0 12px 20px rgba(0,0,0,0.08);
            padding: 18px;
            display: inline-block;
        }

        .controls { display:flex; justify-content: space-between; gap:12px; margin-top:18px; width:440px; flex-wrap: wrap; }
        .controls-left, .controls-right { display:flex; gap:8px; flex-wrap: wrap; align-items:center; }

        label.small { font-size:13px; font-weight:600; color:var(--muted); }

        button.ui {
            background: var(--accent);
            border:none;
            border-radius:10px;
            color:white;
            font-weight:700;
            font-size:15px;
            padding:10px 12px;
            cursor:pointer;
            box-shadow: 0 6px 14px rgba(81,167,249,0.35);
        }

        button.secondary {
            background: var(--secondary-bg);
            color: var(--secondary-text);
            border:1px solid rgba(0,0,0,0.08);
            box-shadow:none;
            border-radius:8px;
            font-weight:600;
            padding:8px 10px;
            cursor:pointer;
        }

        select, input[type="number"] {
            padding:8px 10px;
            border-radius:8px;
            border:1px solid rgba(0,0,0,0.08);
            background: var(--panel);
            color: var(--text);
            font-weight:600;
        }

        #board-wrap { margin-top:12px; }
        table#board {
            width:440px;
            height:440px;
            border-radius:14px;
            background:#dedede;
            border-collapse: separate;
            border-spacing:10px;
            table-layout: fixed;
        }

        table#board td {
            border-radius:12px;
            background:#f2f2f2;
            text-align:center;
            vertical-align:middle;
            font-size:48px;
            font-weight:600;
            color:#444;
            box-shadow: inset 0 2px 6px rgba(255,255,255,0.8),0 2px 4px rgba(0,0,0,0.05);
            transition: background-color 0.25s ease, color 0.25s ease, transform 0.12s ease;
            user-select:none;
        }

        td.tile-new { animation: pop .18s ease; }
        td.tile-merge { animation: pop .22s ease; }
        @keyframes pop {
            0% { transform: scale(0.6); opacity:0; }
            60% { transform: scale(1.08); opacity:1; }
            100% { transform: scale(1); }
        }

        .scoreboard { margin-top:16px; width:440px; display:flex; justify-content:space-between; font-weight:700; font-size:20px; color:var(--text); }

        .bottom-bar { display:flex; justify-content:space-between; margin:18px 0; width:440px; gap:12px; }
        .small { font-size:13px; font-weight:600; color:var(--muted); }

        #overlay {
            position: fixed; top:0; left:0; right:0; bottom:0;
            background: rgba(255,255,255,0.9);
            display:none;
            justify-content:center;
            align-items:center;
            user-select:none;
        }
        [data-theme="dark"] #overlay { background: rgba(5,8,12,0.7); }

        #overlay .box {
            background: var(--panel);
            padding:36px 48px;
            border-radius:14px;
            box-shadow:0 0 20px rgba(0,0,0,0.12);
            text-align:center;
            color:var(--text);
        }

        .leaderboard { margin-top:10px; max-height:130px; overflow:auto; padding:8px; border-radius:8px; border:1px dashed rgba(0,0,0,0.04); background:rgba(255,255,255,0.02); }
        .lb-item { display:flex; justify-content:space-between; padding:6px 4px; font-size:14px; color:var(--muted); }

        @media (max-width:500px) {
            table#board, .controls, .scoreboard, .bottom-bar { width:320px; }
            table#board { height:320px; }
            h1 { font-size:36px; }
        }

        .sr-only { position:absolute; left:-9999px; top:auto; width:1px; height:1px; overflow:hidden; }
    </style>
</head>
<body>
<header>
    <h1>2048</h1>
    <p class="lead">Combine numbers to reach your target — your design preserved ✨</p>
</header>

<div class="panel">
    <div class="controls">
        <div class="controls-left">
            <label class="small">Size</label>
            <select id="size-select">
                <option value="3">3 × 3</option>
                <option value="4" selected>4 × 4</option>
                <option value="5">5 × 5</option>
                <option value="6">6 × 6</option>
            </select>

            <label class="small">Difficulty</label>
            <select id="difficulty-select">
                <option value="normal" selected>Normal</option>
                <option value="hard">Hard</option>
                <option value="extreme">Extreme</option>
            </select>

            <label class="small">Target</label>
            <select id="target-select">
                <option value="1024">1024</option>
                <option value="2048" selected>2048</option>
                <option value="4096">4096</option>
                <option value="8192">8192</option>
                <option value="custom">Custom</option>
            </select>
            <input id="target-custom" type="number" min="8" placeholder="e.g. 16384" style="display:none; width:120px;">
        </div>

        <div class="controls-right">
            <button id="save-btn" class="secondary">Save</button>
            <button id="ai-toggle" class="secondary">AI: Off</button>
            <button id="dark-toggle" class="secondary">Dark</button>
        </div>
    </div>

    <div id="board-wrap">
        <table id="board" border="0" cellpadding="0" cellspacing="10" aria-label="2048 board"></table>
    </div>

    <div class="scoreboard">
        <div>Score: <span id="score">0</span></div>
        <div>Best: <span id="best-score">0</span></div>
    </div>

    <div class="bottom-bar">
        <div style="display:flex; gap:8px;">
            <button id="undo-btn" class="ui" title="Undo (Z)">Undo (Z)</button>
            <button id="restart-btn" class="ui" title="New Game (R)" style="background:var(--success)">New Game (R)</button>
            <button id="continue-btn" class="ui" style="display:none; background:#f3c64b; box-shadow: 0 6px 14px rgba(243,198,75,0.28)">Continue</button>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
            <div class="small">Sound</div>
            <input id="sound-toggle" type="checkbox" checked />
        </div>
    </div>

    <div style="display:flex; gap:12px; margin-top:10px; align-items:flex-start;">
        <div style="flex:1">
            <div class="small">Leaderboard (local)</div>
            <div class="leaderboard" id="leaderboard"></div>
            <div style="margin-top:8px;">
                <button id="clear-leaderboard" class="secondary">Clear</button>
            </div>
        </div>


    </div>
</div>

<div id="overlay" role="dialog" aria-modal="true">
    <div class="box">
        <div id="overlay-message" style="font-size:20px; font-weight:800;"></div>
        <div style="margin-top:12px;">
            <button id="overlay-newgame-btn" class="ui" style="background:var(--success)">New Game</button>
            <button id="overlay-continue-btn" class="secondary" style="display:none; margin-left:8px">Continue</button>
        </div>
    </div>
</div>

<canvas id="confetti-canvas" style="position:fixed; left:0; top:0; width:100%; height:100%; pointer-events:none; display:none;"></canvas>

<div class="sr-only" aria-live="polite" id="aria-status"></div>

</body>
</html>
