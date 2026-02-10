const canvas = document.getElementById("sandbox");
const ctx = canvas.getContext("2d");

let width, height, cols, rows;
const particleSize = 4;
let world = [];
let currentMaterial = "sand";
let elements = [];

// Load elements
fetch("elements.json")
  .then(res => res.json())
  .then(data => {
      elements = data;
      buildToolbar();
      resize();
      loop();
  });

// Build toolbar
function buildToolbar() {
    const toolbar = document.getElementById("toolbar");
    toolbar.innerHTML = "";
    const categories = [...new Set(elements.map(e => e.category))];

    categories.forEach(cat => {
        const title = document.createElement("h2");
        title.textContent = cat;
        toolbar.appendChild(title);

        elements.filter(e => e.category === cat).forEach(el => {
            const btn = document.createElement("button");
            btn.textContent = el.name;
            btn.style.backgroundColor = el.color;
            btn.addEventListener("click", () => currentMaterial = el.name);
            toolbar.appendChild(btn);
        });
    });
}

// Resize canvas
function resize() {
    width = canvas.width = canvas.clientWidth;
    height = canvas.height = canvas.clientHeight;
    cols = Math.floor(width / particleSize);
    rows = Math.floor(height / particleSize);
    world = Array.from({ length: rows }, () => Array(cols).fill(null));
}
window.addEventListener("resize", resize);

// Particle placement
let isDrawing = false;
let lastSpawn = 0;
function spawnParticle(x, y) {
    const now = Date.now();
    if (now - lastSpawn < 10) return;
    lastSpawn = now;

    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((x - rect.left) / particleSize);
    const row = Math.floor((y - rect.top) / particleSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;

    const el = elements.find(e => e.name === currentMaterial);
    if (!el) return;

    world[row][col] = { ...el, lifetime: el.lifetime, countdown: el.countdown, vx: 0, vy: 0 };
}

// Mouse & touch
canvas.addEventListener("mousedown", () => isDrawing = true);
canvas.addEventListener("mouseup", () => isDrawing = false);
canvas.addEventListener("mousemove", e => { if (isDrawing) spawnParticle(e.clientX, e.clientY); });

canvas.addEventListener("touchstart", e => { e.preventDefault(); isDrawing = true; });
canvas.addEventListener("touchend", e => { e.preventDefault(); isDrawing = false; });
canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    if (!isDrawing) return;
    for (let t of e.touches) spawnParticle(t.clientX, t.clientY);
});

// =======================
// PHYSICS LOOP
// =======================
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function update() {
    // Traverse from bottom up for correct falling behavior
    for (let r = rows - 1; r >= 0; r--) {
        for (let c = 0; c < cols; c++) {
            const p = world[r][c];
            if (!p) continue;

            // Fire
            if (p.type === "fire") {
                p.lifetime--;
                if (p.lifetime <= 0) { world[r][c] = null; continue; }
                spreadFire(r, c);
            }

            // Explosives
            if (p.explosive) {
                p.countdown--;
                if (p.countdown <= 0) { explode(r, c); world[r][c] = null; continue; }
            }

            // Physics by type
            if (p.solid) applySolidPhysics(r, c, p);
            if (p.liquid) applyLiquidPhysics(r, c, p);
            if (p.gas) applyGasPhysics(r, c, p);

            // Reactions
            handleReactions(r, c, p);
        }
    }
}

// -----------------------
// Solid physics
function applySolidPhysics(r, c, p) {
    p.vy = (p.vy || 0) + (p.weight || 0.1);
    let newR = r + Math.floor(p.vy);
    if (newR >= rows) newR = rows - 1;

    if (!world[newR][c]) {
        world[newR][c] = p;
        world[r][c] = null;
        return;
    }

    const dirs = [-1,1];
    for (let d of dirs) {
        const nc = c + d;
        if (nc >=0 && nc < cols && !world[r][nc]) {
            world[r][nc] = p;
            world[r][c] = null;
            p.vy = 0.5;
            return;
        }
    }
    p.vy = 0;
}

// -----------------------
// Liquid physics
function applyLiquidPhysics(r, c, p) {
    p.vy = (p.vy || 0) + (p.weight || 0.08);
    let newR = r + Math.floor(p.vy);
    if (newR >= rows) newR = rows - 1;

    if (!world[newR][c]) {
        world[newR][c] = p;
        world[r][c] = null;
        return;
    }

    const dirs = [-1,1].sort(()=>Math.random()-0.5);
    for (let d of dirs) {
        const nc = c+d;
        if (nc>=0 && nc<cols && !world[r][nc]) {
            world[r][nc] = p;
            world[r][c] = null;
            return;
        }
    }
    p.vy = 0;
}

// -----------------------
// Gas physics
function applyGasPhysics(r, c, p) {
    const dirs = [[0,-1],[-1,-1],[1,-1],[-1,0],[1,0]];
    const [dx, dy] = dirs[Math.floor(Math.random()*dirs.length)];
    const nr = r+dy, nc = c+dx;
    if (nr>=0 && nr<rows && nc>=0 && nc<cols && !world[nr][nc]) {
        world[nr][nc] = p;
        world[r][c] = null;
    }
}

// -----------------------
// Reactions
function handleReactions(r,c,p){
    if (!p.reactions) return;
    const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    for (let [nr,nc] of neighbors){
        if (nr<0||nr>=rows||nc<0||nc>=cols) continue;
        const n = world[nr][nc];
        if (!n) continue;
        for (let rxn of p.reactions){
            if (n.name === rxn.with){
                if (!rxn.result) continue;
                const res = elements.find(e=>e.name===rxn.result);
                if(res){
                    world[r][c] = {...res};
                    world[nr][nc] = {...res};
                }
            }
        }
    }
}

// -----------------------
// Fire
function spreadFire(r,c){
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for(let [dx,dy] of dirs){
        const nr = r+dy, nc=c+dx;
        if(nr>=0&&nr<rows&&nc>=0&&nc<cols){
            const n = world[nr][nc];
            if(n && n.flammable){
                world[nr][nc] = {...elements.find(e=>e.name==="fire"), lifetime:50};
            }
        }
    }
}

// -----------------------
// Explosion
function explode(r,c){
    for(let y=-3;y<=3;y++)
        for(let x=-3;x<=3;x++){
            const nr=r+y, nc=c+x;
            if(nr>=0&&nr<rows&&nc>=0&&nc<cols) world[nr][nc]=null;
        }
}

// -----------------------
// Draw
function draw(){
    ctx.clearRect(0,0,width,height);
    for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
            const p=world[r][c];
            if(p){
                ctx.fillStyle=p.color;
                ctx.fillRect(c*particleSize, r*particleSize, particleSize, particleSize);
            }
        }
    }
}