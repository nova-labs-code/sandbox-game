const canvas = document.getElementById("sandbox");
const ctx = canvas.getContext("2d");
let width, height, cols, rows;
const particleSize = 4;
let world = [];
let currentMaterial = "sand";
let elements = [];

// Load elements.json
fetch("elements.json")
    .then(res=>res.json())
    .then(data=>{
        elements = data;
        buildToolbar();
    });

// Build toolbar dynamically
function buildToolbar(){
    const toolbar = document.getElementById("toolbar");
    const categories = [...new Set(elements.map(e=>e.category))];
    categories.forEach(cat=>{
        const catEls = elements.filter(e=>e.category===cat);
        catEls.forEach(el=>{
            const btn = document.createElement("button");
            btn.textContent = el.name;
            btn.style.backgroundColor = el.color;
            btn.addEventListener("click", ()=>currentMaterial = el.name);
            toolbar.appendChild(btn);
        });
    });
}

// Resize canvas
function resize(){
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cols = Math.floor(width/particleSize);
    rows = Math.floor(height/particleSize);
    if(world.length===0) world = Array(rows).fill().map(()=>Array(cols).fill(null));
}
window.addEventListener("resize", resize);
resize();

// Spawn particle
function spawnParticle(x,y){
    const col = Math.floor(x/particleSize);
    const row = Math.floor(y/particleSize);
    const el = elements.find(e=>e.name===currentMaterial);
    if(col>=0 && col<cols && row>=0 && row<rows){
        world[row][col] = {...el, lifetime: el.lifetime, countdown: el.countdown};
    }
}

// Mouse & touch input
canvas.addEventListener("mousemove", e=>{ if(e.buttons===1) spawnParticle(e.clientX,e.clientY); });
canvas.addEventListener("touchmove", e=>{ e.preventDefault(); for(let t of e.touches) spawnParticle(t.clientX,t.clientY); });

// Physics update
function update(){
    for(let row=rows-1; row>=0; row--){
        for(let col=0; col<cols; col++){
            let p = world[row][col]; if(!p) continue;

            // FIRE logic
            if(p.type==="fire"){
                p.lifetime--; if(p.lifetime<=0){ world[row][col]=null; continue; }
                [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx,dy])=>{
                    let r=row+dy, c=col+dx;
                    if(r>=0 && r<rows && c>=0 && c<cols){
                        let n = world[r][c]; 
                        if(n && n.flammable) world[r][c] = {...elements.find(e=>e.name==="fire"), lifetime:50};
                    }
                });
            }

            // SOLID + LIQUID physics
            if(p.type==="solid" || p.liquid){
                let below = row+1<rows?world[row+1][col]:null;
                if(!below){ world[row+1][col]=p; world[row][col]=null; }
                else if(p.sinks && below && below.liquid){ world[row][col]=below; world[row+1][col]=p; }
                if(p.sinks && below && below.hot){ world[row+1][col]={...elements.find(e=>e.name==="glass")}; world[row][col]=null; }
                if(p.type==="water" && below && below.hot){ world[row+1][col]={...elements.find(e=>e.name==="stone")}; world[row][col]=null; }
            }

            // GAS physics
            if(p.gas){
                let above = row-1>=0?world[row-1][col]:null;
                if(!above){ world[row-1][col]=p; world[row][col]=null; }
            }

            // Explosives
            if(p.explosive){
                p.countdown--; if(p.countdown<=0){ explode(row,col); world[row][col]=null; }
            }
        }
    }
}

// Explosion
function explode(row,col){
    for(let y=-3;y<=3;y++) for(let x=-3;x<=3;x++){
        let r=row+y, c=col+x;
        if(r>=0 && r<rows && c>=0 && c<cols) world[r][c]=null;
    }
}

// Draw
function draw(){
    ctx.clearRect(0,0,width,height);
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        let p=world[r][c];
        if(p){ ctx.fillStyle=p.color; ctx.fillRect(c*particleSize,r*particleSize,particleSize,particleSize); }
    }
}

// Main loop
function loop(){ update(); draw(); requestAnimationFrame(loop); }
loop();