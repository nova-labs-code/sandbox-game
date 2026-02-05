const canvas = document.getElementById("sandbox");
const ctx = canvas.getContext("2d");

let width, height;
let sandSize = 4; // size of each sand particle in px
let sandParticles = []; // array of all sand particles

// Resize canvas to fill screen
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// Sand particle class
class Sand {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    update() {
        if(this.y + sandSize < height) {
            // Check below
            if(!isBlocked(this.x, this.y + sandSize)) {
                this.y += sandSize; // fall down
            } else {
                // Try left or right
                let leftBlocked = isBlocked(this.x - sandSize, this.y + sandSize);
                let rightBlocked = isBlocked(this.x + sandSize, this.y + sandSize);
                if(!leftBlocked) this.x -= sandSize;
                else if(!rightBlocked) this.x += sandSize;
            }
        }
    }
    draw() {
        ctx.fillStyle = "goldenrod"; // sand color
        ctx.fillRect(this.x, this.y, sandSize, sandSize);
    }
}

// Simple collision check
function isBlocked(x, y) {
    for(let p of sandParticles) {
        if(Math.abs(p.x - x) < sandSize && Math.abs(p.y - y) < sandSize) return true;
    }
    return false;
}

// Add sand at position
function addSand(x, y, amount = 5) {
    for(let i=0; i<amount; i++){
        sandParticles.push(new Sand(x, y));
    }
}

// Handle mouse & touch
canvas.addEventListener("mousemove", e => {
    if(e.buttons === 1) addSand(e.clientX, e.clientY);
});
canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    let touch = e.touches[0];
    addSand(touch.clientX, touch.clientY);
});

// Main loop
function loop(){
    ctx.clearRect(0,0,width,height);
    for(let p of sandParticles){
        p.update();
        p.draw();
    }
    requestAnimationFrame(loop);
}
loop();