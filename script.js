const canvas = document.getElementById("sandbox");
const ctx = canvas.getContext("2d");
let width, height;
let particleSize = 6;

// Materials
const materials = {
    sand: { color: "goldenrod", type: "solid", flammable: false, liquid: false },
    water: { color: "blue", type: "liquid", flammable: false, liquid: true },
    lava: { color: "orangered", type: "liquid", flammable: false, liquid: true },
    fire: { color: "red", type: "fire", flammable: true, liquid: false, lifetime: 50 }
};

let currentMaterial = "sand";

// World grid
let cols, rows;
let world = [];

// Resize canvas
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cols = Math.floor(width / particleSize);
    rows = Math.floor(height / particleSize);
    world = Array(rows).fill().map(() => Array(cols).fill(null));
}
window.addEventListener("resize", resize);
resize();

// Toolbar selection
document.querySelectorAll("#toolbar button").forEach(btn => {
    btn.addEventListener("click", () => currentMaterial = btn.dataset.type);
});

// Spawn particle at canvas coords
function spawnParticle(x, y) {
    const col = Math.floor(x / particleSize);
    const row = Math.floor(y / particleSize);
    if(col>=0 && col<cols && row>=0 && row<rows){
        world[row][col] = {...materials[currentMaterial], lifetime: materials[currentMaterial].lifetime};
    }
}

// Mouse/touch input
canvas.addEventListener("mousemove", e => { if(e.buttons===1) spawnParticle(e.clientX,e.clientY); });
canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    for(let t of e.touches) spawnParticle(t.clientX,t.clientY);
});

// Physics update
function update() {
    // Iterate bottom → top for proper falling
    for(let row = rows-1; row >= 0; row--){
        for(let col = 0; col < cols; col++){
            let p = world[row][col];
            if(!p) continue;

            // FIRE behavior
            if(p.type==="fire"){
                p.lifetime--;
                if(p.lifetime <=0){ world[row][col]=null; continue; }
                // ignite neighbors
                let neighbors = [[0,-1],[0,1],[-1,0],[1,0]];
                for(let [dx,dy] of neighbors){
                    let r=row+dy, c=col+dx;
                    if(r>=0 && r<rows && c>=0 && c<cols){
                        let n = world[r][c];
                        if(n && n.flammable) world[r][c]={...materials.fire, lifetime: 50};
                    }
                }
            }

            // Liquid behavior
            if(p.liquid){
                if(row+1<rows && !world[row+1][col]){ // fall
                    world[row+1][col]=p;
                    world[row][col]=null;
                } else {
                    // try sideways
                    let dir = Math.random()<0.5?-1:1;
                    if(col+dir>=0 && col+dir<cols && !world[row][col+dir]){
                        world[row][col+dir]=p;
                        world[row][col]=null;
                    }
                }
            }

            // Solid behavior
            if(p.type==="solid"){
                if(row+1<rows && !world[row+1][col]){
                    world[row+1][col]=p;
                    world[row][col]=null;
                }
            }
        }
    }
}

// Draw
function draw() {
    ctx.clearRect(0,0,width,height);
    for(let row=0; row<rows; row++){
        for(let col=0; col<cols; col++){
            let p = world[row][col];
            if(p){
                ctx.fillStyle = p.color;
                ctx.fillRect(col*particleSize, row*particleSize, particleSize, particleSize);
            }
        }
    }
}

// Main loop
function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();