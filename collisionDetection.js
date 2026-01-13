import { createBulletExplosion} from './particles.js';

// More precise collision detection for bullet vs brick
export function checkBulletBrickCollisionPrecise(bullet, brickWalls, BULLET_SIZE) {
    const collidedBricks = [];

    for (const brick of brickWalls) {
        if (!brick.isAlive()) continue;

        // Check collision with EACH BIT of the brick
        const bitsCollided = [];
        const brickX = brick.x;
        const brickY = brick.y;

        // Check each of the 4 bits
        for (let bitIndex = 0; bitIndex < 4; bitIndex++) {
            if (!brick.bits[bitIndex]) continue; // Skip destroyed bits

            // Calculate bit bounds (each bit is 0.5×0.5)
            let bitLeft, bitRight, bitTop, bitBottom;

            switch (bitIndex) {
                case 0: // Top-left
                    bitLeft = brickX;
                    bitRight = brickX + 0.5;
                    bitTop = brickY;
                    bitBottom = brickY + 0.5;
                    break;
                case 1: // Top-right
                    bitLeft = brickX + 0.5;
                    bitRight = brickX + 1;
                    bitTop = brickY;
                    bitBottom = brickY + 0.5;
                    break;
                case 2: // Bottom-left
                    bitLeft = brickX;
                    bitRight = brickX + 0.5;
                    bitTop = brickY + 0.5;
                    bitBottom = brickY + 1;
                    break;
                case 3: // Bottom-right
                    bitLeft = brickX + 0.5;
                    bitRight = brickX + 1;
                    bitTop = brickY + 0.5;
                    bitBottom = brickY + 1;
                    break;
            }

            // Check bullet collision with this specific bit
            const bulletRight = bullet.x + BULLET_SIZE;
            const bulletBottom = bullet.y + BULLET_SIZE;

            if (bullet.x < bitRight &&
                bulletRight > bitLeft &&
                bullet.y < bitBottom &&
                bulletBottom > bitTop) {

                bitsCollided.push(bitIndex);
            }
        }

        // If bullet collided with any bits of this brick
        if (bitsCollided.length > 0) {
            collidedBricks.push({
                brick: brick,
                bulletX: bullet.x,
                bulletY: bullet.y,
                direction: bullet.direction,
                collidedBits: bitsCollided // NEW: Which specific bits were hit
            });
        }
    }

    return collidedBricks;
}


export function checkPhysicalCollision(ax, ay, aw, ah, bx, by, bw, bh) {
    return (ax < bx + bw &&
        ax + aw > bx &&
        ay < by + bh &&
        ay + ah > by);
}

// Enhanced bullet collision with steel walls (check power level)
export function checkBulletSteelCollision(bullet, AITank, humanTank, steelWalls, BULLET_SIZE, CELL_SIZE, particleEffects) {
    let hitAnySteel = false;

    // Check if bullet is from a power level 4+ tank
    const isPowerLevel4Plus = (bullet.isAITank && AITank.powerLevel >= 4) ||
        (bullet.isHuman && humanTank.powerLevel >= 4);

    for (const steel of steelWalls) {
        if (!steel.isAlive) continue;

        // Check if bullet is inside the steel wall's bounds
        const bulletRight = bullet.x + BULLET_SIZE;
        const bulletBottom = bullet.y + BULLET_SIZE;
        const steelRight = steel.x + steel.width;
        const steelBottom = steel.y + steel.height;

        if (bullet.x < steelRight &&
            bulletRight > steel.x &&
            bullet.y < steelBottom &&
            bulletBottom > steel.y) {

            // Check if bullet can destroy steel (power level 4+)
            if (isPowerLevel4Plus) {
                // Destroy steel wall
                steel.isAlive = false;
                createBulletExplosion(bullet.x, bullet.y, BULLET_SIZE, CELL_SIZE, particleEffects);
                hitAnySteel = true;
                // DON'T return true immediately - continue checking other steel walls
            } else {
                // For lower power levels, bullet is blocked by steel
                return true;
            }
        }
    }

    return hitAnySteel; // Return true if any steel was destroyed (power 4+), false otherwise
}

export function checkTankVisualCollision(tankVisualX, tankVisualY, targetPhysicalX, targetPhysicalY, targetWidth = 1, targetHeight = 1) {
    return (tankVisualX < targetPhysicalX + targetWidth &&
        tankVisualX + 2 > targetPhysicalX &&
        tankVisualY < targetPhysicalY + targetHeight &&
        tankVisualY + 2 > targetPhysicalY);
}

// Check if a position collides with a river and steelwalls (for tank movement)
export function wouldCollideWithRiver(visualX, visualY, rivers) {
    for (const river of rivers) {
        if (checkTankVisualCollision(visualX, visualY, river.x, river.y, 1, 1)) {
            return true; // Tank collides with river
        }
    }
    return false;
}

export function wouldCollideWithSteelWalls(visualX, visualY, steelWalls) {
    for (const steelWall of steelWalls) {
        if(!steelWall.isAlive)
            continue;
        if (checkTankVisualCollision(visualX, visualY, steelWall.x, steelWall.y, 1, 1)) {
            return true; // Tank collides with steelWall
        }
    }
    return false;
}

export function countCollisionWithRiver(visualX, visualY, rivers) {
    let count = 0
    for (const river of rivers) {
        if (checkTankVisualCollision(visualX, visualY, river.x, river.y, 1, 1)) {
            count++;
        }
    }
    return count;
}

export function countCollisionWithSteelWalls(visualX, visualY, steelWalls) {
    let count = 0
    for (const steelWall of steelWalls) {
        if(!steelWall.isAlive)
            continue;
        if (checkTankVisualCollision(visualX, visualY, steelWall.x, steelWall.y, 1, 1)) {
            count++;
        }
    }
    return count;
}


function checkPowerUpCollision(tank, powerUp) {
    if (!powerUp || !powerUp.isAlive || !tank || !tank.isAlive) return false;
    
    // Check if tank's bounding box overlaps with power-up's bounding box
    return checkPhysicalCollision(
        tank.x, tank.y, 2, 2,
        powerUp.x, powerUp.y, powerUp.width, powerUp.height
    );
}

// Check for power-up collisions with all tanks
export function checkAllPowerUpCollisions(powerUp, AITank, humanTank, particleEffects, enemyTanks, frozeTime, brickWalls, steelWalls) {
    if (!powerUp || !powerUp.isAlive) return;
    
    // Check AI tank
    if (AITank.isAlive && checkPowerUpCollision(AITank, powerUp)) {
        // The effect is handled inside the consumed() method
        powerUp.consumed(AITank, particleEffects, enemyTanks, frozeTime, brickWalls, steelWalls);
    }
    
    // Check human tank
    if (humanTank.isAlive && checkPowerUpCollision(humanTank, powerUp)) {
        // The effect is handled inside the consumed() method
        powerUp.consumed(humanTank, particleEffects, enemyTanks, frozeTime, brickWalls, steelWalls);
    }
}
