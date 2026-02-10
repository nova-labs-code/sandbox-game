// =======================
// PHYSICS
// =======================
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function update() {
    for (let r = rows - 1; r >= 0; r--) {
        for (let c = 0; c < cols; c++) {
            const p = world[r][c];
            if (!p) continue;

            // FIRE
            if (p.type === "fire") {
                p.lifetime--;
                if (p.lifetime <= 0) { world[r][c] = null; continue; }
                spreadFire(r, c);
            }

            // EXPLOSIVES
            if (p.explosive) {
                p.countdown--;
                if (p.countdown <= 0) { explode(r, c); world[r][c] = null; continue; }
            }

            // SOLIDS
            if (p.solid) applySolidPhysics(r, c, p);

            // LIQUIDS
            if (p.liquid) applyLiquidPhysics(r, c, p);

            // GAS
            if (p.gas) moveGas(r, c, p);

            // Reactions
            handleParticleReactions(r, c, p);
        }
    }
}

// -----------------------
// Solid physics (sand, dirt, etc.)
function applySolidPhysics(r, c, p) {
    p.vy = (p.vy || 0) + (p.weight || 0.1); // gravity acceleration
    let newR = r + Math.floor(p.vy);
    if (newR >= rows) newR = rows - 1;

    if (!world[newR][c]) {
        world[newR][c] = p;
        world[r][c] = null;
        return;
    }

    // Try sliding left/right
    const dirs = [-1, 1];
    for (let d of dirs) {
        const nc = c + d;
        if (nc >= 0 && nc < cols && !world[r][nc]) {
            world[r][nc] = p;
            world[r][c] = null;
            p.vx = d * 0.5; // sideways momentum
            p.vy = 0.5;      // slight downward velocity
            return;
        }
    }

    // Stop moving
    p.vy = 0;
}

// -----------------------
// Liquid physics
function applyLiquidPhysics(r, c, p) {
    // Gravity first
    p.vy = (p.vy || 0) + (p.weight || 0.08);
    let newR = r + Math.floor(p.vy);
    if (newR >= rows) newR = rows - 1;

    if (!world[newR][c]) {
        world[newR][c] = p;
        world[r][c] = null;
        return;
    }

    // Spread sideways
    const dirs = [-1, 1];
    for (let d of dirs.sort(() => Math.random() - 0.5)) { // random left/right choice
        const nc = c + d;
        if (nc >= 0 && nc < cols && !world[r][nc]) {
            world[r][nc] = p;
            world[r][c] = null;
            return;
        }
    }

    p.vy = 0; // stop downward motion if blocked
}

// -----------------------
// Gas physics
function moveGas(r, c, p) {
    const dirs = [[0,-1],[-1,-1],[1,-1],[-1,0],[1,0]]; // up and sideways
    const [dx, dy] = dirs[Math.floor(Math.random()*dirs.length)];
    const nr = r + dy, nc = c + dx;
    if(nr >= 0 && nr < rows && nc >= 0 && nc < cols && !world[nr][nc]){
        world[nr][nc] = p;
        world[r][c] = null;
    }
}

// -----------------------
// Reactions handler
function handleParticleReactions(r, c, p) {
    if (!p.reactions) return;

    const neighbors = [
        [r-1, c], [r+1, c], [r, c-1], [r, c+1]
    ];

    for (let [nr, nc] of neighbors) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const n = world[nr][nc];
        if (!n) continue;

        for (let rxn of p.reactions) {
            if (n.name === rxn.with) {
                if (rxn.result === null) continue;
                const resultEl = elements.find(e=>e.name===rxn.result);
                if (resultEl) {
                    world[r][c] = {...resultEl};
                    world[nr][nc] = {...resultEl};
                }
            }
        }
    }
}

// -----------------------
// Fire spread
function spreadFire(r, c) {
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (let [dx, dy] of dirs) {
        const nr = r + dy, nc = c + dx;
        if (nr>=0 && nr<rows && nc>=0 && nc<cols){
            const n = world[nr][nc];
            if (n && n.flammable){
                world[nr][nc] = {...elements.find(e=>e.name==="fire"), lifetime:50};
            }
        }
    }
}

// -----------------------
// Explosion
function explode(r, c) {
    for (let y=-3; y<=3; y++)
        for (let x=-3; x<=3; x++) {
            const nr = r + y, nc = c + x;
            if (nr>=0 && nr<rows && nc>=0 && nc<cols) world[nr][nc] = null;
        }
}