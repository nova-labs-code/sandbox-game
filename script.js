const canvas = document.getElementById("sandbox");
const ctx = canvas.getContext("2d");

let width, height, cols, rows;
const particleSize = 4;
let world = [];
let currentMaterial = "sand";
let elements = [];

// Load elements.json
fetch("elements.json")
  .then(res => res.json())
  .then(data => {
      elements = data;
      buildToolbar();
      resize();
      loop();
  });

// Toolbar
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

// Resize
function resize() {
    width = canvas.width = canvas.clientWidth;
    height = canvas.height = canvas.clientHeight;
    cols = Math.floor(width / particleSize);
    rows = Math.floor(height / particleSize);
    world = Array.from({ length: rows }, () => Array(cols).fill(null));
}
window.addEventListener("resize", resize);

// Particle placement (throttled)
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

    world[row][col] = { ...el, lifetime: el.lifetime, countdown: el.countdown };
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

// Physics
function update() {
    // Traverse from bottom to top for gravity
    for (let r = rows-1; r >= 0; r--) {
        for (let c = 0; c < cols; c++) {
            const p = world[r][c];
            if (!p) continue;

            // Fire spreads
            if (p.type === "fire") {
                p.lifetime--;
                if (p.lifetime <= 0) { world[r][c] = null; continue; }
                spreadFire(r, c);
                continue;
            }

            // Explosives
            if (p.explosive) {
                p.countdown--;
                if (p.countdown <= 0) { explode(r, c); world[r][c] = null; continue; }
            }

            // Solids & liquids gravity + flow
            if (p.type === "solid" || p.liquid) {
                applyGravity(r, c);
            }

            // Gas rises
            if (p.gas) {
                moveUp(r, c);
            }
        }
    }
}

// Fire spread helper
function spreadFire(r, c) {
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    dirs.forEach(([dx,dy])=>{
        const nr = r+dy, nc = c+dx;
        if(nr>=0 && nr<rows && nc>=0 && nc<cols){
            const n = world[nr][nc];
            if(n && n.flammable) world[nr][nc] = {...elements.find(e=>e.name==="fire"), lifetime:50};
        }
    });
}

// Move particle up (gas)
function moveUp(r, c){
    const p = world[r][c];
    if(r<=0) return;
    if(!world[r-1][c]) { world[r-1][c] = p; world[r][c]=null; }
}

// Gravity for solids/liquids
function applyGravity(r, c){
    const p = world[r][c];
    if(r+1>=rows) return;
    const below = world[r+1][c];

    // Move down if empty
    if(!below){ world[r+1][c]=p; world[r][c]=null; return; }

    // Sand sinking in liquid
    if(p.sinks && below && below.liquid){ world[r+1][c]=p; world[r][c]=below; return; }

    // Liquid flow sideways
    const dirs = [-1,1];
    for(let d of dirs){
        const nc = c+d;
        if(nc>=0 && nc<cols && !world[r][nc]){
            world[r][nc] = p;
            world[r][c] = null;
            return;
        }
    }

    // Reactions
    if(p.type==="solid" && below && below.hot && p.name==="sand") world[r+1][c] = {...elements.find(e=>e.name==="glass")};
    if(p.name==="water" && below && below.hot) world[r+1][c] = {...elements.find(e=>e.name==="stone")};
    if(p.liquid && below && below.corrosive) world[r+1][c] = null; // acid dissolves
}

// Explosion
function explode(r, c){
    for(let y=-3;y<=3;y++) for(let x=-3;x<=3;x++){
        const nr=r+y, nc=c+x;
        if(nr>=0 && nr<rows && nc>=0 && nc<cols) world[nr][nc]=null;
    }
}

// Draw
function draw(){
    ctx.clearRect(0,0,width,height);
    for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
            const p = world[r][c];
            if(p) ctx.fillStyle = p.color, ctx.fillRect(c*particleSize, r*particleSize, particleSize, particleSize);
        }
    }
}

// Main loop
function loop(){ update(); draw(); requestAnimationFrame(loop); }