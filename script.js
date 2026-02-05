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

// Build toolbar
function buildToolbar() {
    const toolbar = document.getElementById("toolbar");
    toolbar.innerHTML = ""; // clear first
    const categories = [...new Set(elements.map(e => e.category))];
    categories.forEach(cat => {
        const title = document.createElement("h2");
        title.textContent = cat;
        toolbar.appendChild(title);

        const catEls = elements.filter(e => e.category === cat);
        catEls.forEach(el => {
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
    if (world.length === 0) world = Array(rows).fill().map(() => Array(cols).fill(null));
}
window.addEventListener("resize", resize);

// Spawn particle
function spawnParticle(x, y) {
    const col = Math.floor(x / particleSize);
    const row = Math.floor(y / particleSize);
    const el = elements.find(e => e.name === currentMaterial);
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
        world[row][col] = { ...el, lifetime: el.lifetime, countdown: el.countdown };
    }
}

// Mouse & touch
canvas.addEventListener("mousemove", e => { if (e.buttons === 1) spawnParticle(e.offsetX, e.offsetY); });
canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    for (let t of e.touches) {
        const rect = canvas.getBoundingClientRect();
        spawnParticle(t.clientX - rect.left, t.clientY - rect.top);
    }
});

// Physics loop
function update() {
    for (let r = rows - 1; r >= 0; r--) {
        for (let c = 0; c < cols; c++) {
            let p = world[r][c]; if (!p) continue;

            // Fire
            if (p.type === "fire") {
                p.lifetime--; if (p.lifetime <= 0) { world[r][c] = null; continue; }
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                    let nr = r + dy, nc = c + dx;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                        let n = world[nr][nc]; if (n && n.flammable) world[nr][nc] = { ...elements.find(e => e.name === "fire"), lifetime: 50 };
                    }
                });
            }

            // Solids & liquids
            if (p.type === "solid" || p.liquid) {
                let below = r + 1 < rows ? world[r + 1][c] : null;
                if (!below) { world[r + 1][c] = p; world[r][c] = null; }
                else if (p.sinks && below && below.liquid) { world[r][c] = below; world[r + 1][c] = p; }
                if (p.sinks && below && below.hot) { world[r + 1][c] = { ...elements.find(e => e.name === "glass") }; world[r][c] = null; }
                if (p.type === "water" && below && below.hot) { world[r + 1][c] = { ...elements.find(e => e.name === "stone") }; world[r][c] = null; }
            }

            // Gases
            if (p.gas) {
                let above = r - 1 >= 0 ? world[r - 1][c] : null;
                if (!above) { world[r - 1][c] = p; world[r][c] = null; }
            }

            // Explosives
            if (p.explosive) {
                p.countdown--; if (p.countdown <= 0) { explode(r, c); world[r][c] = null; }
            }
        }
    }
}

// Explosion
function explode(r, c) {
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
        let nr = r + y, nc = c + x; if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) world[nr][nc] = null;
    }
}

// Draw
function draw() {
    ctx.clearRect(0, 0, width, height);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        let p = world[r][c]; if (p) { ctx.fillStyle = p.color; ctx.fillRect(c * particleSize, r * particleSize, particleSize, particleSize); }
    }
}

// Main loop
function loop() { update(); draw(); requestAnimationFrame(loop); }