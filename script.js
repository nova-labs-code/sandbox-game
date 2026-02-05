// CONFIG
const worldLength = 30; // number of tiles in line
let world = Array(worldLength).fill(0); // 0 = empty, 1 = obstacle
let tileSize;
let score = 0;
let gameOver = false;

// PLAYER
let playerPos = 0;

// SETUP CANVAS
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    tileSize = Math.floor(canvas.width / world.length);
}
resizeCanvas();

// DRAW WORLD
function drawWorld(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const y = canvas.height / 2 - tileSize/2;

    for(let i = 0; i < world.length; i++){
        ctx.fillStyle = world[i] === 1 ? "brown" : "lightgreen";
        ctx.fillRect(i*tileSize, y, tileSize, tileSize);
        ctx.strokeStyle = "black";
        ctx.strokeRect(i*tileSize, y, tileSize, tileSize);
    }

    // Draw player
    ctx.fillStyle = "red";
    ctx.fillRect(playerPos * tileSize, y - tileSize, tileSize, tileSize);

    // Draw score
    ctx.fillStyle = "black";
    ctx.font = `${Math.floor(tileSize*0.8)}px Arial`;
    ctx.fillText(`Score: ${score}`, 10, 40);
}

// TOGGLE BLOCK ON CLICK/TOUCH
function toggleBlock(x){
    if(x >= 0 && x < world.length){
        world[x] = world[x] === 0 ? 1 : 0;
        drawWorld();
    }
}

// INPUT
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

// GAME LOOP
function update(){
    if(gameOver) return;

    // Move player
    playerPos++;
    if(playerPos >= world.length) playerPos = 0;

    // Check collision
    if(world[playerPos] === 1){
        gameOver = true;
        alert(`Game Over! Score: ${score}`);
        playerPos = 0;
        world = Array(worldLength).fill(0);
        score = 0;
        gameOver = false;
    } else {
        score++;
    }

    drawWorld();
}

// INITIAL DRAW
drawWorld();

// LOOP
setInterval(update, 500); // adjust speed here

// RESIZE
window.addEventListener("resize", () => {
    resizeCanvas();
    drawWorld();
});