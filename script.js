const canvas = document.getElementById("sandbox");
const ctx = canvas.getContext("2d");

let width, height;
let particleSize = 6;
let cols, rows;
let world = [];
let currentMaterial = "sand";

// Materials with behavior
const materials = {
    sand: { color:"goldenrod", type:"solid", liquid:false, flammable:false, sinks:true },
    water: { color:"blue", type:"liquid", liquid:true, flammable:false },
    lava: { color:"orangered", type:"liquid", liquid:true, flammable:false, hot:true },
    fire: { color:"red", type:"fire", liquid:false, flammable:true, lifetime:50 },
    glass: { color:"lightblue", type:"solid", liquid:false, flammable:false },
    stone: { color:"gray", type:"solid", liquid:false },
    bomb: { color:"black", type:"explosive", liquid:false, explosive:true, countdown:50 },
    acid: { color:"green", type:"liquid", liquid:true, corrosive:true, flammable:false },
    smoke: { color:"gray", type:"gas", gas:true }
};

// Sections setup
const categories = {
    "Solids": ["sand", "stone", "glass", "bomb"],
    "Liquids": ["water","lava","acid"],
    "Fire/Heat": ["fire"],
    "Gas": ["smoke"]
};

// Build toolbar
const toolbar = document.getElementById("toolbar");
for(let cat in categories){
    categories[cat].forEach(mat=>{
        const btn = document.createElement("button");
        btn.textContent = mat;
        btn.addEventListener("click", ()=>currentMaterial=mat);
        toolbar.appendChild(btn);
    });
}

// Canvas setup
function resize(){
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cols = Math.floor(width/particleSize);
    rows = Math.floor(height/particleSize);
    if(world.length===0){
        world = Array(rows).fill().map(()=>Array(cols).fill(null));
    }
}
window.addEventListener("resize", resize);
resize();

// Spawn particle
function spawnParticle(x,y){
    const col = Math.floor(x/particleSize);
    const row = Math.floor(y/particleSize);
    if(col>=0 && col<cols && row>=0 && row<rows){
        world[row][col] = { ...materials[currentMaterial], lifetime: materials[currentMaterial].lifetime, countdown: materials[currentMaterial].countdown };
    }
}

// Input handling
canvas.addEventListener("mousemove", e=>{ if(e.buttons===1) spawnParticle(e.clientX,e.clientY); });
canvas.addEventListener("touchmove", e=>{
    e.preventDefault();
    for(let t of e.touches) spawnParticle(t.clientX,t.clientY);
});

// Physics
function update(){
    for(let row=rows-1; row>=0; row--){
        for(let col=0; col<cols; col++){
            let p = world[row][col];
            if(!p) continue;

            // FIRE
            if(p.type==="fire"){
                p.lifetime--;
                if(p.lifetime<=0){ world[row][col]=null; continue; }
                // ignite neighbors
                [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx,dy])=>{
                    let r=row+dy, c=col+dx;
                    if(r>=0 && r<rows && c>=0 && c<cols){
                        let n = world[r][c];
                        if(n && n.flammable) world[r][c]={...materials.fire,lifetime:50};
                    }
                });
            }

            // EXPLOSIVE
            if(p.type==="explosive"){
                p.countdown--;
                if(p.countdown<=0){
                    explode(row,col);
                    world[row][col]=null;
                    continue;
                }
            }

            // SOLIDS
            if(p.type==="solid"){
                let below = row+1<rows?world[row+1][col]:null;
                if(!below) { world[row+1][col]=p; world[row][col]=null; }
                // Sand + Water → sinks
                if(p.sinks && below && below.type==="liquid") {
                    world[row][col]=below;
                    world[row+1][col]=p;
                }
                // Sand + Lava → glass
                if(p.sinks && below && below.type==="liquid" && below.hot){
                    world[row+1][col]={...materials.glass};
                    world[row][col]=null;
                }
            }

            // LIQUIDS
            if(p.liquid){
                let below = row+1<rows?world[row+1][col]:null;
                if(!below){ world[row+1][col]=p; world[row][col]=null; }
                else {
                    let dir = Math.random()<0.5?-1:1;
                    if(col+dir>=0 && col+dir<cols && !world[row][col+dir]){
                        world[row][col+dir]=p;
                        world[row][col]=null;
                    }
                    // Water + Lava → Stone
                    if(p.type==="water" && below && below.type==="liquid" && below.hot){
                        world[row+1][col]={...materials.stone};
                        world[row][col]=null;
                    }
                    // Acid dissolve solids
                    if(p.corrosive && below && below.type==="solid"){
                        world[row+1][col]=p;
                        world[row][col]=null;
                    }
                }
            }

            // GASES
            if(p.gas){
                let above = row-1>=0?world[row-1][col]:null;
                if(!above){ world[row-1][col]=p; world[row][col]=null; }
            }
        }
    }
}

// Explosion helper
function explode(row,col){
    for(let y=-2;y<=2;y++){
        for(let x=-2;x<=2;x++){
            let r=row+y, c=col+x;
            if(r>=0 && r<rows && c>=0 && c<cols) world[r][c]=null;
        }
    }
}

// Draw
function draw(){
    ctx.clearRect(0,0,width,height);
    for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
            let p = world[r][c];
            if(p){
                ctx.fillStyle=p.color;
                ctx.fillRect(c*particleSize,r*particleSize,particleSize,particleSize);
            }
        }
    }
}

// Loop
function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();