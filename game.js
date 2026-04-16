const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score-val');
const energyEl = document.getElementById('energy-val');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Game State
let gameState = 'start'; 
let score = 0;
let energy = 100;
let lastTime = 0;
let enemySpawnTimer = 0;
let enemySpawnInterval = 1500;

// Configs
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// Entities
const player = {
    x: CANVAS_WIDTH / 2 - 20,
    y: CANVAS_HEIGHT - 60,
    width: 40,
    height: 30,
    speed: 6,
    color: '#0ff'
};

const projectiles = [];
const enemies = [];
const particles = [];

// Input Handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') {
        if (gameState === 'playing' && !keys.Space) {
            shoot();
        } else if (gameState === 'start' || gameState === 'gameover') {
            startGame();
        }
        keys.Space = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

function startGame() {
    gameState = 'playing';
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    
    score = 0;
    energy = 100;
    updateUI();
    
    player.x = CANVAS_WIDTH / 2 - player.width / 2;
    projectiles.length = 0;
    enemies.length = 0;
    particles.length = 0;
    
    enemySpawnTimer = 0;
    enemySpawnInterval = 1500;
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'gameover';
    finalScoreEl.innerText = score;
    gameOverScreen.classList.add('active');
}

function updateUI() {
    scoreEl.innerText = score;
    energyEl.innerText = Math.max(0, energy) + '%';
    if (energy <= 20) {
        energyEl.style.color = '#f00';
    } else {
        energyEl.style.color = '#0ff';
    }
}

function shoot() {
    projectiles.push({
        x: player.x + player.width / 2 - 2.5,
        y: player.y,
        width: 5,
        height: 15,
        speed: 8,
        color: '#ff0'
    });
}

function spawnEnemy() {
    const rand = Math.random();
    let type = 'drone';
    let width = 30;
    let height = 30;
    let speed = 2;
    let points = 10;
    let color = '#f00';
    let x = Math.random() * (CANVAS_WIDTH - width);
    let y = -height;
    let dirX = 0;
    
    // Mothership: 5% chance
    if (rand > 0.95) {
        type = 'mothership';
        width = 60;
        height = 25;
        speed = 1.5;
        points = 100;
        color = '#f0f';
        y = 30;
        dirX = Math.random() > 0.5 ? 1 : -1;
        x = dirX === 1 ? -width : CANVAS_WIDTH;
    } 
    // Interceptor: 25% chance
    else if (rand > 0.70) {
        type = 'interceptor';
        width = 25;
        height = 25;
        speed = 3.5;
        points = 25;
        color = '#fa0';
    }

    enemies.push({ x, y, width, height, speed, type, points, color, dirX });
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            decay: Math.random() * 0.02 + 0.02,
            color: color
        });
    }
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function update(dt) {
    if (gameState !== 'playing') return;

    // Movement Player
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < CANVAS_WIDTH - player.width) player.x += player.speed;

    // Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.y -= p.speed;
        if (p.y < -p.height) {
            projectiles.splice(i, 1);
        }
    }

    // Spawn Enemies
    enemySpawnTimer += dt;
    if (enemySpawnTimer > enemySpawnInterval) {
        spawnEnemy();
        enemySpawnTimer = 0;
        if (enemySpawnInterval > 500) enemySpawnInterval -= 15; // Increase difficulty
    }

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        
        if (e.type === 'drone') {
            e.y += e.speed;
        } else if (e.type === 'interceptor') {
            e.y += e.speed;
            e.x += Math.sin(e.y / 40) * 4; 
        } else if (e.type === 'mothership') {
            e.x += e.speed * e.dirX;
        }

        // Out of bounds
        if (e.y > CANVAS_HEIGHT) {
            energy -= 10;
            updateUI();
            enemies.splice(i, 1);
            if (energy <= 0) gameOver();
            continue;
        } else if (e.type === 'mothership' && (e.x > CANVAS_WIDTH + 10 || e.x < -e.width - 10)) {
            enemies.splice(i, 1);
            continue;
        }
        
        // Player Collision
        if (checkCollision(player, e)) {
            createParticles(e.x + e.width/2, e.y + e.height/2, e.color, 20);
            createParticles(player.x + player.width/2, player.y + player.height/2, player.color, 10);
            energy -= 20;
            updateUI();
            enemies.splice(i, 1);
            if (energy <= 0) gameOver();
            continue;
        }

        // Projectile Collision
        for (let j = projectiles.length - 1; j >= 0; j--) {
            let p = projectiles[j];
            if (checkCollision(p, e)) {
                createParticles(e.x + e.width/2, e.y + e.height/2, e.color, 15);
                score += e.points;
                updateUI();
                enemies.splice(i, 1);
                projectiles.splice(j, 1);
                break; // Break projectile loop since enemy is dead
            }
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState !== 'playing') return;

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw Player Top
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x + 15, player.y - 10, 10, 10);

    // Draw Projectiles
    projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Draw Enemies
    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        if (e.type === 'drone') {
            ctx.fillRect(e.x, e.y, e.width, e.height);
        } else if (e.type === 'interceptor') {
            ctx.beginPath();
            ctx.moveTo(e.x + e.width/2, e.y + e.height);
            ctx.lineTo(e.x, e.y);
            ctx.lineTo(e.x + e.width, e.y);
            ctx.fill();
        } else if (e.type === 'mothership') {
            ctx.fillRect(e.x, e.y, e.width, e.height);
            ctx.fillStyle = '#fff';
            // windows
            ctx.fillRect(e.x + 10, e.y + 5, 10, 5);
            ctx.fillRect(e.x + 40, e.y + 5, 10, 5);
        }
    });
}

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;
    
    update(dt);
    draw();
    
    if (gameState === 'playing') {
        requestAnimationFrame(gameLoop);
    }
}
