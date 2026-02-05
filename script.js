// CONFIG
const worldLength = 30; // number of tiles in the line
let tileSize = 50; // size of each tile in px
let world = Array(worldLength).fill(0); // 0 = empty, 1 = block

// SETUP CANVAS
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// DRAW WORLD
function drawWorld(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const y = canvas.height / 2 - tileSize/2;
    for(let i = 0; i < world.length; i++){
        ctx.fillStyle = world[i] === 1 ? "brown" : "lightgreen";
        ctx.fillRect(i * tileSize, y, tileSize, tileSize);
        ctx.strokeStyle = "black";
        ctx.strokeRect(i * tileSize, y, tileSize, tileSize);
    }
}

// TOGGLE BLOCK ON CLICK / TOUCH
function toggleBlock(x){
    if(x >= 0 && x < world.length){
        world[x] = world[x] === 0 ? 1 : 0;
        drawWorld();
        saveWorld();
    }
}

// CLICK / TOUCH EVENTS
canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / tileSize);
    toggleBlock(x);
});

canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.touches[0].clientX - rect.left) / tileSize);
    toggleBlock(x);
});

// LOCAL STORAGE SAVE / LOAD
function saveWorld(){
    localStorage.setItem("sandbox1D", JSON.stringify(world));
}

function loadWorld(){
    const saved = localStorage.getItem("sandbox1D");
    if(saved) world = JSON.parse(saved);
}

// INITIALIZE
loadWorld();
drawWorld();

// RESIZE HANDLING
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawWorld();
});