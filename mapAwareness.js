// Check if bullet is moving perpendicular to player's movement direction
export function isBulletPerpendicularToMovement(bullet, AITank) {
    if (!AITank.moving || AITank.direction === null) return false;

    // Check if bullet direction is perpendicular to player's movement direction
    const playerDir = AITank.direction;
    const bulletDir = bullet.direction;

    const isPerpendicular =
        (playerDir === 0 && (bulletDir === 1 || bulletDir === 3)) ||
        (playerDir === 2 && (bulletDir === 1 || bulletDir === 3)) ||
        (playerDir === 1 && (bulletDir === 0 || bulletDir === 2)) ||
        (playerDir === 3 && (bulletDir === 0 || bulletDir === 2));

    return isPerpendicular;
}


// Enhanced perpendicular path intersection check
export function checkPerpendicularPathIntersection(playerX, playerY, playerDir, bullet, CELL_SIZE, PLAYER_SPEED, BULLET_SPEED, AI_BULLET_COLLISION_THRESHOLD) {
    // Predict player's movement path
    let playerPath = [];
    for (let frame = 0; frame < 30; frame++) {
        let futurePlayerX = playerX;
        let futurePlayerY = playerY;

        switch (playerDir) {
            case 0: futurePlayerY -= (PLAYER_SPEED / CELL_SIZE) * frame; break;
            case 1: futurePlayerX += (PLAYER_SPEED / CELL_SIZE) * frame; break;
            case 2: futurePlayerY += (PLAYER_SPEED / CELL_SIZE) * frame; break;
            case 3: futurePlayerX -= (PLAYER_SPEED / CELL_SIZE) * frame; break;
        }

        playerPath.push({ x: futurePlayerX, y: futurePlayerY, frame: frame });
    }

    // Predict bullet's path
    let bulletPath = [];
    for (let frame = 0; frame < 30; frame++) {
        let futureBulletX = bullet.x;
        let futureBulletY = bullet.y;

        switch (bullet.direction) {
            case 0: futureBulletY -= (BULLET_SPEED / CELL_SIZE) * frame; break;
            case 1: futureBulletX += (BULLET_SPEED / CELL_SIZE) * frame; break;
            case 2: futureBulletY += (BULLET_SPEED / CELL_SIZE) * frame; break;
            case 3: futureBulletX -= (BULLET_SPEED / CELL_SIZE) * frame; break;
        }

        bulletPath.push({ x: futureBulletX, y: futureBulletY, frame: frame });
    }

    // Check for intersections
    for (const playerPos of playerPath) {
        for (const bulletPos of bulletPath) {
            const dx = Math.abs(playerPos.x - bulletPos.x);
            const dy = Math.abs(playerPos.y - bulletPos.y);

            // Check if positions are close enough for collision
            if (dx < AI_BULLET_COLLISION_THRESHOLD && dy < AI_BULLET_COLLISION_THRESHOLD) {
                const ttc = Math.max(playerPos.frame, bulletPos.frame);
                return {
                    willCross: true,
                    ttc: ttc,
                    playerPos: playerPos,
                    bulletPos: bulletPos
                };
            }
        }
    }

    return { willCross: false, ttc: Infinity };
}

// Predict bullet position after n frames
export function predictBulletPosition(bullet, framesAhead = 1, CELL_SIZE) {
    let futureX = bullet.x;
    let futureY = bullet.y;

    switch (bullet.direction) {
        case 0: futureY -= bullet.speed / CELL_SIZE * framesAhead; break;
        case 1: futureX += bullet.speed / CELL_SIZE * framesAhead; break;
        case 2: futureY += bullet.speed / CELL_SIZE * framesAhead; break;
        case 3: futureX -= bullet.speed / CELL_SIZE * framesAhead; break;
    }

    return { x: futureX, y: futureY };
}

// Check if a path will intersect with a bullet
export function willPathIntersectBullet(startX, startY, direction, bullet, CELL_SIZE, PLAYER_SPEED, AI_BULLET_PREDICTION_FRAMES, AI_BULLET_COLLISION_THRESHOLD) {
    // Predict bullet's future positions
    for (let frame = 0; frame < AI_BULLET_PREDICTION_FRAMES; frame++) {
        const bulletPos = predictBulletPosition(bullet, frame, CELL_SIZE);

        // Predict player's future position if moving in this direction
        let playerPosX = startX;
        let playerPosY = startY;

        switch (direction) {
            case 0: playerPosY -= (PLAYER_SPEED / CELL_SIZE) * frame; break;
            case 1: playerPosX += (PLAYER_SPEED / CELL_SIZE) * frame; break;
            case 2: playerPosY += (PLAYER_SPEED / CELL_SIZE) * frame; break;
            case 3: playerPosX -= (PLAYER_SPEED / CELL_SIZE) * frame; break;
        }

        // Check for collision
        const dx = Math.abs(playerPosX - bulletPos.x);
        const dy = Math.abs(playerPosY - bulletPos.y);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < AI_BULLET_COLLISION_THRESHOLD) {
            return {
                willIntersect: true,
                ttc: frame, // Time to collision in frames
                distance: distance
            };
        }
    }

    return { willIntersect: false, ttc: Infinity, distance: Infinity };
}


// Check if player will walk into a perpendicular bullet
export function willWalkIntoPerpendicularBullet(AITank, bullets, CELL_SIZE, PLAYER_SPEED, BULLET_SPEED, AI_BULLET_PREDICTION_FRAMES, AI_BULLET_COLLISION_THRESHOLD, PERPENDICULAR_BULLET_RISK_DISTANCE, AI_MIN_TTC, perpendicularBullets) {
    if (!AITank.moving) return { willIntersect: false, bullet: null, ttc: Infinity };

    const enemyBullets = bullets.filter(b => !b.isAITank && !b.isHuman);
    if (enemyBullets.length === 0) return { willIntersect: false, bullet: null, ttc: Infinity };

    let closestBullet = null;
    let closestTTC = Infinity;
    let perpendicularBulletList = [];

    for (const bullet of enemyBullets) {
        // Check if bullet is moving perpendicular to player
        if (!isBulletPerpendicularToMovement(bullet, AITank)) continue;

        // Calculate if player's path will intersect with bullet's path
        const intersection = willPathIntersectBullet(AITank.x, AITank.y, AITank.direction, bullet, CELL_SIZE, PLAYER_SPEED, AI_BULLET_PREDICTION_FRAMES, AI_BULLET_COLLISION_THRESHOLD);

        if (intersection.willIntersect && intersection.ttc < closestTTC) {
            closestTTC = intersection.ttc;
            closestBullet = bullet;
        }

        // Also check bullets that are perpendicular and close to player's current path
        const dx = bullet.x - AITank.x;
        const dy = bullet.y - AITank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < PERPENDICULAR_BULLET_RISK_DISTANCE) {
            perpendicularBulletList.push({
                bullet: bullet,
                distance: distance,
                isPerpendicular: isBulletPerpendicularToMovement(bullet, AITank),
                direction: bullet.direction
            });
        }
    }

    perpendicularBullets = perpendicularBulletList;

    if (closestBullet && closestTTC < AI_MIN_TTC * 2) { // More sensitive for perpendicular bullets
        return {
            willIntersect: true,
            bullet: closestBullet,
            ttc: closestTTC,
            riskLevel: closestTTC < 10 ? "High" : "Medium"
        };
    }

    // Check for bullets that will cross player's path soon
    for (const bullet of enemyBullets) {
        if (!isBulletPerpendicularToMovement(bullet, AITank)) continue;

        // Check if bullet will cross player's intended path
        const pathIntersection = checkPerpendicularPathIntersection(AITank.x, AITank.y, AITank.direction, bullet, CELL_SIZE, PLAYER_SPEED, BULLET_SPEED, AI_BULLET_COLLISION_THRESHOLD);
        if (pathIntersection.willCross && pathIntersection.ttc < 20) {
            return {
                willIntersect: true,
                bullet: bullet,
                ttc: pathIntersection.ttc,
                riskLevel: "Medium",
                type: "path_crossing"
            };
        }
    }

    return { willIntersect: false, bullet: null, ttc: Infinity };
}

// Check if player is right next to an enemy (adjacent cells)
export function isNextToEnemy(enemy, AITank, IMMEDIATE_SHOOT_DISTANCE, CLOSE_COMBAT_DISTANCE) {
    if (!enemy || !enemy.isAlive) return false;

    const dx = Math.abs(AITank.x - enemy.x);
    const dy = Math.abs(AITank.y - enemy.y);

    // Check if enemy is adjacent (within 2 cells in either direction)
    const isAdjacent = (dx <= IMMEDIATE_SHOOT_DISTANCE && dy <= 1.5) ||
        (dy <= IMMEDIATE_SHOOT_DISTANCE && dx <= 1.5);

    // Also check if enemy is very close diagonally
    const distance = Math.sqrt(dx * dx + dy * dy);
    const isVeryClose = distance <= CLOSE_COMBAT_DISTANCE;

    return isAdjacent || isVeryClose;
}

// Get the shooting direction when enemy is adjacent
export function getShootingDirectionForAdjacentEnemy(enemy, AITank) {
    if (!enemy) return null;

    const dx = enemy.x - AITank.x;
    const dy = enemy.y - AITank.y;

    // Determine which axis has the smallest alignment error
    if (Math.abs(dx) < Math.abs(dy)) {
        // More aligned on X-axis
        if (dy > 0) {
            return 2; // Shoot down
        } else {
            return 0; // Shoot up
        }
    } else {
        // More aligned on Y-axis
        if (dx > 0) {
            return 1; // Shoot right
        } else {
            return 3; // Shoot left
        }
    }
}