import { drawBackground, drawBrickWalls, drawSteelWalls, drawFuturePosition, drawPredictionLineOfSight, drawPerpendicularBulletWarnings, drawBushes, drawTank, drawBullets, drawBase, drawRivers, loadEntitySprites, drawLoadingScreen } from './renderer.js';
import { updatePlayerDisplay, updateCanvasSize, updateEnemyDisplay, updateWallCount, updateAIDisplayInfo } from './gameUI.js';
import { initializeMap, loadAllLevelImages } from './mapLoader.js';
import { checkBulletBrickCollisionPrecise, checkPhysicalCollision, checkBulletSteelCollision, checkTankVisualCollision, wouldCollideWithRiver, checkAllPowerUpCollisions, wouldCollideWithSteelWalls, countCollisionWithRiver, countCollisionWithSteelWalls } from './collisionDetection.js';
import { createBulletExplosion, updateParticleEffects, drawParticleEffects, loadParticleSprites, createBigExplosion, createSpawnAnimation } from './particles.js';
import { isBulletPerpendicularToMovement, checkPerpendicularPathIntersection, willPathIntersectBullet, willWalkIntoPerpendicularBullet, isNextToEnemy, getShootingDirectionForAdjacentEnemy } from './mapAwareness.js';
import { PowerUp } from './PowerUp.js';
import { initializeSound } from './soundLoader.js';
import { MobileGamepad } from './MobileGamepad.js';


// ========== GAME CONSTANTS ==========
const GRID_SIZE = 26;
const CELL_SIZE = 8;
const BASE_SIZE = GRID_SIZE * CELL_SIZE;

const TANK_SIZE = 2;
const PLAYER_SPEED = 0.75;
const BULLET_SPEED = 2;
const FAST_BULLET_SPEED = 4; // NEW: For power level 2+
const BULLET_SIZE = 0.3;
const BULLET_COOLDOWN = 10;
const FAST_BULLET_COOLDOWN = 4; // NEW: For power level 2+
const BULLET_OFFSET = 0.55; // How far from tank edge bullets spawn
const MAX_BULLET = 2;

const INVULNERABLE_COUNTDOWN = 200;

// AI Constants - Enhanced for bullet avoidance
const AI_UPDATE_INTERVAL = 3;
const AI_SHOOT_DISTANCE = 8;
const AI_AVOID_DISTANCE = 4;
const AI_BULLET_DESTROY_DISTANCE = 3;
const AI_PATHFINDING_DEPTH = 15;
const AI_SHOOT_COOLDOWN = 4;
const AI_ALIGNMENT_TOLERANCE = 0.5;
const AI_BULLET_PREDICTION_FRAMES = 30; // Predict bullets 30 frames ahead
const AI_BULLET_COLLISION_THRESHOLD = 1; // Cells away considered collision
const AI_MIN_TTC = 15; // Minimum time-to-collision to consider safe

// Predictive Shooting Constants
const AI_PREDICTION_TIME = 1; // seconds
const AI_PREDICTION_FRAMES = Math.round(AI_PREDICTION_TIME * 60); // 90 frames at 60fps
const AI_PREDICTION_DISTANCE_THRESHOLD = GRID_SIZE / 3; // Half screen distance
const AI_MIN_PREDICTION_DISTANCE = 8; // Minimum distance to use prediction

// Close Combat Constants
const CLOSE_COMBAT_DISTANCE = 3.5; // Cells away considered close combat
const IMMEDIATE_SHOOT_DISTANCE = 3; // If enemy is this close, shoot immediately
const PERPENDICULAR_BULLET_RISK_DISTANCE = 4; // Distance to consider perpendicular bullet risk

// ========== GAME STATE ==========
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

updateCanvasSize(BASE_SIZE, 3, canvas);
let gameState = "loading";
drawLoadingScreen("Initializing...", 0, ctx, gameState, canvas);
let titleY = canvas.height; // Start from bottom


const powerUp = new PowerUp();
const frozeTime = { time: 0 };

let zoomLevel = 3;
let frameCount = 0;
let enemySpawnCooldown = 120;
let gamePaused = false;
let showBoundingBox = false;
let showPredictions = false;
let totalEnemiesSpawned = 0;

// AI State
let aiEnabled = false;
let aiTargetEnemy = null;
let aiCurrentPath = [];
let aiLastUpdate = 0;
let enemiesKilled = 0;
let bulletsDodged = 0;
let bulletsDestroyed = 0;
let bricksDestroyed = 0;
let aiShooting = false;
let aiMoveCooldown = 0;
let aiShootCooldown = 0;
let aiShotDirection = null;
let aiStrategy = "Idle";
let enemyFacingPlayer = false;
let lineOfSightToEnemy = false;
let canShootEnemy = false;
let bulletCollisionRisk = "Safe";
let safeDirection = null;
let bulletTimeToCollision = Infinity;
let moveBlockedByBullet = false;
let aiAction = "None";
let dangerLevel = "Low";

// Prediction State
let predictionActive = false;
let enemyFuturePosition = null;
let predictionLineOfSight = false;
let enemyPathClear = false;
let shouldPredictiveShoot = false;

// New AI State
let perpendicularBulletRisk = "None";
let nextToEnemy = false;
let perpendicularBullets = [];

// Pathfinding State
let aiPathBlockedByBrick = false;
let aiBrickTarget = null;

// Particle effects for bullet destruction
let particleEffects = [];

// Enemy spawn tracking
let spawnPositionIndex = 0;
const SPAWN_POSITIONS = [
    { name: "Top Left", x: 0, y: 0 },
    { name: "Top Middle", x: 12, y: 0 },
    { name: "Top Right", x: 24, y: 0 }
];

// Brick walls - NEW: Destructible brick blocks
let brickWalls = [];
// Steel walls - NEW: Indestructible steel blocks
let steelWalls = [];
// Rivers - NEW: Water obstacles that bullets pass through
let rivers = [];
let bushes = [];

// AI tank with power level
let AITank = {
    x: 16, y: 24, direction: 0,
    bx: 16, by: 24,
    moving: false,
    powerLevel: 1, // NEW: Power level (1-5)
    isAlive: false,
    respawnTimer: 52, canCollide: true,
    canShoot: true,
    needsAlignment: false,
    lastDirectionChangeFrame: 0,
    playerType: 'ai',
    bulletCooldown: 0,
    firingDirection: null,
    invulnerableTimer: INVULNERABLE_COUNTDOWN,
    lives: 3,
    score: 0

};

// Human player tank with power level
let humanTank = {
    x: 8, y: 24, direction: 0,
    bx: 8, by: 24,
    moving: false,
    powerLevel: 1, // NEW: Power level (1-5)
    isAlive: false,
    respawnTimer: 52, canCollide: true,
    canShoot: true,
    needsAlignment: false,
    lastDirectionChangeFrame: 0,
    playerType: 'human',
    bulletCooldown: 0,
    firingDirection: null,
    invulnerableTimer: INVULNERABLE_COUNTDOWN,
    lives: 3,
    score: 0
};

// Enemy tanks
let enemyTanks = [];

// Bullets
let bullets = [];

// Input state
let keys = {
    'w': false, 'a': false, 's': false, 'd': false,
    'arrowup': false, 'arrowleft': false, 'arrowdown': false, 'arrowright': false,
    ' ': false, 'l': false
};

let lastDirectionKey = null;
let lastHumanDirectionKey = null;
let bulletCooldown = 0;
let fireKeyPressed = false;
let humanFireKeyPressed = false;

let base = {
    x: 12, // 左上角X坐标
    y: 24, // 左上角Y坐标
    width: 2,
    height: 2,
    isAlive: true
};

let gameOver = false;
let useSimplePathfindingCountdown = 30;
let seekPowerUpDirectionChangeCountDown = 0;

//sound
let sound = [];




let level = { levelParameter: null };
let levelNum = 1;
let stageClear = false;



// Get bullet speed based on power level
function getBulletSpeed(tank) {
    return tank.powerLevel >= 2 ? FAST_BULLET_SPEED : BULLET_SPEED;
}

// Get bullet cooldown based on power level
function getBulletCooldown(tank) {
    return tank.powerLevel > 2 ? FAST_BULLET_COOLDOWN : BULLET_COOLDOWN;
}

// Check if tank can shoot multiple bullets (power level 3+)
function canShootMultipleBullets(tank) {
    return tank.powerLevel >= 3;
}


// Handle tank hit (for power level 5 with extra life)
function handleTankHit(tank) {
    if (tank.powerLevel == 5) {
        // Use extra life and downgrade to level 3
        tank.powerLevel = 3;
        return false; // Tank survives
    }
    return true; // Tank should be destroyed
}


// Check if we can shoot an adjacent enemy immediately
function canShootAdjacentEnemy(enemy) {
    if (!enemy || !isNextToEnemy(enemy, AITank, IMMEDIATE_SHOOT_DISTANCE, CLOSE_COMBAT_DISTANCE)) return false;

    if (!AITank.isAlive || !AITank.canShoot) return false;
    if (bulletCooldown > 0) return false;
    if (bullets.filter(b => b.isAITank).length >= (canShootMultipleBullets(AITank) ? MAX_BULLET : 1)) return false;
    if (aiShootCooldown > 0) return false;

    // Get the shooting direction
    const shootDir = getShootingDirectionForAdjacentEnemy(enemy, AITank);
    if (shootDir === null) return false;

    // Check line of sight (simplified for adjacent enemies)
    const dx = Math.abs(AITank.bx - enemy.x);
    const dy = Math.abs(AITank.by - enemy.y);

    // For adjacent enemies, we have line of sight if:
    // 1. We're aligned on X or Y axis within tolerance
    // 2. No walls between us (ignore rivers)
    const isAlignedX = dy <= 1;
    const isAlignedY = dx <= 1;

    if (!isAlignedX && !isAlignedY) return false;

    // Check for walls (brick and steel) but ignore rivers
    return !checkObstacleBetween(AITank.bx, AITank.by, enemy.x, enemy.y);
}

// ========== PREDICTIVE SHOOTING FUNCTIONS ==========

// Calculate enemy's future position after n seconds
function calculateEnemyFuturePosition(enemy, secondsAhead = AI_PREDICTION_TIME) {
    if (!enemy) return null;

    const framesAhead = Math.round(secondsAhead * 60); // Convert seconds to frames at 60fps
    let futureX = enemy.x;
    let futureY = enemy.y;

    // Calculate based on current direction and speed
    switch (enemy.direction) {
        case 0: // Up
            futureY -= (enemy.speed / CELL_SIZE) * framesAhead;
            break;
        case 1: // Right
            futureX += (enemy.speed / CELL_SIZE) * framesAhead;
            break;
        case 2: // Down
            futureY += (enemy.speed / CELL_SIZE) * framesAhead;
            break;
        case 3: // Left
            futureX -= (enemy.speed / CELL_SIZE) * framesAhead;
            break;
    }

    // Constrain to battlefield
    futureX = Math.max(0, Math.min(GRID_SIZE - TANK_SIZE, futureX));
    futureY = Math.max(0, Math.min(GRID_SIZE - TANK_SIZE, futureY));

    return { x: futureX, y: futureY, frames: framesAhead };
}

// Check if enemy has clear path to future position
function checkEnemyPathToFuture(enemy, futurePos) {
    if (!enemy || !futurePos) return false;

    const startX = enemy.x;
    const startY = enemy.y;
    const endX = futurePos.x;
    const endY = futurePos.y;

    // Calculate direction vector
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check path at multiple points
    const steps = Math.ceil(distance * 2); // Check more points for longer distances
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = startX + dx * t;
        const checkY = startY + dy * t;

        // Check for walls at this point (brick and steel, but NOT rivers for bullets)
        if (wouldCollideWithObstacle(checkX, checkY)) {
            return false;
        }

        // Check if the enemy would need to change direction to reach this point
        // (simplified - assumes enemy continues in current direction)
        const expectedX = startX + (enemy.speed / CELL_SIZE) * AI_PREDICTION_FRAMES * t * (enemy.direction === 1 ? 1 : enemy.direction === 3 ? -1 : 0);
        const expectedY = startY + (enemy.speed / CELL_SIZE) * AI_PREDICTION_FRAMES * t * (enemy.direction === 2 ? 1 : enemy.direction === 0 ? -1 : 0);

        // If the straight path diverges too much from predicted path, it's not clear
        if (Math.abs(checkX - expectedX) > 2 || Math.abs(checkY - expectedY) > 2) {
            return false;
        }
    }

    return true;
}

// Check if we have line of sight to future position
function hasLineOfSightToFuturePosition(futurePos, shootingDirection = null) {
    if (!futurePos) return false;

    // Determine the direction we would need to face to shoot at future position
    const dx = futurePos.x - AITank.x;
    const dy = futurePos.y - AITank.y;

    let requiredDirection = null;

    // Check if we're aligned horizontally or vertically with enough precision
    if (Math.abs(dx) < AI_ALIGNMENT_TOLERANCE && dy < 0) {
        requiredDirection = 0; // Up
    } else if (Math.abs(dx) < AI_ALIGNMENT_TOLERANCE && dy > 0) {
        requiredDirection = 2; // Down
    } else if (Math.abs(dy) < AI_ALIGNMENT_TOLERANCE && dx > 0) {
        requiredDirection = 1; // Right
    } else if (Math.abs(dy) < AI_ALIGNMENT_TOLERANCE && dx < 0) {
        requiredDirection = 3; // Left
    }

    if (requiredDirection === null) return false;

    // If a specific shooting direction is required, check it
    if (shootingDirection !== null && requiredDirection !== shootingDirection) {
        return false;
    }

    // Check for walls between player and future position (ignore rivers for bullets)
    return !checkObstacleBetween(AITank.x, AITank.y, futurePos.x, futurePos.y);
}

// Check if we should use predictive shooting
function shouldUsePredictiveShooting(enemy) {
    if (!enemy) return false;

    // Calculate distance to enemy
    const dx = enemy.x - AITank.x;
    const dy = enemy.y - AITank.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only use prediction for distant enemies
    if (distance < AI_MIN_PREDICTION_DISTANCE || distance < AI_SHOOT_DISTANCE) {
        return false;
    }

    // Check if enemy is moving in a predictable direction
    // (not recently changed direction)
    if (frameCount - enemy.lastDirectionChangeFrame < 30) {
        return false;
    }

    return true;
}

// Calculate the shooting direction for a future position
function getShootingDirectionForFuturePosition(futurePos) {
    if (!futurePos) return null;

    const dx = futurePos.x - AITank.x;
    const dy = futurePos.y - AITank.y;

    // Determine which axis we're more aligned with
    if (Math.abs(dx) < Math.abs(dy)) {
        // More aligned vertically
        if (dy > 0) {
            return 2; // Down
        } else {
            return 0; // Up
        }
    } else {
        // More aligned horizontally
        if (dx > 0) {
            return 1; // Right
        } else {
            return 3; // Left
        }
    }
}



// Find the safest direction considering all enemy bullets
function findSafestDirection() {
    const enemyBullets = bullets.filter(b => !b.isAITank && !b.isHuman);
    if (enemyBullets.length === 0) return { direction: null, dangerScore: 0, ttc: Infinity };

    const directions = [
        { dir: 0, name: 'up', dx: 0, dy: -1, dangerScore: 0, ttc: Infinity, perpendicularDanger: 0 },
        { dir: 1, name: 'right', dx: 1, dy: 0, dangerScore: 0, ttc: Infinity, perpendicularDanger: 0 },
        { dir: 2, name: 'down', dx: 0, dy: 1, dangerScore: 0, ttc: Infinity, perpendicularDanger: 0 },
        { dir: 3, name: 'left', dx: -1, dy: 0, dangerScore: 0, ttc: Infinity, perpendicularDanger: 0 },
        { dir: -1, name: 'stop', dx: 0, dy: 0, dangerScore: 0, ttc: Infinity, perpendicularDanger: 0 } // Stop moving
    ];

    // Evaluate each direction
    for (const dir of directions) {
        let totalDanger = 0;
        let perpendicularDanger = 0;
        let minTTC = Infinity;

        if (dir.dir === -1) {
            // For stopping, check current position
            for (const bullet of enemyBullets) {
                const dx = bullet.x - AITank.x;
                const dy = bullet.y - AITank.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const ttc = distance / (bullet.speed / CELL_SIZE);

                if (ttc < minTTC) minTTC = ttc;

                // Higher danger if bullet is heading toward current position
                let bulletHeadingToward = false;
                switch (bullet.direction) {
                    case 0: bulletHeadingToward = Math.abs(dx) < 2 && dy < 0; break;
                    case 1: bulletHeadingToward = Math.abs(dy) < 2 && dx > 0; break;
                    case 2: bulletHeadingToward = Math.abs(dx) < 2 && dy > 0; break;
                    case 3: bulletHeadingToward = Math.abs(dy) < 2 && dx < 0; break;
                }

                if (bulletHeadingToward) {
                    totalDanger += Math.max(0, 100 - (distance * 20));
                }

                // Check for perpendicular bullets that could hit if we were moving
                if (isBulletPerpendicularToMovement(bullet, AITank) && distance < PERPENDICULAR_BULLET_RISK_DISTANCE) {
                    perpendicularDanger += Math.max(0, 80 - (distance * 15));
                }
            }
        } else {
            // Check if moving in this direction is valid
            const newX = AITank.x + dir.dx;
            const newY = AITank.y + dir.dy;

            // Check boundaries
            if (newX < 0 || newX > GRID_SIZE - TANK_SIZE ||
                newY < 0 || newY > GRID_SIZE - TANK_SIZE ||
                wouldCollideWithObstacle(newX, newY) ||
                wouldCollideWithRiver(newX, newY, rivers)) { // NEW: Check river collision
                dir.dangerScore = 1000; // Very high danger (impossible move)
                continue;
            }

            // Check bullet intersections
            for (const bullet of enemyBullets) {
                const intersection = willPathIntersectBullet(AITank.x, AITank.y, dir.dir, bullet, CELL_SIZE, PLAYER_SPEED, AI_BULLET_PREDICTION_FRAMES, AI_BULLET_COLLISION_THRESHOLD);

                if (intersection.willIntersect) {
                    // Danger increases with shorter TTC
                    const danger = Math.max(0, 100 - (intersection.ttc * 3));
                    totalDanger += danger;

                    // Extra danger for perpendicular bullets
                    if (isBulletPerpendicularToMovement(bullet, AITank)) {
                        perpendicularDanger += danger * 1.5;
                    }

                    if (intersection.ttc < minTTC) {
                        minTTC = intersection.ttc;
                    }
                }

                // Also consider current proximity to bullets
                const dx = bullet.x - newX;
                const dy = bullet.y - newY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 3) {
                    totalDanger += 30;
                    if (isBulletPerpendicularToMovement(bullet, AITank)) {
                        perpendicularDanger += 20;
                    }
                }

                // Check for perpendicular crossing
                if (isBulletPerpendicularToMovement(bullet, AITank)) {
                    const crossing = checkPerpendicularPathIntersection(newX, newY, dir.dir, bullet, CELL_SIZE, PLAYER_SPEED, BULLET_SPEED, AI_BULLET_COLLISION_THRESHOLD);
                    if (crossing.willCross && crossing.ttc < 25) {
                        perpendicularDanger += Math.max(0, 70 - (crossing.ttc * 2));
                    }
                }
            }
        }

        dir.dangerScore = totalDanger + perpendicularDanger * 1.2; // Weight perpendicular danger more
        dir.perpendicularDanger = perpendicularDanger;
        dir.ttc = minTTC;
    }

    // Find the safest direction (lowest danger score)
    directions.sort((a, b) => a.dangerScore - b.dangerScore);

    // If the safest direction still has high danger, consider stopping
    if (directions[0].dangerScore > 60 && directions[0].ttc < AI_MIN_TTC) {
        return {
            direction: -1,
            dangerScore: directions[0].dangerScore,
            ttc: directions[0].ttc,
            perpendicularDanger: directions[0].perpendicularDanger
        };
    }

    return {
        direction: directions[0].dir,
        dangerScore: directions[0].dangerScore,
        ttc: directions[0].ttc,
        perpendicularDanger: directions[0].perpendicularDanger
    };
}

// Check if current intended move will lead to bullet collision
function willCurrentMoveCollideWithBullet() {
    const enemyBullets = bullets.filter(b => !b.isAITank && !b.isHuman);
    if (enemyBullets.length === 0) return { willCollide: false };

    // First check for perpendicular bullets specifically
    const perpendicularCheck = willWalkIntoPerpendicularBullet(AITank, bullets, CELL_SIZE, PLAYER_SPEED, BULLET_SPEED, AI_BULLET_PREDICTION_FRAMES, AI_BULLET_COLLISION_THRESHOLD, PERPENDICULAR_BULLET_RISK_DISTANCE, AI_MIN_TTC, perpendicularBullets);
    if (perpendicularCheck.willIntersect) {
        return {
            willCollide: true,
            bullet: perpendicularCheck.bullet,
            ttc: perpendicularCheck.ttc,
            type: "perpendicular",
            riskLevel: perpendicularCheck.riskLevel
        };
    }

    // If player is not moving, check if bullets are heading toward current position
    if (!AITank.moving) {
        for (const bullet of enemyBullets) {
            const dx = bullet.x - AITank.x;
            const dy = bullet.y - AITank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 3) {
                let bulletHeadingToward = false;
                switch (bullet.direction) {
                    case 0: bulletHeadingToward = Math.abs(dx) < 2 && dy < 0; break;
                    case 1: bulletHeadingToward = Math.abs(dy) < 2 && dx > 0; break;
                    case 2: bulletHeadingToward = Math.abs(dx) < 2 && dy > 0; break;
                    case 3: bulletHeadingToward = Math.abs(dy) < 2 && dx < 0; break;
                }

                if (bulletHeadingToward) {
                    return { willCollide: true, bullet: bullet, ttc: distance / (bullet.speed / CELL_SIZE) };
                }
            }
        }
        return { willCollide: false };
    }

    // If player is moving, check path intersection
    for (const bullet of enemyBullets) {
        const intersection = willPathIntersectBullet(
            AITank.x, AITank.y,
            AITank.direction,
            bullet,
            CELL_SIZE,
            PLAYER_SPEED,
            AI_BULLET_PREDICTION_FRAMES,
            AI_BULLET_COLLISION_THRESHOLD
        );

        if (intersection.willIntersect && intersection.ttc < AI_MIN_TTC) {
            return {
                willCollide: true,
                bullet: bullet,
                ttc: intersection.ttc,
                distance: intersection.distance
            };
        }
    }

    return { willCollide: false };
}

// Enhanced bullet destruction with prediction
function canDestroyBulletWithPrediction() {
    const enemyBullets = bullets.filter(b => !b.isAITank && !b.isHuman);
    if (enemyBullets.length === 0) return null;

    let bestTarget = null;
    let bestScore = -Infinity;

    for (const bullet of enemyBullets) {
        const dx = bullet.x - AITank.x;
        const dy = bullet.y - AITank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only consider bullets within destroy distance
        if (distance > AI_BULLET_DESTROY_DISTANCE * 1.5) continue;

        // Check if bullet is heading toward player (high priority to destroy)
        let bulletHeadingToward = false;
        switch (bullet.direction) {
            case 0: bulletHeadingToward = Math.abs(dx) < 1.5 && dy < 0; break;
            case 1: bulletHeadingToward = Math.abs(dy) < 1.5 && dx > 0; break;
            case 2: bulletHeadingToward = Math.abs(dx) < 1.5 && dy > 0; break;
            case 3: bulletHeadingToward = Math.abs(dy) < 1.5 && dx < 0; break;
        }

        // Check if we have line of sight to the bullet (ignore rivers)
        let inLineOfSight = false;
        let requiredDirection = null;

        // Check each shooting direction
        for (let dir = 0; dir < 4; dir++) {
            let lineCheck = false;
            switch (dir) {
                case 0: lineCheck = Math.abs(dx) < 0.5 && dy < 0; break;
                case 1: lineCheck = Math.abs(dy) < 0.5 && dx > 0; break;
                case 2: lineCheck = Math.abs(dx) < 0.5 && dy > 0; break;
                case 3: lineCheck = Math.abs(dy) < 0.5 && dx < 0; break;
            }

            if (lineCheck && !checkObstacleBetween(AITank.x, AITank.y, bullet.x, bullet.y)) {
                inLineOfSight = true;
                requiredDirection = dir;
                break;
            }
        }

        if (!inLineOfSight) continue;

        // Calculate score: higher for bullets heading toward player, closer bullets
        let score = 100 - (distance * 20);
        if (bulletHeadingToward) score += 50;

        // Extra bonus for perpendicular bullets (high risk of walking into them)
        if (isBulletPerpendicularToMovement(bullet, AITank)) {
            score += 30;
        }

        // Bonus for bullets that will hit soon
        const ttc = distance / (bullet.speed / CELL_SIZE);
        if (ttc < 10) score += (10 - ttc) * 10;

        if (score > bestScore) {
            bestScore = score;
            bestTarget = {
                bullet: bullet,
                direction: requiredDirection,
                score: score,
                distance: distance,
                headingToward: bulletHeadingToward,
                ttc: ttc,
                isPerpendicular: isBulletPerpendicularToMovement(bullet, AITank)
            };
        }
    }

    return bestTarget;
}






// ========== COLLISION SYSTEM FUNCTIONS ==========




function wouldCollideWithBase(visualX, visualY) {
    return checkTankVisualCollision(visualX, visualY, base.x, base.y, base.width, base.height);
}

// Check collision with any wall (brick or steel) OR river
function wouldCollideWithObstacle(visualX, visualY) {
    // Check base collision first
    if (wouldCollideWithBase(visualX, visualY)) {
        return true;
    }

    // Check brick walls
    for (const wall of brickWalls) {
        if (wall.isAlive()) {
            if (checkTankVisualCollision(visualX, visualY, wall.x, wall.y, 1, 1)) {
                return true;
            }
        }
    }

    // Check steel walls
    for (const steel of steelWalls) {
        if (steel.isAlive) {
            if (checkTankVisualCollision(visualX, visualY, steel.x, steel.y, 1, 1)) {
                return true;
            }
        }
    }

    // NEW: Check rivers (tanks cannot cross rivers)
    if (wouldCollideWithRiver(visualX, visualY, rivers)) {
        return true;
    }

    return false;
}

// Check collision with steel walls only (not brick)
function wouldCollideWithSteelOnly(visualX, visualY) {
    // Check base collision first
    if (wouldCollideWithBase(visualX, visualY)) {
        return true;
    }

    // Check steel walls only
    for (const steel of steelWalls) {
        if (steel.isAlive) {
            if (checkTankVisualCollision(visualX, visualY, steel.x, steel.y, 1, 1)) {
                return true;
            }
        }
    }

    // NEW: Check rivers (tanks cannot cross rivers)
    if (wouldCollideWithRiver(visualX, visualY, rivers)) {
        return true;
    }

    return false;
}

function wouldCollideWithObstacleAtPosition(newX, newY) {
    return wouldCollideWithObstacle(newX, newY);
}

function getSafePositionNearWall(currentX, currentY, newX, newY, direction) {
    const roundedCurrentX = Math.round(currentX);
    const roundedCurrentY = Math.round(currentY);
    const roundedNewX = Math.round(newX);
    const roundedNewY = Math.round(newY);

    if (direction === 1 || direction === 3) {
        if (roundedNewY !== roundedCurrentY) {
            return { x: newX, y: roundedCurrentY };
        }
    }
    else if (direction === 0 || direction === 2) {
        if (roundedNewX !== roundedCurrentX) {
            return { x: roundedCurrentX, y: newY };
        }
    }

    return { x: currentX, y: currentY };
}

function updateTankPhysicalBox(tank) {
    tank.bx = Math.round(tank.x);
    tank.by = Math.round(tank.y);
}



// ========== BRICK WALL COLLISION AND DAMAGE ==========

// Check if bullet collides with a brick wall and damage it (FIXED VERSION)
function checkBulletBrickCollision(bullet) {
    const collidedBricks = checkBulletBrickCollisionPrecise(bullet, brickWalls, BULLET_SIZE);

    if (collidedBricks.length > 0) {
        let totalBitsDestroyed = 0;
        let lastHitSide = null;

        // Check if bullet is from a power level 4+ tank
        const isPowerLevel4Plus = (bullet.isAITank && AITank.powerLevel >= 4) ||
            (bullet.isHuman && humanTank.powerLevel >= 4);

        for (const collision of collidedBricks) {
            const brick = collision.brick;

            // Get the intended hit side based on bullet direction
            let intendedHitSide;
            switch (bullet.direction) {
                case 0: intendedHitSide = 'bottom'; break;  // Up
                case 1: intendedHitSide = 'left'; break;    // Right
                case 2: intendedHitSide = 'top'; break;     // Down
                case 3: intendedHitSide = 'right'; break;   // Left
            }

            // NEW: If power level 4+, destroy entire brick block
            if (isPowerLevel4Plus) {
                // Destroy all 4 bits of the brick
                let bitsDestroyedThisBrick = 0;
                for (let bitIndex = 0; bitIndex < 4; bitIndex++) {
                    if (brick.bits[bitIndex]) {
                        brick.bits[bitIndex] = false;
                        bitsDestroyedThisBrick++;
                    }
                }

                totalBitsDestroyed += bitsDestroyedThisBrick;
                lastHitSide = intendedHitSide;

                if (brick.isCompletelyDestroyed()) {
                    bricksDestroyed++;
                }

                // REMOVED THE BREAK STATEMENT - Don't exit after destroying one brick
                // break; // <-- REMOVE THIS LINE
            } else {
                // Original logic for power level < 4
                const intendedBits = brick.getAffectedBitsBySide(intendedHitSide);
                const hasIntendedBits = intendedBits.some(bitIndex => brick.bits[bitIndex]);

                let actualHitSide = intendedHitSide;
                let bitsToDestroy = intendedBits;

                // If intended side has no bits, try the opposite side
                if (!hasIntendedBits) {
                    // Get opposite side
                    let oppositeSide;
                    switch (intendedHitSide) {
                        case 'top': oppositeSide = 'bottom'; break;
                        case 'bottom': oppositeSide = 'top'; break;
                        case 'left': oppositeSide = 'right'; break;
                        case 'right': oppositeSide = 'left'; break;
                    }

                    const oppositeBits = brick.getAffectedBitsBySide(oppositeSide);
                    const hasOppositeBits = oppositeBits.some(bitIndex => brick.bits[bitIndex]);

                    // If opposite side has bits, hit that instead
                    if (hasOppositeBits) {
                        actualHitSide = oppositeSide;
                        bitsToDestroy = oppositeBits;
                    } else {
                        // Brick might be empty or bullet hitting wrong place
                        continue;
                    }
                }

                // Destroy the bits
                let bitsDestroyedThisBrick = 0;
                for (const bitIndex of bitsToDestroy) {
                    if (brick.bits[bitIndex]) {
                        brick.bits[bitIndex] = false;
                        bitsDestroyedThisBrick++;
                    }
                }

                totalBitsDestroyed += bitsDestroyedThisBrick;
                lastHitSide = actualHitSide;

                if (brick.isCompletelyDestroyed()) {
                    bricksDestroyed++;
                }
            }
        }

        updateWallCount(brickWalls, steelWalls, bricksDestroyed);
        //document.getElementById('lastHitSide').textContent = lastHitSide;

        return true;
    }

    return false;
}

// Check wall between two points (for line of sight) - includes brick and steel
function checkObstacleBetween(x1, y1, x2, y2) {
    x1 += TANK_SIZE / 2;
    y1 += TANK_SIZE / 2;
    x2 += TANK_SIZE / 2;
    y2 += TANK_SIZE / 2;
    if (Math.abs(x2 - x1) <= 2 && Math.abs(y2 - y1) <= 2)
        return false;

    const steps = 20;
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    for (let i = 0; i <= steps; i++) {
        const checkX = x1 + dx * i;
        const checkY = y1 + dy * i;

        // Check brick walls
        for (const wall of brickWalls) {
            if (wall.isAlive()) {
                if (checkPhysicalCollision(checkX - 0.5, checkY - 0.5, 1, 1, wall.x, wall.y, 1, 1)) {
                    return true;
                }
            }
        }

        // Check steel walls
        for (const steel of steelWalls) {
            if (steel.isAlive) {
                if (checkPhysicalCollision(checkX - 0.5, checkY - 0.5, 1, 1, steel.x, steel.y, 1, 1)) {
                    return true;
                }
            }
        }
    }

    return false;
}



// ========== KEY EVENT HANDLERS ==========
function handleKeyDown(e) {
    // ========== 新增：检查游戏是否结束 ==========
    if (!base.isAlive || gameOver) {
        // 阻止所有按键输入
        if (['arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'l'].includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
        return;
    }

    const key = e.key.toLowerCase();

    // Handle both WASD and Arrow keys
    if (key in keys) {
        keys[key] = true;

        // Prevent default behavior for arrow keys (prevents page scrolling)
        if (['arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
            e.preventDefault();
        }

        if (['w', 'a', 's', 'd'].includes(key)) {
            lastDirectionKey = key;
        } else if (['arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
            lastHumanDirectionKey = key;
        }

        if (key === 'l') {
            humanFireKeyPressed = true;
            e.preventDefault();
        }
    }

    if (key === 'p') {
        togglePause();
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key in keys) {
        keys[key] = false;

        if (key === lastDirectionKey) lastDirectionKey = null;
        if (key === lastHumanDirectionKey) lastHumanDirectionKey = null;
        if (key === 'l') humanFireKeyPressed = false;
    }
}

// ========== GAME FUNCTIONS ==========


function getNextSpawnPosition() {
    for (let attempt = 0; attempt < SPAWN_POSITIONS.length; attempt++) {
        const positionIndex = (spawnPositionIndex + attempt) % SPAWN_POSITIONS.length;
        const position = SPAWN_POSITIONS[positionIndex];

        spawnPositionIndex = (positionIndex + 1) % SPAWN_POSITIONS.length;
        updateNextSpawnPosition();
        return { x: position.x, y: position.y, name: position.name };
    }
}

function getNextSpawnPositionWithoutUpdate() {
    const positionIndex = spawnPositionIndex % SPAWN_POSITIONS.length;
    const position = SPAWN_POSITIONS[positionIndex];

    return {
        x: position.x,
        y: position.y,
        name: position.name
    };
}

function updateNextSpawnPosition() {
    const nextPosIndex = spawnPositionIndex % SPAWN_POSITIONS.length;
    const nextPosition = SPAWN_POSITIONS[nextPosIndex];
    //document.getElementById('nextSpawnPos').textContent = nextPosition.name;
}

function spawnEnemy() {

    const position = getNextSpawnPosition();
    if (!position) return;

    let direction = Math.floor(Math.random() * 4);

    totalEnemiesSpawned++;
    let hasPowerUp = (totalEnemiesSpawned % 6 == 0) && (totalEnemiesSpawned % level.levelParameter.enemyCount != 0)

    let tankTypeNumber = getWeightedRandom(level.levelParameter.tankProbabilities);

    let enemyType = "enemy" + tankTypeNumber;

    const enemy = {
        x: position.x, y: position.y, direction,
        bx: position.x, by: position.y,
        moving: true,
        color: '#CC4444', turretColor: '#992222', barrelColor: '#8B4513',
        decisionTimer: Math.floor(Math.random() * 50) + 30,
        fireTimer: level.levelParameter.enemyFireRate,
        isAlive: true, canCollide: true,
        lastDirectionChange: 0,
        spawnPositionName: position.name,
        needsAlignment: false,
        stuckTimer: 0,
        lastDirectionChangeFrame: frameCount,
        playerType: enemyType,
        hasPowerUp: hasPowerUp,
        speed: enemyType == "enemy2" ? 1 : 0.5,
        health: enemyType == "enemy4" ? 4 : 1
    };

    enemyTanks.push(enemy);
}

function getWeightedRandom(probabilities) {
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (random <= cumulative) {
            return i + 1; // Returns 1, 2, 3, or 4
        }
    }

    // Fallback in case of rounding errors
    return 4;
}

function respawnPlayer(isAI) {
    if (isAI) {
        AITank.x = 16;
        AITank.y = 24;
        AITank.bx = 16;
        AITank.by = 24;

        AITank.direction = 0;
        AITank.isAlive = true;
        AITank.canShoot = true;
        AITank.respawnTimer = 0;
        AITank.needsAlignment = false;
        AITank.lastDirectionChangeFrame = frameCount;
        AITank.invulnerableTimer = INVULNERABLE_COUNTDOWN;


        if (AITank.lives <= 0) {
            // AI 游戏结束
            AITank.isAlive = false;
            AITank.canShoot = false;
            AITank.moving = false;

            // 检查人类玩家是否也死亡
            if (!humanTank.isAlive && humanTank.lives <= 0) {
                gameOver = true;
                //document.getElementById('aiDebug').textContent = "GAME OVER: All players lost!";
            } else {
                //document.getElementById('aiDebug').textContent = "AI Player destroyed! Human player continues...";
            }

            callUpdatePlayerDisplay();
            return;
        }
    } else {
        humanTank.x = 8;
        humanTank.y = 24;
        humanTank.bx = 8;
        humanTank.by = 24;
        humanTank.direction = 0;
        humanTank.isAlive = true;
        humanTank.canShoot = true;
        humanTank.respawnTimer = 0;
        humanTank.needsAlignment = false;
        humanTank.lastDirectionChangeFrame = frameCount;
        humanTank.invulnerableTimer = INVULNERABLE_COUNTDOWN;


        if (humanTank.lives <= 0) {
            // 人类玩家游戏结束
            humanTank.isAlive = false;
            humanTank.canShoot = false;
            humanTank.moving = false;

            // 检查AI玩家是否也死亡
            if (!AITank.isAlive && AITank.lives <= 0) {
                gameOver = true;
                //document.getElementById('aiDebug').textContent = "GAME OVER: All players lost!";
            } else {
                //document.getElementById('aiDebug').textContent = "Human Player destroyed! AI player continues...";
            }
        }
    }

    callUpdatePlayerDisplay();
}

function callUpdatePlayerDisplay() {
    updatePlayerDisplay(bulletCollisionRisk,
        safeDirection,
        bulletTimeToCollision,
        moveBlockedByBullet,
        perpendicularBulletRisk,
        nextToEnemy,
        AITank.lives,
        AITank,
        aiShootCooldown,
        enemyFacingPlayer,
        aiStrategy,
        lineOfSightToEnemy,
        canShootEnemy,
        predictionActive,
        enemyFuturePosition,
        predictionLineOfSight,
        enemyPathClear,
        shouldPredictiveShoot);
}




function needsAlignment(oldDir, newDir) {
    const isVerticalChange = (oldDir === 0 || oldDir === 2) && (newDir === 1 || newDir === 3);
    const isHorizontalChange = (oldDir === 1 || oldDir === 3) && (newDir === 0 || newDir === 2);
    return isVerticalChange || isHorizontalChange;
}

function alignTankToGrid(tank) {
    if (!tank.needsAlignment) return false;

    const oldX = tank.x;
    const oldY = tank.y;

    tank.x = Math.round(tank.x);
    tank.y = Math.round(tank.y);
    updateTankPhysicalBox(tank);
    tank.needsAlignment = false;

    return oldX !== tank.x || oldY !== tank.y;
}

function changeTankDirection(tank, newDirection) {
    if (tank.direction === newDirection) return;

    const oldDirection = tank.direction;

    if (needsAlignment(oldDirection, newDirection)) {
        tank.needsAlignment = true;
        alignTankToGrid(tank);
    }

    tank.direction = newDirection;
    tank.lastDirectionChangeFrame = frameCount;
}

// ========== ENHANCED PATHFINDING FUNCTIONS ==========

// Enhanced findPathToTarget function that can find paths through brick walls
function findPathToTarget(targetX, targetY) {
    const startX = AITank.bx;
    const startY = AITank.by;
    const goalX = Math.round(targetX);
    const goalY = Math.round(targetY);

    if (startX === goalX && startY === goalY) return [];

    // First attempt: Find path avoiding all obstacles (including bricks)
    const normalPath = findPathInternal(startX, startY, goalX, goalY, true);

    if (normalPath.length > 0) {
        aiPathBlockedByBrick = false;
        aiBrickTarget = null;
        return normalPath;
    }

    // If normal path fails, try finding path ignoring brick walls (but still avoiding steel and rivers)
    const brickIgnoringPath = findPathInternal(startX, startY, goalX, goalY, false);

    if (brickIgnoringPath.length > 0) {
        aiPathBlockedByBrick = true;

        // Find the first brick wall along the path that needs to be destroyed
        aiBrickTarget = findFirstBrickAlongPath(brickIgnoringPath, startX, startY);

        return brickIgnoringPath;
    }

    // If both attempts fail, return empty path
    aiPathBlockedByBrick = false;
    aiBrickTarget = null;
    return [];
}

// Internal pathfinding function with option to ignore brick walls
function findPathInternal(startX, startY, goalX, goalY, includeBrickWalls = true) {
    const queue = [{ x: startX, y: startY, path: [] }];
    const visited = new Set();
    visited.add(`${startX},${startY}`);

    const directions = [
        { dx: 0, dy: -1, name: 'up' },
        { dx: 1, dy: 0, name: 'right' },
        { dx: 0, dy: 1, name: 'down' },
        { dx: -1, dy: 0, name: 'left' }
    ];

    while (queue.length > 0 && queue.length < AI_PATHFINDING_DEPTH * 10) {
        const current = queue.shift();

        for (const dir of directions) {
            const newX = current.x + dir.dx;
            const newY = current.y + dir.dy;

            if (newX < 0 || newX > GRID_SIZE - TANK_SIZE ||
                newY < 0 || newY > GRID_SIZE - TANK_SIZE) {
                continue;
            }

            // Check for obstacles based on includeBrickWalls flag
            let wouldCollide;
            if (includeBrickWalls) {
                // Include brick walls as obstacles
                wouldCollide = wouldCollideWithObstacle(newX, newY) || wouldCollideWithRiver(newX, newY, rivers);
            } else {
                // Ignore brick walls, only check steel walls and rivers
                wouldCollide = wouldCollideWithSteelOnly(newX, newY) || wouldCollideWithRiver(newX, newY, rivers);
            }

            if (wouldCollide) {
                continue;
            }

            const key = `${newX},${newY}`;
            if (visited.has(key)) continue;

            visited.add(key);
            const newPath = [...current.path, dir];

            if (Math.abs(newX - goalX) <= 2 && Math.abs(newY - goalY) <= 2) {
                return newPath;
            }

            queue.push({ x: newX, y: newY, path: newPath });
        }
    }
    return [];
}

// Find the first brick wall along a path
function findFirstBrickAlongPath(path, startX, startY) {
    let currentX = startX;
    let currentY = startY;

    for (const step of path) {
        currentX += step.dx;
        currentY += step.dy;

        // Check if this position has a brick wall
        for (const brick of brickWalls) {
            if (brick.isAlive() &&
                checkTankVisualCollision(currentX, currentY, brick.x, brick.y, 1, 1)) {
                return {
                    brick: brick,
                    x: currentX,
                    y: currentY
                };
            }
        }
    }
    return null;
}

// Get shooting direction to destroy a brick wall
function getShootingDirectionForBrick(brickTarget) {
    if (!brickTarget || !brickTarget.brick) return null;

    const brick = brickTarget.brick;
    const dx = brick.x - AITank.x;
    const dy = brick.y - AITank.y;

    // Determine best shooting direction based on alignment
    if (Math.abs(dx) < Math.abs(dy)) {
        // More aligned vertically
        if (dy > 0) {
            return 2; // Shoot down
        } else {
            return 0; // Shoot up
        }
    } else {
        // More aligned horizontally
        if (dx > 0) {
            return 1; // Shoot right
        } else {
            return 3; // Shoot left
        }
    }
}

// Check if we have line of sight to a brick
function hasLineOfSightToBrick(brickTarget) {
    if (!brickTarget || !brickTarget.brick) return false;


    const brick = brickTarget.brick;

    // Check if we're aligned with the brick
    const dx = Math.abs(AITank.x - brick.x);
    const dy = Math.abs(AITank.y - brick.y);

    const isHorizontallyAligned = dy <= 1;
    const isVerticallyAligned = dx <= 1;

    if (!isHorizontallyAligned && !isVerticallyAligned) return false;


    // Check for obstacles (steel walls) but ignore other brick walls
    return !checkObstacleBetweenForBrickShooting(AITank.x, AITank.y, brick.x, brick.y);
}

// Special obstacle check for brick shooting (ignores other brick walls)
function checkObstacleBetweenForBrickShooting(x1, y1, x2, y2) {
    const steps = 20;
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    for (let i = 0; i <= steps; i++) {
        const checkX = x1 + dx * i;
        const checkY = y1 + dy * i;

        // Check steel walls only (ignore brick walls for shooting through them)
        for (const steel of steelWalls) {
            if (steel.isAlive) {
                if (checkPhysicalCollision(checkX, checkY, 0.1, 0.1, steel.x, steel.y, 1, 1)) {
                    return true;
                }
            }
        }
    }

    return false;
}

// ========== ENHANCED AI AGENT FUNCTIONS ==========

function isEnemyFacingAITank(enemy) {
    if (!enemy || !enemy.isAlive) return false;

    const dx = AITank.x - enemy.x;
    const dy = AITank.y - enemy.y;

    let isEnemyFacingAITank = false;
    switch (enemy.direction) {
        case 0:
            isEnemyFacingAITank = Math.abs(dx) <= 1 && dy < 0;
            break;
        case 1:
            isEnemyFacingAITank = Math.abs(dy) <= 1 && dx > 0;
            break;
        case 2:
            isEnemyFacingAITank = Math.abs(dx) <= 1 && dy > 0;
            break;
        case 3:
            isEnemyFacingAITank = Math.abs(dy) <= 1 && dx < 0;
            break;
        default:
            isEnemyFacingAITank = false;
    }
    return isEnemyFacingAITank;
}

function isAlignedWithEnemy(enemy) {
    if (!enemy) return false;

    const dx = Math.abs(AITank.x - enemy.x);
    const dy = Math.abs(AITank.y - enemy.y);

    const isHorizontallyAligned = dy < AI_ALIGNMENT_TOLERANCE;
    const isVerticallyAligned = dx < AI_ALIGNMENT_TOLERANCE;

    return isHorizontallyAligned || isVerticallyAligned;
}

function getAlignmentDirection(enemy) {
    if (!enemy) return null;

    const dx = AITank.x - enemy.x;
    const dy = AITank.y - enemy.y;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dy > 0) {
            return 0;
        } else {
            return 2;
        }
    } else {
        if (dx > 0) {
            return 3;
        } else {
            return 1;
        }
    }
}

function getShootingDirectionWhenAligned(enemy) {
    if (!enemy) return null;

    const dx = AITank.x - enemy.x;
    const dy = AITank.y - enemy.y;

    if (Math.abs(dx) < AI_ALIGNMENT_TOLERANCE) {
        if (dy > 0) {
            return 0;
        } else {
            return 2;
        }
    } else if (Math.abs(dy) < AI_ALIGNMENT_TOLERANCE) {
        if (dx > 0) {
            return 3;
        } else {
            return 1;
        }
    }

    return null;
}

function findPriorityEnemy() {
    if (enemyTanks.length === 0) return null;

    const aliveEnemies = enemyTanks.filter(e => e.isAlive);
    if (aliveEnemies.length === 0) return null;

    // ========== THREAT CATEGORIES ==========

    // 1. IMMEDIATE THREATS (Must deal with NOW)
    const immediateThreats = aliveEnemies.filter(enemy => {
        // Check if enemy is VERY close (danger zone)
        const dx = Math.abs(enemy.x - AITank.x);
        const dy = Math.abs(enemy.y - AITank.y);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Immediate threat if:
        // a) Very close (within 3 cells)
        if (distance <= 3) return true;

        // b) Facing player and in line of sight
        if (isEnemyFacingAITank(enemy) && hasLineOfSightToEnemy(enemy)) {
            return true;
        }

        // c) Can shoot player NOW
        if (canEnemyShootAITank(enemy)) {
            return true;
        }

        return false;
    });

    // If immediate threats exist, target the closest one
    if (immediateThreats.length > 0) {
        let closestImmediate = null;
        let closestDistance = Infinity;

        for (const enemy of immediateThreats) {
            const dx = enemy.x - AITank.x;
            const dy = enemy.y - AITank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestImmediate = enemy;
            }
        }
        return closestImmediate;
    }

    // 2. SHOOTABLE THREATS (Can engage while moving)
    const shootableEnemies = aliveEnemies.filter(enemy => {
        // Check if we can shoot this enemy from current position
        return canShootEnemyFromCurrentPosition(enemy);
    });

    // If we can shoot someone right now, do it (even if not highest base threat)
    if (shootableEnemies.length > 0) {
        // Among shootable enemies, prioritize those closer to base
        let bestShootable = null;
        let highestPriority = -Infinity;

        for (const enemy of shootableEnemies) {
            // Base threat score (higher Y = closer to base = more threat)
            const baseThreat = enemy.y * 2;

            // Distance penalty (prefer closer targets when shooting)
            const dx = enemy.x - AITank.x;
            const dy = enemy.y - AITank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const distanceScore = 20 - distance;

            const priority = baseThreat + distanceScore;

            if (priority > highestPriority) {
                highestPriority = priority;
                bestShootable = enemy;
            }
        }
        return bestShootable;
    }

    // 3. STRATEGIC THREATS (Base defenders - prioritize lower enemies)
    // Only reach this point if no immediate or shootable threats
    let strategicTarget = null;
    let highestStrategicThreat = -Infinity;

    for (const enemy of aliveEnemies) {
        // Calculate strategic threat level
        const strategicThreat = calculateStrategicThreat(enemy);

        if (strategicThreat > highestStrategicThreat) {
            highestStrategicThreat = strategicThreat;
            strategicTarget = enemy;
        }
    }

    return strategicTarget;
}

// Helper function: Calculate if enemy can shoot player
function canEnemyShootAITank(enemy) {
    if (!enemy || !enemy.isAlive) return false;

    const dx = AITank.x - enemy.x;
    const dy = AITank.y - enemy.y;

    // Check if enemy is aligned with player
    let isAligned = false;
    switch (enemy.direction) {
        case 0: isAligned = Math.abs(dx) < 1.5 && dy < 0; break; // Up
        case 1: isAligned = Math.abs(dy) < 1.5 && dx > 0; break; // Right
        case 2: isAligned = Math.abs(dx) < 1.5 && dy > 0; break; // Down
        case 3: isAligned = Math.abs(dy) < 1.5 && dx < 0; break; // Left
    }

    if (!isAligned) return false;

    // Check line of sight (ignore rivers for bullets)
    return !checkObstacleBetween(enemy.x, enemy.y, AITank.x, AITank.y);
}

// Helper function: Calculate strategic threat (base defense priority)
function calculateStrategicThreat(enemy) {
    if (!enemy || !enemy.isAlive) return 0;

    // Base position threat (higher Y = closer to base = more threat)
    const baseThreat = enemy.y * 3; // Weighted heavily

    // Direction bonus: moving down = more threat
    let directionBonus = 0;
    if (enemy.direction === 2) directionBonus = 10; // Moving down

    // Path to base threat: if enemy has clear path to base area (consider rivers as obstacles)
    const baseX = 12.5;
    const baseY = 24.5;

    // Check if enemy has clear path to base (including rivers as obstacles for tanks)
    let hasPathToBase = true;
    // Simple check: if enemy is directly above base with no brick/steel walls
    if (Math.abs(enemy.x - baseX) < 2 && enemy.y < baseY) {
        // Check vertical path
        for (let checkY = enemy.y; checkY < baseY; checkY += 0.5) {
            if (wouldCollideWithObstacle(enemy.x, checkY) || wouldCollideWithRiver(enemy.x, checkY, rivers)) {
                hasPathToBase = false;
                break;
            }
        }
    } else {
        hasPathToBase = false;
    }

    const pathBonus = hasPathToBase ? 15 : 0;

    // Proximity to player (for engagement feasibility)
    const dx = enemy.x - AITank.x;
    const dy = enemy.y - AITank.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const engagementScore = 30 - distance; // Closer = easier to engage

    return baseThreat + directionBonus + pathBonus + engagementScore;
}

function hasLineOfSightToEnemy(enemy) {
    if (!enemy) return false;

    const dx = enemy.x - AITank.x;
    const dy = enemy.y - AITank.y;

    let isInLineOfSight = false;

    switch (AITank.direction) {
        case 0:
            isInLineOfSight = Math.abs(dx) < 2 && dy < 0;
            break;
        case 1:
            isInLineOfSight = Math.abs(dy) < 2 && dx > 0;
            break;
        case 2:
            isInLineOfSight = Math.abs(dx) < 2 && dy > 0;
            break;
        case 3:
            isInLineOfSight = Math.abs(dy) < 2 && dx < 0;
            break;
    }

    if (!isInLineOfSight) return false;


    // Check for walls but ignore rivers
    return !checkObstacleBetween(AITank.x, AITank.y, enemy.x, enemy.y);
}

function canShootEnemyFromCurrentPosition(enemy) {
    if (!enemy) return false;

    if (!hasLineOfSightToEnemy(enemy)) return false;

    if (!AITank.isAlive || !AITank.canShoot) return false;

    // Check bullet limit based on power level
    const maxBullets = canShootMultipleBullets(AITank) ? MAX_BULLET : 1;
    if (bullets.filter(b => b.isAITank).length >= maxBullets) return false;

    if (bulletCooldown > 0) return false;
    if (aiShootCooldown > 0) return false;

    return true;
}

function getMoveDirectionFromPath(path) {
    if (path.length === 0) return null;

    const nextStep = path[0];
    switch (nextStep.name) {
        case 'up': return 0;
        case 'right': return 1;
        case 'down': return 2;
        case 'left': return 3;
    }
    return null;
}

// ========== NEW FUNCTION: Check if bullet would hit base ==========
function wouldBulletHitBase(tankX, tankY, direction) {
    if (!base.isAlive) return false;

    // Calculate bullet starting position
    let bulletX = tankX + TANK_SIZE / 2 - BULLET_SIZE / 2;
    let bulletY = tankY + TANK_SIZE / 2 - BULLET_SIZE / 2;

    switch (direction) {
        case 0: // Up
            bulletY = tankY - BULLET_SIZE + BULLET_OFFSET;
            break;
        case 1: // Right
            bulletX = tankX + TANK_SIZE - BULLET_OFFSET;
            break;
        case 2: // Down
            bulletY = tankY + TANK_SIZE - BULLET_OFFSET;
            break;
        case 3: // Left
            bulletX = tankX - BULLET_SIZE + BULLET_OFFSET;
            break;
    }

    // Check line from bullet start to base
    return checkBulletPathHitsBase(bulletX, bulletY, direction);
}

function checkBulletPathHitsBase(startX, startY, direction) {
    if (!base.isAlive) return false;

    // Simulate bullet path
    let bulletX = startX;
    let bulletY = startY;

    // Check up to maximum distance (entire battlefield)
    for (let step = 0; step < GRID_SIZE * 2; step++) {
        // Move bullet along its path
        switch (direction) {
            case 0: bulletY -= getBulletSpeed(AITank) / CELL_SIZE / 10; break;
            case 1: bulletX += getBulletSpeed(AITank) / CELL_SIZE / 10; break;
            case 2: bulletY += getBulletSpeed(AITank) / CELL_SIZE / 10; break;
            case 3: bulletX -= getBulletSpeed(AITank) / CELL_SIZE / 10; break;
        }

        // Check if bullet would hit base
        const bulletRight = bulletX + BULLET_SIZE;
        const bulletBottom = bulletY + BULLET_SIZE;

        if (bulletX < base.x + base.width &&
            bulletRight > base.x &&
            bulletY < base.y + base.height &&
            bulletBottom > base.y) {
            return true;
        }

        // Check if bullet would hit a wall first (which would stop it)
        // Check for brick walls
        for (const wall of brickWalls) {
            if (wall.isAlive() &&
                bulletX < wall.x + 1 &&
                bulletRight > wall.x &&
                bulletY < wall.y + 1 &&
                bulletBottom > wall.y) {
                return false; // Wall would block bullet before base
            }
        }

        // Check for steel walls
        for (const steel of steelWalls) {
            if (steel.isAlive &&
                bulletX < steel.x + 1 &&
                bulletRight > steel.x &&
                bulletY < steel.y + 1 &&
                bulletBottom > steel.y) {
                return false; // Steel wall would block bullet (or be destroyed if power level 4+)
            }
        }

        // Check if bullet is out of bounds
        if (bulletX < 0 || bulletX >= GRID_SIZE ||
            bulletY < 0 || bulletY >= GRID_SIZE) {
            return false;
        }
    }

    return false;
}

// ========== ENHANCED AI DECISION MAKING ==========
function updateAI() {

    // ========== 新增：检查游戏是否结束 ==========
    if (!base.isAlive || gameOver) {
        aiEnabled = false;
        keys['w'] = keys['a'] = keys['s'] = keys['d'] = keys[' '] = false;
        return;
    }

    if (!aiEnabled || !AITank.isAlive) return;

    // ========== 重置AI状态 ==========
    resetAIState();


    // ========== 清除按键输入 ==========
    clearMovementKeys();

    // ========== 处理射击冷却 ==========
    handleShootingCooldown();

    // ========== 检查是否需要保持射击方向 ==========
    if (shouldMaintainShootingDirection()) {
        maintainShootingDirection();
        updateAIDisplay();
        return;
    }

    // ========== 评估子弹风险 ==========
    evaluateBulletRisks();


    // ========== 处理近战情况 ==========
    if (handleCloseCombat()) {
        updateAIDisplay();
        return;
    }

    // ========== 处理子弹安全（最高优先级） ==========
    if (handleBulletSafety()) {
        updateAIDisplay();
        return;
    }



    if (useSimplePathfindingCountdown > 0)
        useSimplePathfindingCountdown--;
    if (seekPowerUpDirectionChangeCountDown > 0)
        seekPowerUpDirectionChangeCountDown--;

    let needToGrabPowerUp = false;
    if (powerUp.isAlive) {
        let count = countCollisionWithRiver(powerUp.x, powerUp.y, rivers) + countCollisionWithSteelWalls(powerUp.x, powerUp.y, steelWalls);
        let noNeedThisPowerUp = false;
        if ((powerUp.type == "star" || powerUp.type == "gun") && AITank.powerLevel == 5)
            noNeedThisPowerUp = true;
        else if (powerUp.type == "star" && AITank.powerLevel == 4)
            noNeedThisPowerUp = true;
        else if (powerUp.type == "extraLife" && AITank.lives > humanTank.lives)
            noNeedThisPowerUp = true;
        else if ((powerUp.type == "bomb" || powerUp.type == "shovel" || powerUp.type == "helmet") && frozeTime.time > 60)
            noNeedThisPowerUp = true;
        else if (isAITankCloseToAnyEnemy())
            noNeedThisPowerUp = true;

        needToGrabPowerUp = count < 4 && !noNeedThisPowerUp;
    }

    // ========== 处理路径被砖块阻挡的情况 ==========
    if (aiPathBlockedByBrick && aiBrickTarget) {
        if (!needToGrabPowerUp) {
            handleBrickBlockedPath();
            updateAIDisplay();

        } else {
            const maxBullets = canShootMultipleBullets(AITank) ? MAX_BULLET : 1;
            if (bulletCooldown === 0 &&
                bullets.filter(b => b.isAITank).length < maxBullets) {
                firePlayerBullet('ai');
                aiShooting = true;
            }
        }
    }
    if (needToGrabPowerUp) {
        // ========== TEST: Move to imaginary 2x2 block at (12, 12) ==========
        const TARGET_BLOCK = {
            x: powerUp.x,
            y: powerUp.y,
            width: 2,
            height: 2
        };

        // Check if agent tank is already at the target (visual collision)
        const isAtTarget = checkTankVisualCollision(
            AITank.x, AITank.y,
            TARGET_BLOCK.x, TARGET_BLOCK.y,
            TANK_SIZE, TANK_SIZE
        );

        if (!isAtTarget) {

            // Find path to target block
            // We want to go to the edge of the block, not inside it
            // Since tank is 2×2 and block is 2×2, we want to position the tank
            // so its top-left corner is aligned with the block's top-left corner

            // Calculate center of target block for pathfinding
            const targetCenterX = TARGET_BLOCK.x + TARGET_BLOCK.width / 2 - TANK_SIZE / 2;
            const targetCenterY = TARGET_BLOCK.y + TARGET_BLOCK.height / 2 - TANK_SIZE / 2;

            // Calculate distance to target
            const dx = TARGET_BLOCK.x - AITank.x;
            const dy = TARGET_BLOCK.y - AITank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // ========== NEW: Simple method when close (within 3 cells) ==========
            if (distance <= 3 || useSimplePathfindingCountdown > 0) {

                if (useSimplePathfindingCountdown == 0)
                    useSimplePathfindingCountdown = 30;
                aiStrategy = "Simple Close Approach";


                const targetX = TARGET_BLOCK.x; // Aim for 11
                const targetY = TARGET_BLOCK.y; // Aim for 11

                const closeDx = targetX - AITank.x;
                const closeDy = targetY - AITank.y;

                // Determine which direction to move
                let moveDirection = AITank.direction;

                // ========== NEW: Check for brick walls in current path ==========
                const wouldHitBrick = checkIfBrickInPath(AITank.x, AITank.y, moveDirection);

                if (wouldHitBrick) {
                    // There's a brick wall in our way - SHOOT IT!
                    aiStrategy = "Clearing Brick Blockage";

                    // Check if we can shoot
                    const maxBullets = canShootMultipleBullets(AITank) ? MAX_BULLET : 1;
                    if (AITank.canShoot && bulletCooldown === 0 &&
                        bullets.filter(b => b.isAITank).length < maxBullets) {

                        firePlayerBullet('ai');
                        aiShooting = true;
                        aiShootCooldown = AI_SHOOT_COOLDOWN;
                        aiShotDirection = moveDirection;
                        aiAction = "Shooting blocking brick!";

                        // Don't move while shooting
                        keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;
                        return;
                    } else {
                        // Can't shoot yet, just wait
                        aiAction = "Waiting to shoot brick";
                        keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;
                        return;
                    }
                }


                let futureX = AITank.bx;
                let futureY = AITank.by;

                let shouldMoveUp = false;
                for (let i = 1; i < 3; i++) {
                    futureY -= 1;
                    if (wouldCollideWithRiver(futureX, futureY, rivers) || wouldCollideWithSteelWalls(futureX, futureY, steelWalls)) {
                        shouldMoveUp = false;
                        break;
                    }
                    shouldMoveUp = checkTankVisualCollision(futureX, futureY, TARGET_BLOCK.x, TARGET_BLOCK.y, TANK_SIZE, TANK_SIZE)
                    if (shouldMoveUp)
                        break;
                }
                if (shouldMoveUp)
                    moveDirection = 0;

                futureX = AITank.bx;
                futureY = AITank.by;
                let shouldMoveRight = false;
                for (let i = 1; i < 3; i++) {
                    futureX += 1;
                    if (wouldCollideWithRiver(futureX, futureY, rivers) || wouldCollideWithSteelWalls(futureX, futureY, steelWalls)) {
                        shouldMoveRight = false;
                        break;
                    }
                    shouldMoveRight = checkTankVisualCollision(futureX, futureY, TARGET_BLOCK.x, TARGET_BLOCK.y, TANK_SIZE, TANK_SIZE)
                    if (shouldMoveRight)
                        break;
                }
                if (shouldMoveRight)
                    moveDirection = 1;

                futureX = AITank.bx;
                futureY = AITank.by;
                let shouldMoveDown = false;
                for (let i = 1; i < 3; i++) {
                    futureY += 1;
                    if (wouldCollideWithRiver(futureX, futureY, rivers) || wouldCollideWithSteelWalls(futureX, futureY, steelWalls)) {
                        shouldMoveDown = false;
                        break;
                    }
                    shouldMoveDown = checkTankVisualCollision(futureX, futureY, TARGET_BLOCK.x, TARGET_BLOCK.y, TANK_SIZE, TANK_SIZE)
                    if (shouldMoveDown)
                        break;
                }
                if (shouldMoveDown)
                    moveDirection = 2;

                futureX = AITank.bx;
                futureY = AITank.by;
                let shouldMoveLeft = false;
                for (let i = 1; i < 3; i++) {
                    futureX -= 1;
                    if (wouldCollideWithRiver(futureX, futureY, rivers) || wouldCollideWithSteelWalls(futureX, futureY, steelWalls)) {
                        shouldMoveLeft = false;
                        break;
                    }
                    shouldMoveLeft = checkTankVisualCollision(futureX, futureY, TARGET_BLOCK.x, TARGET_BLOCK.y, TANK_SIZE, TANK_SIZE)
                    if (shouldMoveLeft)
                        break;
                }
                if (shouldMoveLeft)
                    moveDirection = 3;

                futureX = AITank.x;
                futureY = AITank.y;
                if (!(shouldMoveUp || shouldMoveRight || shouldMoveDown || shouldMoveLeft) && seekPowerUpDirectionChangeCountDown == 0) {
                    // If we need to change direction, let alignment handle the positioning
                    let canMoveHorizontally = true;

                    if (Math.abs(closeDx) > 0.5) {
                        // Need to move horizontally
                        if (closeDx > 0) {
                            moveDirection = 1; // Right
                            canMoveHorizontally = !(wouldCollideWithRiver(futureX + 0.1, futureY, rivers) || wouldCollideWithSteelWalls(futureX + 0.1, futureY, steelWalls))
                        } else {
                            moveDirection = 3; // Left
                            canMoveHorizontally = !(wouldCollideWithRiver(futureX - 0.1, futureY, rivers) || wouldCollideWithSteelWalls(futureX - 0.1, futureY, steelWalls))
                        }
                    }

                    let canMoveVertically = false;

                    if (Math.abs(closeDy) > 0.5) {
                        // Need to move vertically
                        if (closeDy > 0) {
                            if (!canMoveHorizontally)
                                moveDirection = 2; // Down
                            canMoveVertically = !(wouldCollideWithRiver(futureX, futureY + 0.1, rivers) || wouldCollideWithSteelWalls(futureX, futureY + 0.1, steelWalls))
                        } else {
                            if (!canMoveHorizontally)
                                moveDirection = 0; // Up
                            canMoveVertically = !(wouldCollideWithRiver(futureX, futureY - 0.1, rivers) || wouldCollideWithSteelWalls(futureX, futureY - 0.1, steelWalls))

                        }
                    }


                    if ((!canMoveHorizontally || !canMoveVertically) && !(canMoveHorizontally && canMoveVertically) && (closeDx == 0 || closeDy == 0)) {
                        useSimplePathfindingCountdown = 0;
                    }

                    if (moveDirection !== AITank.direction)
                        seekPowerUpDirectionChangeCountDown = 30;
                }

                // ========== NEW: Check for brick walls in new direction BEFORE changing ==========
                const wouldHitBrickNewDir = checkIfBrickInPath(AITank.x, AITank.y, moveDirection);
                if (wouldHitBrickNewDir && moveDirection !== AITank.direction) {
                    // There's a brick in the new direction - face it and shoot!
                    aiStrategy = "Preparing to clear brick";

                    // Change direction to face the brick
                    console.log(`Brick detected! Facing ${['Up', 'Right', 'Down', 'Left'][moveDirection]}`);
                    changeTankDirection(AITank, moveDirection);

                    // Check if we can shoot immediately
                    const maxBullets = canShootMultipleBullets(AITank) ? MAX_BULLET : 1;
                    if (AITank.canShoot && bulletCooldown === 0 &&
                        bullets.filter(b => b.isAITank).length < maxBullets) {

                        firePlayerBullet('ai');
                        aiShooting = true;
                        aiShootCooldown = AI_SHOOT_COOLDOWN;
                        aiShotDirection = moveDirection;
                        aiAction = "Shooting blocking brick!";
                    } else {
                        aiAction = "Facing brick, waiting to shoot";
                    }

                    // Don't move into the brick
                    keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;
                    return;
                }



                // If changing direction, the alignment will snap to grid
                if (moveDirection !== AITank.direction) {
                    changeTankDirection(AITank, moveDirection);
                    // After direction change, tank will align to grid on next frame
                    // This will put us at integer coordinates
                }

                // Move in the chosen direction
                keys[['w', 'd', 's', 'a'][moveDirection]] = true;
                aiAction = `Simple approach: Moving ${['Up', 'Right', 'Down', 'Left'][moveDirection]}`;

                // Check if we've reached a good position
                // We're at a good position if our rounded coordinates are within 1 cell of target
                const roundedX = Math.round(AITank.x);
                const roundedY = Math.round(AITank.y);

                if (Math.abs(roundedX - targetX) <= 1 && Math.abs(roundedY - targetY) <= 1) {
                    // Close enough - the intersection will happen
                    aiAction = "In position for pickup";

                    // Optional: Stop moving if we're exactly at the target coordinates
                    if (roundedX === targetX && roundedY === targetY) {
                        keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;
                        aiAction = "Ready for pickup!";
                    }
                }
            }
            // ========== Original pathfinding for longer distances ==========
            if (useSimplePathfindingCountdown == 0) {
                aiCurrentPath = findPathToTarget(targetCenterX, targetCenterY);

                aiStrategy = "Moving to Test Block";

                if (aiCurrentPath.length > 0) {
                    const moveDir = getMoveDirectionFromPath(aiCurrentPath);

                    if (moveDir !== null && moveDir !== AITank.direction) {
                        if (!AITank.needsAlignment) {
                            changeTankDirection(AITank, moveDir);
                            aiMoveCooldown = 10;
                        }
                    }

                    if (!keys[['w', 'd', 's', 'a'][AITank.direction]]) {
                        //    console.log(seekPowerUpDirectionChangeCountDown)
                        keys['w'] = false;
                        keys['a'] = false;
                        keys['s'] = false;
                        keys['d'] = false;
                        keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
                        seekPowerUpDirectionChangeCountDown = 30;
                    }


                    aiAction = "Moving to Test Block (Pathfinding)";

                    // Update path progress
                    if (aiCurrentPath.length > 0) {
                        const nextStep = aiCurrentPath[0];
                        const targetX = AITank.bx + (nextStep.dx || 0);
                        const targetY = AITank.by + (nextStep.dy || 0);

                        if (Math.abs(AITank.x - targetX) < 0.5 && Math.abs(AITank.y - targetY) < 0.5) {
                            aiCurrentPath.shift();
                        }
                    }

                } else {
                    console.log("no path found during powre up hunt")
                    // If no path found, try to move directly toward target
                    const directDx = targetCenterX - AITank.x;
                    const directDy = targetCenterY - AITank.y;

                    if (Math.abs(directDx) > Math.abs(directDy)) {
                        // Move horizontally first
                        if (directDx > 0 && AITank.direction !== 1) {
                            changeTankDirection(AITank, 1);
                        } else if (directDx < 0 && AITank.direction !== 3) {
                            changeTankDirection(AITank, 3);
                        }
                    } else {
                        // Move vertically first
                        if (directDy > 0 && AITank.direction !== 2) {
                            changeTankDirection(AITank, 2);
                        } else if (directDy < 0 && AITank.direction !== 0) {
                            changeTankDirection(AITank, 0);
                        }
                    }

                    keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
                    aiAction = "Direct Move to Test Block";
                }
            }

            // Check if we've reached the target (using visual collision)
            if (checkTankVisualCollision(AITank.x, AITank.y, TARGET_BLOCK.x, TARGET_BLOCK.y, TANK_SIZE, TANK_SIZE)) {
                aiAction = "REACHED TEST BLOCK!";
                aiStrategy = "At Target";
                keys['w'] = keys['a'] = keys['s'] = keys['d'] = false; // Stop moving
                console.log("SUCCESS: Tank boundary intersects with target block!");
            }


            return;
        } else {
            aiAction = "Already at Test Block";
            aiStrategy = "At Target";
            keys['w'] = keys['a'] = keys['s'] = keys['d'] = false; // Stop moving
        }

    }


    // ========== 正常战斗逻辑 ==========
    if (aiShootCooldown === 0) {
        executeCombatLogic();


    } else {
        maintainCurrentDirection();
    }


    // ========== 对齐到网格 ==========
    if (AITank.needsAlignment) {
        alignTankToGrid(AITank);
    }

    updateAIDisplay();
}

// ========== 辅助函数 ==========


// ========== NEW HELPER FUNCTION ==========
function checkIfBrickInPath(tankX, tankY, direction) {
    // Check one cell ahead in the given direction
    let checkX = tankX;
    let checkY = tankY;

    switch (direction) {
        case 0: // Up
            checkY = Math.max(0, tankY - 1);
            break;
        case 1: // Right
            checkX = Math.min(GRID_SIZE - TANK_SIZE, tankX + 1);
            break;
        case 2: // Down
            checkY = Math.min(GRID_SIZE - TANK_SIZE, tankY + 1);
            break;
        case 3: // Left
            checkX = Math.max(0, tankX - 1);
            break;
    }

    // Check for brick walls at the checked position
    for (const brick of brickWalls) {
        if (brick.isAlive()) {
            // Check if the tank's new position would collide with the brick
            if (checkTankVisualCollision(checkX, checkY, brick.x, brick.y, 1, 1)) {
                return true; // Brick is in the way!
            }
        }
    }

    return false; // No brick in the way
}

function resetAIState() {
    bulletTimeToCollision = Infinity;
    predictionActive = false;
    enemyFuturePosition = null;
    predictionLineOfSight = false;
    enemyPathClear = false;
    shouldPredictiveShoot = false;
    perpendicularBulletRisk = "None";
    nextToEnemy = false;
}

function clearMovementKeys() {
    keys['w'] = false;
    keys['a'] = false;
    keys['s'] = false;
    keys['d'] = false;
    keys[' '] = false;
}

function handleShootingCooldown() {
    if (aiShootCooldown > 0) {
        aiShootCooldown--;
        if (aiShotDirection !== null && AITank.direction !== aiShotDirection) {
            changeTankDirection(AITank, aiShotDirection);
        }
    }
}

function shouldMaintainShootingDirection() {
    const justChangedDirection = (frameCount - AITank.lastDirectionChangeFrame) < 3;
    return aiShootCooldown > 0 && justChangedDirection;
}

function maintainShootingDirection() {
    keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
    aiAction = `Maintaining shooting direction (cooldown: ${aiShootCooldown})`;
    aiStrategy = "Maintain Direction";
    dangerLevel = "Low";
}

function evaluateBulletRisks() {
    // 检查垂直子弹风险
    const perpendicularCheck = willWalkIntoPerpendicularBullet(AITank, bullets, CELL_SIZE, PLAYER_SPEED, BULLET_SPEED, AI_BULLET_PREDICTION_FRAMES, AI_BULLET_COLLISION_THRESHOLD, PERPENDICULAR_BULLET_RISK_DISTANCE, AI_MIN_TTC, perpendicularBullets);
    if (perpendicularCheck.willIntersect) {
        perpendicularBulletRisk = perpendicularCheck.riskLevel || "Medium";
    } else {
        perpendicularBulletRisk = perpendicularBullets.length > 0 ? "Low" : "None";
    }
}

function handleBrickBlockedPath() {
    aiStrategy = "Clear Path";
    const brick = aiBrickTarget.brick;
    const dx = brick.x - AITank.x;
    const dy = brick.y - AITank.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const shootDir = getShootingDirectionForBrick(aiBrickTarget);
    const hasLOS = hasLineOfSightToBrick(aiBrickTarget);

    // 策略：如果太远就靠近，然后射击
    if (shootDir !== null && hasLOS) {
        if (distance > 2.5) {
            approachBrickForShooting(brick, distance);
        } else {
            shootBrickAtCloseRange(brick, shootDir, distance);
        }
    } else {
        moveToGetLineOfSight(brick, distance);

    }
}

function approachBrickForShooting(brick, distance) {
    aiAction = "Moving Closer to Brick";
    dangerLevel = "Low";

    const brickPath = findPathToTarget(brick.x, brick.y);
    if (brickPath.length > 0) {
        const moveDir = getMoveDirectionFromPath(brickPath);
        if (moveDir !== null && moveDir !== AITank.direction) {
            changeTankDirection(AITank, moveDir);
        }
        keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
        aiAction = `Moving Closer to Brick (${distance.toFixed(1)} cells)`;
    } else {
        // 无法找到路径，尝试从当前位置射击
        aiAction = "Can't Path to Brick, Trying to Shoot";
        const shootDir = getShootingDirectionForBrick(aiBrickTarget);
        if (AITank.direction !== shootDir) {
            changeTankDirection(AITank, shootDir);
        }
        keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
    }
}

function shootBrickAtCloseRange(brick, shootDir, distance) {
    aiAction = "Shooting Brick at Close Range";
    dangerLevel = "Low";

    // 面向砖块
    if (AITank.direction !== shootDir) {
        changeTankDirection(AITank, shootDir);
    }

    // 对齐到网格
    alignTankToGrid(AITank);

    // 射击（没有冷却检查，对齐就射）
    const maxBullets = canShootMultipleBullets(AITank) ? MAX_BULLET : 1;
    if (AITank.direction === shootDir && bulletCooldown === 0 &&
        bullets.filter(b => b.isAITank).length < maxBullets) {

        firePlayerBullet('ai');
        aiShooting = true;
        aiShotDirection = shootDir;
        aiAction = `Shooting Brick (${distance.toFixed(1)} cells)`;

        // 检查砖块是否被摧毁
        if (!aiBrickTarget.brick.isAlive()) {
            aiPathBlockedByBrick = false;
            aiBrickTarget = null;
            aiCurrentPath = [];
            aiAction = "Brick Destroyed!";
        }
    } else if (AITank.direction === shootDir) {
        // 等待冷却 - 不移动
        aiAction = `Waiting to Shoot Brick (${distance.toFixed(1)} cells)`;
    }
}

function moveToGetLineOfSight(brick, distance) {
    aiAction = "Moving to Get Line of Sight";
    const brickPath = findPathToTarget(aiBrickTarget.x, aiBrickTarget.y);

    if (brickPath.length > 0) {
        const moveDir = getMoveDirectionFromPath(brickPath);
        if (moveDir !== null && moveDir !== AITank.direction) {
            changeTankDirection(AITank, moveDir);
        }
        keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
        aiAction = `Moving to Brick (No LOS, ${distance.toFixed(1)} cells)`;
    } else {
        // 无法找到路径，尝试不同方法
        aiAction = "Can't Reach Brick, Changing Strategy";
        aiPathBlockedByBrick = false;
        aiBrickTarget = null;
    }
}

function handleCloseCombat() {

    aiTargetEnemy = findPriorityEnemy();
    if (aiTargetEnemy && isNextToEnemy(aiTargetEnemy, AITank, IMMEDIATE_SHOOT_DISTANCE, CLOSE_COMBAT_DISTANCE)) {
        nextToEnemy = true;

        // 当紧邻敌人时立即摧毁
        if (canShootAdjacentEnemy(aiTargetEnemy)) {


            const shootDir = getShootingDirectionForAdjacentEnemy(aiTargetEnemy, AITank);
            if (shootDir !== null && AITank.direction !== shootDir) {
                changeTankDirection(AITank, shootDir);
            }

            alignTankToGrid(AITank);

            const maxBullets = canShootMultipleBullets(AITank) ? MAX_BULLET : 1;

            if (AITank.canShoot && bulletCooldown === 0 &&
                bullets.filter(b => b.isAITank).length < maxBullets) {

                firePlayerBullet('ai');
                aiShooting = true;
                aiShootCooldown = AI_SHOOT_COOLDOWN;
                aiShotDirection = shootDir;
                aiAction = "IMMEDIATE CLOSE COMBAT!";
                aiStrategy = "Close Combat";
                dangerLevel = "Critical";
                return true;
            } else {
                aiAction = "Aiming at Adjacent Enemy";
                aiStrategy = "Close Combat";
                dangerLevel = "Critical";
                return true;
            }
        }
    }
    return false;
}

function handleBulletSafety() {
    // 检查无敌状态
    if (AITank.invulnerableTimer > 60 && frozeTime.time > 60) {
        return false;
    }

    let bulletCollisionCheck = { willCollide: false };
    let bulletToDestroy = null;
    let safestDirectionInfo = { direction: null, dangerScore: 0, ttc: Infinity };

    bulletCollisionCheck = willCurrentMoveCollideWithBullet();
    bulletToDestroy = canDestroyBulletWithPrediction();
    safestDirectionInfo = findSafestDirection();

    // 更新显示信息
    updateBulletRiskDisplay(bulletCollisionCheck, safestDirectionInfo);

    // 优先摧毁子弹
    if (handleBulletDestruction(bulletToDestroy)) {
        return true;
    }

    // 处理子弹碰撞
    if (handleBulletCollision(bulletCollisionCheck, safestDirectionInfo)) {
        return true;
    }

    // 处理中等危险情况
    if (handleModerateDanger(safestDirectionInfo)) {
        return true;
    }

    return false;
}

function updateBulletRiskDisplay(bulletCollisionCheck, safestDirectionInfo) {
    bulletCollisionRisk = bulletCollisionCheck.willCollide ? "High" :
        safestDirectionInfo.dangerScore > 30 ? "Medium" :
            safestDirectionInfo.dangerScore > 10 ? "Low" : "Safe";
    safeDirection = safestDirectionInfo.direction;
    bulletTimeToCollision = safestDirectionInfo.ttc;
    moveBlockedByBullet = false;
}

function handleBulletDestruction(bulletToDestroy) {
    const maxBullets = canShootMultipleBullets(AITank) ? MAX_BULLET : 1;
    if (bulletToDestroy && bulletToDestroy.ttc < 5 &&
        AITank.canShoot && bulletCooldown === 0 && aiShootCooldown === 0 &&
        bullets.filter(b => b.isAITank).length < maxBullets) {

        if (AITank.direction !== bulletToDestroy.direction) {
            changeTankDirection(AITank, bulletToDestroy.direction);
        }

        alignTankToGrid(AITank);

        firePlayerBullet('ai');
        aiShooting = true;
        aiShootCooldown = AI_SHOOT_COOLDOWN;
        aiShotDirection = bulletToDestroy.direction;

        aiAction = bulletToDestroy.isPerpendicular ?
            "Destroying PERPENDICULAR Bullet!" : "Destroying Threatening Bullet";
        aiStrategy = "Bullet Defense";
        dangerLevel = "Critical";
        return true;
    }
    return false;
}

function handleBulletCollision(bulletCollisionCheck, safestDirectionInfo) {
    // 特殊处理垂直子弹
    if (bulletCollisionCheck.willCollide && bulletCollisionCheck.type === "perpendicular") {
        moveBlockedByBullet = true;
        perpendicularBulletRisk = "High";
        handlePerpendicularBullet(safestDirectionInfo, bulletCollisionCheck.ttc);
        return true;
    }
    // 处理普通子弹碰撞
    else if (bulletCollisionCheck.willCollide && bulletCollisionCheck.ttc < AI_MIN_TTC) {
        moveBlockedByBullet = true;
        handleRegularBulletCollision(safestDirectionInfo, bulletCollisionCheck.ttc);
        return true;
    }
    return false;
}

function handlePerpendicularBullet(safestDirectionInfo, ttc) {
    if (safestDirectionInfo.direction === -1) {
        aiAction = "STOPPING for Perpendicular Bullet";
        dangerLevel = "Critical";
    } else if (AITank.direction !== safestDirectionInfo.direction) {
        changeTankDirection(AITank, safestDirectionInfo.direction);
        keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
        aiAction = "Dodging PERPENDICULAR Bullet";
        dangerLevel = "Critical";
        bulletsDodged++;
    } else {
        keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
        aiAction = "Evading Perpendicular Bullet";
        dangerLevel = "High";
    }
}

function handleRegularBulletCollision(safestDirectionInfo, ttc) {
    if (safestDirectionInfo.direction === -1) {
        aiAction = "Stopping for Bullet";
        dangerLevel = "Critical";
    } else if (AITank.direction !== safestDirectionInfo.direction) {
        changeTankDirection(AITank, safestDirectionInfo.direction);
        keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
        aiAction = "Dodging Bullet";
        dangerLevel = "High";
        bulletsDodged++;
    } else {
        keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
        aiAction = "Evading Bullet";
        dangerLevel = "High";
    }
}

function isAITankCloseToAnyEnemy() {
    for (let enemy of enemyTanks) {
        // Check if enemy is close (within 8 cells)
        if (isNextToEnemy(enemy, AITank, 2, 8)) {
            return true;
        }

        // Additional check: Enemy is facing the AI tank AND in same row/column AND has clear line of fire
        const dx = Math.abs(enemy.x - AITank.x);
        const dy = Math.abs(enemy.y - AITank.y);

        // Check if enemy is in same row (aligned horizontally) or same column (aligned vertically)
        const inSameRow = dy < 1; // Within 1 cell vertically
        const inSameColumn = dx < 1; // Within 1 cell horizontally

        if (inSameRow || inSameColumn) {
            // Check if enemy is facing the AI tank
            const isFacingAI = isEnemyFacingAITank(enemy);

            if (isFacingAI) {
                // Check for clear line of fire (no obstacles between enemy and AI)
                const lineClear = !checkObstacleBetween(enemy.x, enemy.y, AITank.x, AITank.y);

                if (lineClear) {
                    return true;
                }
            }
        }
    }
    return false;
}

function handleModerateDanger(safestDirectionInfo) {
    if (safestDirectionInfo.dangerScore > 30 &&
        safestDirectionInfo.direction !== AITank.direction &&
        safestDirectionInfo.direction !== null) {

        if (safestDirectionInfo.direction === -1) {
            aiAction = "Pausing for Safety";
            dangerLevel = "Medium";
            return true;
        } else {
            changeTankDirection(AITank, safestDirectionInfo.direction);
            keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
            aiAction = "Taking Safer Route";
            dangerLevel = "Medium";
            return true;
        }
    }
    return false;
}

function executeCombatLogic() {
    aiTargetEnemy = findPriorityEnemy();
    enemyFacingPlayer = aiTargetEnemy ? isEnemyFacingAITank(aiTargetEnemy) : false;

    if (aiTargetEnemy) {
        const dx = aiTargetEnemy.x - AITank.x;
        const dy = aiTargetEnemy.y - AITank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        lineOfSightToEnemy = hasLineOfSightToEnemy(aiTargetEnemy);
        canShootEnemy = canShootEnemyFromCurrentPosition(aiTargetEnemy);

        // 尝试预测射击
        if (tryPredictiveShooting(aiTargetEnemy, distance)) {
            return;
        }

        // 正常战斗行为
        executeNormalAIBehavior(aiTargetEnemy, distance);

    } else {
        exploreWhenNoEnemies();

    }
}

function tryPredictiveShooting(enemy, distance) {
    if (shouldUsePredictiveShooting(enemy) && distance > AI_PREDICTION_DISTANCE_THRESHOLD) {
        predictionActive = true;

        // 计算未来位置
        enemyFuturePosition = calculateEnemyFuturePosition(enemy, AI_PREDICTION_TIME);

        // 检查敌人到未来位置的路径是否畅通
        enemyPathClear = checkEnemyPathToFuture(enemy, enemyFuturePosition);

        // 确定未来位置的射击方向
        const futureShootingDirection = getShootingDirectionForFuturePosition(enemyFuturePosition);

        // 检查是否有到未来位置的视线
        predictionLineOfSight = hasLineOfSightToFuturePosition(enemyFuturePosition, futureShootingDirection);

        // 决定是否进行预测射击
        shouldPredictiveShoot = enemyPathClear && predictionLineOfSight;

        if (shouldPredictiveShoot) {
            executePredictiveShot(enemyFuturePosition, futureShootingDirection);
            return true;
        }
    }
    return false;
}

function executePredictiveShot(futurePosition, shootDir) {
    aiStrategy = "Predictive Shooting";

    // 面向射击方向
    if (AITank.direction !== shootDir) {
        changeTankDirection(AITank, shootDir);
    }

    // 对齐到网格
    alignTankToGrid(AITank);

    // 射击
    const maxBullets = canShootMultipleBullets(AITank) ? MAX_BULLET : 1;
    if (AITank.canShoot && bulletCooldown === 0 &&
        bullets.filter(b => b.isAITank).length < maxBullets && !wouldBulletHitBase(AITank.x, AITank.y, shootDir)) {

        firePlayerBullet('ai');
        aiShooting = true;
        aiShootCooldown = AI_SHOOT_COOLDOWN;
        aiShotDirection = shootDir;
        aiAction = "Predictive Shot!";
        dangerLevel = "Medium";
    } else {
        keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
        aiAction = "Aiming for Predictive Shot";
        dangerLevel = "Low";
    }
}

function exploreWhenNoEnemies() {
    aiStrategy = "Exploring";
    if (frameCount % 120 === 0 && !AITank.needsAlignment) {
        const newDirection = (AITank.direction + 1) % 4;
        changeTankDirection(AITank, newDirection);
    }
    keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
    aiAction = "Exploring";
    dangerLevel = "Low";
}

function maintainCurrentDirection() {
    aiStrategy = "Maintain Direction";
    keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
    aiAction = `Maintain Direction (${aiShootCooldown})`;
    dangerLevel = "Low";
}

function updateAIDisplay() {
    updateAIDisplayInfo(aiEnabled, aiTargetEnemy, aiAction, aiCurrentPath, dangerLevel, aiStrategy, aiShooting);
}

// Helper function for normal AI behavior
function executeNormalAIBehavior(enemy, distance) {
    lineOfSightToEnemy = hasLineOfSightToEnemy(enemy);
    canShootEnemy = canShootEnemyFromCurrentPosition(enemy);

    if (enemyFacingPlayer && lineOfSightToEnemy) {
        aiStrategy = "Align Before Attack";

        const isAligned = isAlignedWithEnemy(enemy);

        if (!isAligned) {
            const alignmentDirection = getAlignmentDirection(enemy);

            if (alignmentDirection !== null && AITank.direction !== alignmentDirection) {
                changeTankDirection(AITank, alignmentDirection);
            }

            keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
            aiAction = "Aligning to Enemy";
            dangerLevel = "Medium";

            //document.getElementById('aiDebug').textContent = `AI: Enemy facing player! Aligning to ${['Up', 'Right', 'Down', 'Left'][alignmentDirection]}`;
        } else {
            const shootDirection = getShootingDirectionWhenAligned(enemy);

            if (shootDirection !== null && AITank.direction !== shootDirection) {
                changeTankDirection(AITank, shootDirection);
            }

            if (canShootEnemyFromCurrentPosition(enemy)) {
                alignTankToGrid(AITank);

                const maxBullets = canShootMultipleBullets(AITank) ? MAX_BULLET : 1;
                if (AITank.canShoot && bulletCooldown === 0 &&
                    bullets.filter(b => b.isAITank).length < maxBullets && !wouldBulletHitBase(AITank.x, AITank.y, shootDirection)) {
                    firePlayerBullet('ai');
                    aiShooting = true;
                    aiShootCooldown = AI_SHOOT_COOLDOWN;
                    aiShotDirection = shootDirection;
                    aiAction = "Shooting at Enemy (Aligned)";
                } else {
                    keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
                    aiAction = "Facing Enemy (Aligned)";
                }
            } else {
                keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
                aiAction = "Positioning (Aligned)";
            }

            dangerLevel = "High";
            //document.getElementById('aiDebug').textContent = `AI: Aligned with enemy! Shooting direction: ${['Up', 'Right', 'Down', 'Left'][shootDirection]}`;
        }
    } else {
        aiStrategy = "Normal Chase";
        if (canShootEnemyFromCurrentPosition(enemy) && !wouldBulletHitBase(AITank.x, AITank.y, AITank.direction)) {
            firePlayerBullet('ai');
            aiShooting = true;
            aiShootCooldown = AI_SHOOT_COOLDOWN;
            aiShotDirection = AITank.direction;
            aiAction = "Shooting Enemy (In Line)";
            //document.getElementById('aiDebug').textContent = `AI: Enemy in line of sight! Shooting at (${enemy.x.toFixed(1)}, ${enemy.y.toFixed(1)})`;
        }
        else if (frameCount - aiLastUpdate > AI_UPDATE_INTERVAL * 2) {
            aiCurrentPath = findPathToTarget(enemy.x, enemy.y);
            aiLastUpdate = frameCount;
            aiMoveCooldown = 0;
        }

        if (aiMoveCooldown > 0) {
            aiMoveCooldown--;
            keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
            aiAction = "Moving (Cooldown)";
        }
        else if (aiCurrentPath.length > 0) {
            const moveDir = getMoveDirectionFromPath(aiCurrentPath);
            if (moveDir !== null && moveDir !== AITank.direction) {
                if (!AITank.needsAlignment) {
                    changeTankDirection(AITank, moveDir);
                    aiMoveCooldown = 10;
                }
            }

            keys[['w', 'd', 's', 'a'][AITank.direction]] = true;
            aiAction = "Moving to Enemy";

            if (aiCurrentPath.length > 0) {
                const nextStep = aiCurrentPath[0];
                const targetX = AITank.bx + (nextStep.dx || 0);
                const targetY = AITank.by + (nextStep.dy || 0);

                if (Math.abs(AITank.x - targetX) < 0.5 && Math.abs(AITank.y - targetY) < 0.5) {
                    aiCurrentPath.shift();
                }
            }

            dangerLevel = distance < AI_AVOID_DISTANCE ? "Medium" : "Low";
        }
    }
}



function callUpdateAIDisplay() {
    updateAIDisplay(enemiesKilled, bulletsDodged, bulletsDestroyed, bricksDestroyed);
    updateWallCount(brickWalls, steelWalls, bricksDestroyed);
}

// ========== TANK UPDATE FUNCTIONS ==========
function updateTank(tank, isAI = true) {

    if (!isAI) {
        if (humanTank.moving) {
            sound[10].play();
            sound[11].pause();
        } else {
            sound[10].pause();
            sound[11].play();
            if (frozeTime.time > 0 || enemyTanks.length == 0)
                sound[11].pause();

        }
    }


    if (!tank.isAlive) {
        if (tank.respawnTimer == 52) {
            if (isAI && AITank.lives > 0)
                createSpawnAnimation(16, 24, particleEffects);
            else if (humanTank.lives > 0 && !isAI)
                createSpawnAnimation(8, 24, particleEffects);
        }
        tank.respawnTimer--;

        if (tank.respawnTimer <= 0)
            respawnPlayer(isAI);
        return;
    }

    let moveDirection = null;

    if (isAI) {
        if (aiEnabled) {
            updateAI();
        }

        if (keys['w']) moveDirection = 0;
        if (keys['s']) moveDirection = 2;
        if (keys['a']) moveDirection = 3;
        if (keys['d']) moveDirection = 1;

    } else {
        // Human player controls
        const maxBullets = canShootMultipleBullets(tank) ? MAX_BULLET : 1;
        if (humanFireKeyPressed && tank.isAlive && tank.canShoot &&
            bullets.filter(b => b.isHuman).length < maxBullets && tank.bulletCooldown === 0) {
            firePlayerBullet('human');
        }

        if (keys['arrowup']) moveDirection = 0;
        if (keys['arrowdown']) moveDirection = 2;
        if (keys['arrowleft']) moveDirection = 3;
        if (keys['arrowright']) moveDirection = 1;

        if (lastHumanDirectionKey && keys[lastHumanDirectionKey]) {
            switch (lastHumanDirectionKey) {
                case 'arrowup': moveDirection = 0; break;
                case 'arrowdown': moveDirection = 2; break;
                case 'arrowleft': moveDirection = 3; break;
                case 'arrowright': moveDirection = 1; break;
            }
        }
    }

    if (tank.invulnerableTimer && tank.invulnerableTimer > 0)
        tank.invulnerableTimer--;


    if (moveDirection !== null && moveDirection !== tank.direction) {
        const oldDirection = tank.direction;

        if (needsAlignment(oldDirection, moveDirection)) {
            tank.needsAlignment = true;
            alignTankToGrid(tank);
        }
        tank.direction = moveDirection;
        tank.lastDirectionChangeFrame = frameCount;
    }



    if (tank.needsAlignment) {
        alignTankToGrid(tank);
    }

    if (moveDirection !== null && moveDirection === tank.direction) {
        tank.moving = true;

        let newX = tank.x;
        let newY = tank.y;

        switch (moveDirection) {
            case 0: newY -= PLAYER_SPEED / CELL_SIZE; break;
            case 1: newX += PLAYER_SPEED / CELL_SIZE; break;
            case 2: newY += PLAYER_SPEED / CELL_SIZE; break;
            case 3: newX -= PLAYER_SPEED / CELL_SIZE; break;
        }

        newX = Math.max(0, Math.min(GRID_SIZE - TANK_SIZE, newX));
        newY = Math.max(0, Math.min(GRID_SIZE - TANK_SIZE, newY));

        const wouldCollide = wouldCollideWithObstacleAtPosition(newX, newY);

        if (!wouldCollide) {
            let wouldCollideWithOtherTank = false;

            // Check collision with other player tank
            if (isAI) {
                if (checkTankVisualCollision(newX, newY, humanTank.bx, humanTank.by, TANK_SIZE, TANK_SIZE)) {
                    wouldCollideWithOtherTank = true;
                }
            } else {
                if (checkTankVisualCollision(newX, newY, AITank.bx, AITank.by, TANK_SIZE, TANK_SIZE)) {
                    wouldCollideWithOtherTank = true;
                }
            }

            // Check collision with enemy tanks
            for (const enemy of enemyTanks) {
                if (enemy.isAlive) {
                    if (checkTankVisualCollision(newX, newY, enemy.bx, enemy.by, TANK_SIZE, TANK_SIZE)) {
                        wouldCollideWithOtherTank = true;
                        break;
                    }
                }
            }

            if (!wouldCollideWithOtherTank) {
                tank.x = newX;
                tank.y = newY;
                updateTankPhysicalBox(tank);
            } else {
                tank.needsAlignment = true;
                alignTankToGrid(tank);
            }
        } else {
            const safePos = getSafePositionNearWall(tank.x, tank.y, newX, newY, moveDirection);

            if (safePos.x !== tank.x || safePos.y !== tank.y) {
                tank.x = safePos.x;
                tank.y = safePos.y;
                updateTankPhysicalBox(tank);
            } else {
                tank.needsAlignment = true;
                alignTankToGrid(tank);
            }
        }
    } else {
        tank.moving = false;
    }

    tank.x = Math.max(0, Math.min(GRID_SIZE - TANK_SIZE, tank.x));
    tank.y = Math.max(0, Math.min(GRID_SIZE - TANK_SIZE, tank.y));

    updateTankPhysicalBox(tank);
}

function updateEnemyTanks() {
    if (totalEnemiesSpawned < level.levelParameter.enemyCount) {
        if (enemySpawnCooldown == 52 && enemyTanks.length < level.levelParameter.maxConcurrent) {
            let position = getNextSpawnPositionWithoutUpdate();
            createSpawnAnimation(position.x, position.y, particleEffects)
        }
        if (enemySpawnCooldown > 0) enemySpawnCooldown--;
        if (enemySpawnCooldown <= 0 && enemyTanks.length < level.levelParameter.maxConcurrent) {
            spawnEnemy();
            enemySpawnCooldown = level.levelParameter.enemySpawnRate;
        }
    }

    for (let i = enemyTanks.length - 1; i >= 0; i--) {
        const enemy = enemyTanks[i];

        if (!enemy.isAlive) {
            const index = enemyTanks.indexOf(enemy);
            if (index > -1) enemyTanks.splice(index, 1);
            continue;
        }


        if (frozeTime.time > 0)
            continue;

        enemy.decisionTimer--;
        enemy.lastDirectionChange++;
        enemy.stuckTimer++;

        const isAtLeftBoundary = enemy.x <= 0;
        const isAtRightBoundary = enemy.x >= GRID_SIZE - TANK_SIZE;
        const isAtTopBoundary = enemy.y <= 0;
        const isAtBottomBoundary = enemy.y >= GRID_SIZE - TANK_SIZE;

        if ((isAtLeftBoundary && enemy.direction === 3) ||
            (isAtRightBoundary && enemy.direction === 1) ||
            (isAtTopBoundary && enemy.direction === 0) ||
            (isAtBottomBoundary && enemy.direction === 2)) {
            enemy.direction = Math.floor(Math.random() * 4);
            enemy.decisionTimer = 10;
            enemy.stuckTimer = 0;
            enemy.needsAlignment = true;
        }

        if (enemy.decisionTimer <= 0) {
            if (Math.random() < 0.15) {
                const oldDirection = enemy.direction;
                const newDirection = Math.floor(Math.random() * 4);

                if (needsAlignment(oldDirection, newDirection)) {
                    enemy.needsAlignment = true;
                    alignTankToGrid(enemy);
                } else {
                    enemy.direction = newDirection;
                }
                enemy.lastDirectionChange = 0;
                enemy.stuckTimer = 0;
            }
            enemy.decisionTimer = Math.floor(Math.random() * 60) + 40;
        }

        enemy.fireTimer--;
        if (enemy.fireTimer <= 0) {
            fireEnemyBullet(enemy);
            enemy.fireTimer = Math.floor(Math.random() * 60) + 60;
        }

        if (enemy.needsAlignment) {
            alignTankToGrid(enemy);
        }

        let newX = enemy.x;
        let newY = enemy.y;

        switch (enemy.direction) {
            case 0: newY -= enemy.speed / CELL_SIZE; break;
            case 1: newX += enemy.speed / CELL_SIZE; break;
            case 2: newY += enemy.speed / CELL_SIZE; break;
            case 3: newX -= enemy.speed / CELL_SIZE; break;
        }

        newX = Math.max(0, Math.min(GRID_SIZE - TANK_SIZE, newX));
        newY = Math.max(0, Math.min(GRID_SIZE - TANK_SIZE, newY));

        if (wouldCollideWithObstacleAtPosition(newX, newY) || wouldCollideWithRiver(newX, newY, rivers)) {
            enemy.direction = Math.floor(Math.random() * 4);
            enemy.needsAlignment = true;
            enemy.stuckTimer = 0;
            continue;
        }

        let wouldCollideWithPlayer = false;
        // Check collision with AI tank
        if (AITank.isAlive) {
            if (checkTankVisualCollision(newX, newY, AITank.bx, AITank.by, TANK_SIZE, TANK_SIZE)) {
                wouldCollideWithPlayer = true;
            }
        }
        // Check collision with human tank
        if (humanTank.isAlive) {
            if (checkTankVisualCollision(newX, newY, humanTank.bx, humanTank.by, TANK_SIZE, TANK_SIZE)) {
                wouldCollideWithPlayer = true;
            }
        }

        let wouldCollideWithEnemy = false;
        for (const otherEnemy of enemyTanks) {
            if (otherEnemy !== enemy && otherEnemy.isAlive) {
                if (checkTankVisualCollision(newX, newY, otherEnemy.bx, otherEnemy.by, TANK_SIZE, TANK_SIZE)) {
                    wouldCollideWithEnemy = true;
                    break;
                }
            }
        }

        if (!wouldCollideWithPlayer) {
            enemy.x = newX;
            enemy.y = newY;
            updateTankPhysicalBox(enemy);

            if (wouldCollideWithEnemy) {
                enemy.decisionTimer = Math.max(5, enemy.decisionTimer - 10);

                if (enemy.stuckTimer > 30) {
                    enemy.direction = Math.floor(Math.random() * 4);
                    enemy.stuckTimer = 0;
                    enemy.needsAlignment = true;
                }
            }
        } else {
            enemy.direction = Math.floor(Math.random() * 4);
            enemy.needsAlignment = true;
            enemy.stuckTimer = 0;
        }
    }
}

function fireEnemyBullet(enemy) {
    if (!enemy || !enemy.isAlive) return;

    let bulletX = enemy.x + TANK_SIZE / 2 - BULLET_SIZE / 2;
    let bulletY = enemy.y + TANK_SIZE / 2 - BULLET_SIZE / 2;

    switch (enemy.direction) {
        case 0: // Up
            bulletY = enemy.y - BULLET_SIZE + BULLET_OFFSET;
            break;
        case 1: // Right
            bulletX = enemy.x + TANK_SIZE - BULLET_OFFSET;
            break;
        case 2: // Down
            bulletY = enemy.y + TANK_SIZE - BULLET_OFFSET;
            break;
        case 3: // Left
            bulletX = enemy.x - BULLET_SIZE + BULLET_OFFSET;
            break;
    }

    let bulletSpeed = enemy.playerType == "enemy3" ? FAST_BULLET_SPEED : BULLET_SPEED;

    bullets.push({
        x: bulletX, y: bulletY,
        direction: enemy.direction,
        speed: bulletSpeed,
        isAITank: false,
        isHuman: false
    });
}

function updateBullets() {
    if (bulletCooldown > 0) bulletCooldown--;
    if (humanTank.bulletCooldown > 0) humanTank.bulletCooldown--;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        switch (bullet.direction) {
            case 0: bullet.y -= bullet.speed / CELL_SIZE; break;
            case 1: bullet.x += bullet.speed / CELL_SIZE; break;
            case 2: bullet.y += bullet.speed / CELL_SIZE; break;
            case 3: bullet.x -= bullet.speed / CELL_SIZE; break;
        }

        // ========== 新增：检测基地碰撞 ==========
        if (base.isAlive) {
            const bulletRight = bullet.x + BULLET_SIZE;
            const bulletBottom = bullet.y + BULLET_SIZE;

            if (bullet.x < base.x + base.width &&
                bulletRight > base.x &&
                bullet.y < base.y + base.height &&
                bulletBottom > base.y) {

                // 基地被摧毁
                base.isAlive = false;
                createBulletExplosion(bullet.x, bullet.y, BULLET_SIZE, CELL_SIZE, particleEffects);
                createBigExplosion(base, particleEffects)
                sound[6].currentTime = 0;
                sound[6].play();
                bullets.splice(i, 1);
                break;
            }
        }

        // Check steel wall collision (bullet should be destroyed after hitting steel)
        let hitSteel = checkBulletSteelCollision(bullet, AITank, humanTank, steelWalls, BULLET_SIZE, CELL_SIZE, particleEffects);
        // Check brick wall collision
        let hitBrick = checkBulletBrickCollision(bullet);

        // If bullet hit something, destroy it
        if (hitSteel || hitBrick) {
            createBulletExplosion(bullet.x, bullet.y, BULLET_SIZE, CELL_SIZE, particleEffects);

            // Apply cooldown based on which tank fired the bullet
            if (bullet.isAITank) {
                if (AITank.powerLevel <= 3 && hitSteel) {
                    sound[1].currentTime = 0;
                    sound[1].play();
                }

                if (hitBrick || (AITank.powerLevel > 3 && hitSteel)) {
                    sound[2].currentTime = 0;
                    sound[2].play();
                }


                bulletCooldown = getBulletCooldown(AITank);
            }
            if (bullet.isHuman) {
                if (humanTank.powerLevel <= 3 && hitSteel) {
                    sound[1].currentTime = 0;
                    sound[1].play();
                }
                if (hitBrick || (humanTank.powerLevel > 3 && hitSteel)) {
                    sound[2].currentTime = 0;
                    sound[2].play();
                }

                humanTank.bulletCooldown = getBulletCooldown(humanTank);
            }

            bullets.splice(i, 1);
        }

        // Check bullet-to-bullet collisions
        for (let j = i + 1; j < bullets.length; j++) {
            const otherBullet = bullets[j];
            if ((bullet.isAITank && !otherBullet.isAITank && !otherBullet.isHuman) ||
                (bullet.isHuman && !otherBullet.isAITank && !otherBullet.isHuman) ||
                (!bullet.isAITank && !bullet.isHuman && (otherBullet.isAITank || otherBullet.isHuman))) {

                if (checkPhysicalCollision(bullet.x - 0.1, bullet.y - 0.1, BULLET_SIZE + 0.2, BULLET_SIZE + 0.2,
                    otherBullet.x - 0.1, otherBullet.y - 0.1, BULLET_SIZE + 0.2, BULLET_SIZE + 0.2)) {

                    if (bullet.isAITank) {
                        bulletCooldown = getBulletCooldown(AITank);
                        bulletsDestroyed++;
                        callUpdateAIDisplay();
                    }
                    if (bullet.isHuman) {
                        humanTank.bulletCooldown = getBulletCooldown(humanTank);
                    }
                    bullets.splice(j, 1);
                    bullets.splice(i, 1);
                    return;
                }
            }
        }

        // Check collision with enemy tanks
        for (let j = enemyTanks.length - 1; j >= 0; j--) {
            const enemy = enemyTanks[j];
            if (enemy.isAlive && (bullet.isAITank || bullet.isHuman)) {
                if (checkPhysicalCollision(bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE, enemy.bx, enemy.by, TANK_SIZE, TANK_SIZE)) {
                    createBulletExplosion(bullet.x, bullet.y, BULLET_SIZE, CELL_SIZE, particleEffects);
                    bullets.splice(i, 1);
                    if (bullet.isAITank) {
                        bulletCooldown = getBulletCooldown(AITank);
                    }
                    if (bullet.isHuman) {
                        humanTank.bulletCooldown = getBulletCooldown(humanTank);
                    }

                    if (enemy.hasPowerUp) {
                        enemy.hasPowerUp = false;
                        powerUp.spawn();
                        sound[5].currentTime = 0;
                        sound[5].play();
                    }

                    if (enemy.playerType == "enemy4" && enemy.health > 1) {
                        enemy.health--;
                        sound[4].currentTime = 0;
                        sound[4].play();
                        break;
                    }

                    enemy.isAlive = false;
                    createBigExplosion(enemy, particleEffects)
                    sound[3].currentTime = 0;
                    sound[3].play();

                    let reward = 0;

                    if (enemy.playerType === "enemy1") {
                        reward = 100;
                    } else if (enemy.playerType === "enemy2") {
                        reward = 200;
                    } else if (enemy.playerType === "enemy3") {
                        reward = 300;
                    } else if (enemy.playerType === "enemy4") {
                        reward = 400;
                    }

                    // 2. Assign the reward to the correct tank
                    if (bullet.isAITank) {
                        enemiesKilled++;
                        callUpdateAIDisplay();
                        AITank.score += reward; // Add calculated reward
                    } else {
                        humanTank.score += reward; // Add calculated reward
                    }

                    break;
                }
            }
        }

        // Check collision with AI tank
        if (AITank.isAlive && !bullet.isAITank && !bullet.isHuman) {
            if (checkPhysicalCollision(bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE, AITank.bx, AITank.by, TANK_SIZE, TANK_SIZE)) {
                if (AITank.invulnerableTimer > 0) {
                    bullets.splice(i, 1);
                    break;
                }

                // Check if tank has extra life (power level 5)
                if (!handleTankHit(AITank)) {
                    // Tank survived due to extra life
                    createBulletExplosion(bullet.x, bullet.y, BULLET_SIZE, CELL_SIZE, particleEffects);
                    sound[4].currentTime = 0;
                    sound[4].play();
                    bullets.splice(i, 1);
                    break;
                }

                AITank.isAlive = false;
                AITank.canShoot = false;
                AITank.respawnTimer = 100;
                createBulletExplosion(bullet.x, bullet.y, BULLET_SIZE, CELL_SIZE, particleEffects);
                createBigExplosion(AITank, particleEffects);
                sound[6].currentTime = 0;
                sound[6].play();
                AITank.lives--;
                AITank.powerLevel = 1;
                bullets.splice(i, 1);
                break;
            }
        }

        // Check collision with human tank
        if (humanTank.isAlive && !bullet.isAITank && !bullet.isHuman) {
            if (checkPhysicalCollision(bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE, humanTank.bx, humanTank.by, TANK_SIZE, TANK_SIZE)) {
                if (humanTank.invulnerableTimer > 0) {
                    bullets.splice(i, 1);
                    break;
                }
                // Check if tank has extra life (power level 5)
                if (!handleTankHit(humanTank)) {
                    // Tank survived due to extra life
                    createBulletExplosion(bullet.x, bullet.y, BULLET_SIZE, CELL_SIZE, particleEffects);
                    sound[4].currentTime = 0;
                    sound[4].play();
                    bullets.splice(i, 1);
                    break;
                }

                humanTank.isAlive = false;
                humanTank.canShoot = false;
                humanTank.respawnTimer = 100;
                createBulletExplosion(bullet.x, bullet.y, BULLET_SIZE, CELL_SIZE, particleEffects);
                createBigExplosion(humanTank, particleEffects);
                sound[6].currentTime = 0;
                sound[6].play();
                humanTank.lives--;
                humanTank.powerLevel = 1;
                bullets.splice(i, 1);
                break;
            }
        }



        // Check if bullet is out of bounds
        if (bullet.x < (BULLET_SIZE / 2) || bullet.x >= (GRID_SIZE - BULLET_SIZE / 2) ||
            bullet.y < (BULLET_SIZE / 2) || bullet.y >= (GRID_SIZE - BULLET_SIZE / 2)) {

            let explosionX = bullet.x;
            let explosionY = bullet.y;

            if (bullet.x < -1) explosionX = -0.5;
            if (bullet.x > GRID_SIZE) explosionX = GRID_SIZE - 0.5;
            if (bullet.y < -1) explosionY = -0.5;
            if (bullet.y > GRID_SIZE) explosionY = GRID_SIZE - 0.5;

            createBulletExplosion(explosionX, explosionY, BULLET_SIZE, CELL_SIZE, particleEffects);
            bullets.splice(i, 1);

            // Apply cooldown based on which tank fired the bullet
            if (bullet.isAITank) {
                bulletCooldown = getBulletCooldown(AITank);
                sound[1].currentTime = 0;
                sound[1].play();
            }
            if (bullet.isHuman) {
                humanTank.bulletCooldown = getBulletCooldown(humanTank);
                sound[1].currentTime = 0;
                sound[1].play();
            }
        }
    }

    //document.getElementById('bulletCount').textContent = bullets.length;
    //document.getElementById('cooldownDisplay').textContent = bulletCooldown;
}

function firePlayerBullet(playerType) {
    let tank, isAITank, isHuman;

    if (playerType === 'ai') {
        sound[0].currentTime = 0;
        sound[0].play();
        tank = AITank;
        isAITank = true;
        isHuman = false;

        if (!tank.isAlive || !tank.canShoot) return;

        const maxBullets = canShootMultipleBullets(tank) ? MAX_BULLET : 1;
        if (bullets.filter(b => b.isAITank).length >= maxBullets || bulletCooldown > 0) return;

        bulletCooldown = getBulletCooldown(tank);
    } else {

        sound[0].currentTime = 0;
        sound[0].play();
        tank = humanTank;
        isAITank = false;
        isHuman = true;

        if (!tank.isAlive || !tank.canShoot) return;

        const maxBullets = canShootMultipleBullets(tank) ? MAX_BULLET : 1;
        if (bullets.filter(b => b.isHuman).length >= maxBullets || tank.bulletCooldown > 0) return;

        tank.bulletCooldown = getBulletCooldown(tank);
    }

    let bulletX = tank.x + TANK_SIZE / 2 - BULLET_SIZE / 2;
    let bulletY = tank.y + TANK_SIZE / 2 - BULLET_SIZE / 2;

    switch (tank.direction) {
        case 0: // Up - move DOWN slightly
            bulletY = tank.y - BULLET_SIZE + BULLET_OFFSET;
            break;
        case 1: // Right - move LEFT slightly
            bulletX = tank.x + TANK_SIZE - BULLET_OFFSET;
            break;
        case 2: // Down - move UP slightly
            bulletY = tank.y + TANK_SIZE - BULLET_OFFSET;
            break;
        case 3: // Left - move RIGHT slightly
            bulletX = tank.x - BULLET_SIZE + BULLET_OFFSET;
            break;
    }

    bullets.push({
        x: bulletX, y: bulletY,
        direction: tank.direction,
        speed: getBulletSpeed(tank),
        isAITank: isAITank,
        isHuman: isHuman
    });
    if (playerType === 'ai')
        tank.firingDirection = tank.direction;
}

// ========== UI CONTROL FUNCTIONS ==========

function togglePause() {
    if (!gamePaused) {

        sound[9].currentTime = 0;
        sound[9].play();
        sound[10].pause();
        sound[11].pause()
    }
    gamePaused = !gamePaused;
    const button = document.getElementById('pauseBtn');
    button.textContent = gamePaused ? 'Resume' : 'Pause';
    button.classList.toggle('active', gamePaused);
}

function toggleAI() {
    aiEnabled = !aiEnabled;
    const button = document.getElementById('aiToggle');
    //button.textContent = aiEnabled ? 'Disable AI' : 'Enable AI';
    //button.classList.toggle('active', aiEnabled);

    if (aiEnabled) {
        keys['w'] = keys['a'] = keys['s'] = keys['d'] = keys[' '] = false;
        fireKeyPressed = false;
        aiMoveCooldown = 0;
        aiShootCooldown = 0;
        aiShotDirection = null;
        aiStrategy = "Initializing";
    }
}

function toggleBoundingBox() {
    showBoundingBox = !showBoundingBox;
    const button = document.getElementById('toggleBoundingBox');
    button.textContent = showBoundingBox ? 'Debug' : 'Debug';
    button.classList.toggle('active', showBoundingBox);

    showPredictions = !showPredictions;
    button = document.getElementById('togglePrediction');
    button.textContent = showPredictions ? 'Hide Predictions' : 'Show Predictions';
    button.classList.toggle('active', showPredictions);
}

function updateTitleAnimation() {
    // Move title up until it reaches center
    if (titleY > canvas.height / 3) {
        titleY -= 5; // Adjust speed as needed
    }
}

function startGame() {
    if (gameState === 'ready') {
        gameState = 'playing';
        frameCount = -180;
    }
}

export function drawTitleScreen() {
    // Clear canvas with black background
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the rolling title
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.font = `bold ${24 * zoomLevel}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw "BATTLE CITY" with shadow for better visibility
    ctx.shadowColor = '#FF4500'; // Orange-red shadow
    ctx.shadowBlur = 10;
    ctx.fillText('BATTLE CITY', canvas.width / 2, titleY);
    ctx.shadowBlur = 0; // Reset shadow

    // If title has reached center, show start prompt
    if (titleY <= canvas.height / 3) {
        gameState = 'ready';

        // Draw start prompt
        ctx.fillStyle = '#FFF';
        ctx.font = `24px Arial`;

        ctx.fillText('CLICK OR TAP HERE TO START', canvas.width / 2, canvas.height / 2 + 80);
        if (window.innerWidth >= 768) {
            ctx.font = `20px Arial`;
            ctx.fillText("Press 'L' key to shoot, arrow keys to move around", canvas.width / 2, canvas.height / 2 + 130);
        }
    }
    ctx.restore();
}




function drawLevelTransition() {
    ctx.save();
    ctx.fillStyle = '#808080'; // Gray
    if (frameCount < -149) {
        let levelRectHeight = canvas.height / 2 * (1 - (-150 - frameCount) / 30);
        ctx.fillRect(0, 0, canvas.width, levelRectHeight);
        let yPox = canvas.height;
        ctx.fillRect(0, yPox - levelRectHeight, canvas.width, levelRectHeight);
    }

    if (frameCount >= -149) {
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.font = `25px Arial`;
        ctx.fillText('Stage ' + levelNum, canvas.width / 2 - 25, canvas.height / 2);
        stageClear = false;
    }

    if (frameCount == -149) {
        initializeMap(levelNum, brickWalls, steelWalls, rivers, bushes, level);
        enemySpawnCooldown = 120;
        totalEnemiesSpawned = 0;
        aiLastUpdate = 0;
        powerUp.remove();
        frozeTime.time = 0;
        powerUp.clearShovelTimer();





        sound[10].pause();
        sound[11].pause();
    }

    ctx.restore();
}

function drawLevelTransitionClosing() {
    ctx.save();
    let levelRectHeight = canvas.height / 2 * ((30 - frameCount) / 30);
    ctx.fillStyle = '#808080'; // Gray
    ctx.fillRect(0, 0, canvas.width, levelRectHeight);

    ctx.fillRect(0, canvas.height - levelRectHeight, canvas.width, levelRectHeight);
    ctx.restore();
}


// ========== MAIN GAME LOOP ==========
function gameLoop() {
    if (gamePaused) {
        requestAnimationFrame(gameLoop);
        return;
    }



    // Handle title/start screen
    if (gameState !== 'playing') {
        updateTitleAnimation();
        drawTitleScreen(ctx, canvas, titleY, zoomLevel);

        // Skip game logic during title screen
        requestAnimationFrame(gameLoop);
        return;
    }

    if (frameCount < 0) {
        drawLevelTransition();
        frameCount++;
        requestAnimationFrame(gameLoop);
        return;
    }

    document.getElementById('p1Score').textContent = humanTank.score;
    document.getElementById('p1Lives').textContent = humanTank.lives;

    document.getElementById('p2Score').textContent = AITank.score;
    document.getElementById('p2Lives').textContent = AITank.lives;

    document.getElementById('tankRemains').textContent = level.levelParameter.enemyCount - totalEnemiesSpawned;
    document.getElementById('currentStage').textContent = levelNum;

    if (totalEnemiesSpawned == level.levelParameter.enemyCount && enemyTanks.length == 0 && !stageClear) {
        setTimeout(() => {
            levelNum++;
            frameCount = -180;
        }, 4000);
        stageClear = true;
    }

    updateTank(AITank, true);
    updateTank(humanTank, false);
    updateEnemyTanks();
    if (frozeTime.time > 0)
        frozeTime.time--;
    updateBullets();
    updateParticleEffects(particleEffects);
    checkAllPowerUpCollisions(powerUp, AITank, humanTank, particleEffects, enemyTanks, frozeTime, brickWalls, steelWalls);

    aiTargetEnemy = findPriorityEnemy();
    enemyFacingPlayer = aiTargetEnemy ? isEnemyFacingAITank(aiTargetEnemy) : false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    drawBackground(ctx, canvas);
    drawBrickWalls(ctx, brickWalls, zoomLevel, CELL_SIZE, showBoundingBox);
    drawSteelWalls(ctx, steelWalls, zoomLevel, CELL_SIZE, showBoundingBox);
    drawRivers(ctx, rivers, zoomLevel, CELL_SIZE, showBoundingBox); // NEW: Draw rivers
    drawBase(ctx, base, zoomLevel, CELL_SIZE, BASE_SIZE);
    drawBullets(ctx, bullets, zoomLevel, CELL_SIZE, BULLET_SIZE, showBoundingBox);
    drawTank(ctx, AITank, zoomLevel, CELL_SIZE, TANK_SIZE, showBoundingBox, frameCount, frozeTime);
    drawTank(ctx, humanTank, zoomLevel, CELL_SIZE, TANK_SIZE, showBoundingBox, frameCount, frozeTime);
    enemyTanks.forEach(enemy => drawTank(ctx, enemy, zoomLevel, CELL_SIZE, TANK_SIZE, showBoundingBox, frameCount, frozeTime));
    drawBushes(ctx, bushes, zoomLevel, CELL_SIZE);
    drawParticleEffects(CELL_SIZE, zoomLevel, ctx, particleEffects);


    powerUp.draw(ctx, CELL_SIZE * zoomLevel, frameCount, zoomLevel);

    // Draw prediction visuals
    if (showPredictions) {
        drawFuturePosition(ctx, zoomLevel, CELL_SIZE, TANK_SIZE, showPredictions, enemyFuturePosition, aiTargetEnemy, AI_PREDICTION_TIME);
        drawPredictionLineOfSight(ctx, zoomLevel, CELL_SIZE, TANK_SIZE, showPredictions, enemyFuturePosition, AITank, predictionLineOfSight);
        drawPerpendicularBulletWarnings(ctx, zoomLevel, CELL_SIZE, BULLET_SIZE, showPredictions, perpendicularBullets);
    }

    if (frameCount >= 0 && frameCount <= 30) {
        drawLevelTransitionClosing();
    }

    frameCount++;
    if (frameCount == 1) {
        AITank.isAlive = false;
        humanTank.isAlive = false;
        sound[12].play();
    }
    if (frameCount == 30 && levelNum == 1)
        if (!aiEnabled)
            toggleAI();
    requestAnimationFrame(gameLoop);
}

// ========== INITIALIZATION ==========
async function init() {
    document.getElementById('newGameBtn').addEventListener('click', function () {
        location.reload(); // Reloads the current page
    });
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('toggleBoundingBox').addEventListener('click', toggleBoundingBox);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);


    drawLoadingScreen("Loading map...", 10, ctx, gameState, canvas);
    await loadAllLevelImages();
    await initializeSound(sound, ctx, gameState, canvas);

    powerUp.setSound(sound);
    drawLoadingScreen("Loading tank sprites...", 90, ctx, gameState, canvas);
    await loadEntitySprites();
    drawLoadingScreen("Loading particle effects...", 95, ctx, gameState, canvas);
    await loadParticleSprites()
    drawLoadingScreen("Ready!", 100, ctx, gameState, canvas);
    bricksDestroyed = 0;
    updateWallCount(brickWalls, steelWalls, bricksDestroyed);
    updateNextSpawnPosition();
    callUpdateAIDisplay();

    window.mobileGamepad = new MobileGamepad();
    window.addEventListener('blur', () => {
        if (window.mobileGamepad) {
            window.mobileGamepad.releaseAllKeys();
        }
    });
    document.querySelectorAll('.dpad-btn, .fire-btn, .pause-btn').forEach(btn => {
        btn.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
    });
    canvas.addEventListener('click', startGame);
    gameState = 'title';
    titleY = canvas.height;


    requestAnimationFrame(gameLoop);
}

window.addEventListener('load', () => init());
