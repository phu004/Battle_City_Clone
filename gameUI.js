export function updatePlayerDisplay(bulletCollisionRisk, 
                                    safeDirection, 
                                    bulletTimeToCollision, 
                                    moveBlockedByBullet, 
                                    perpendicularBulletRisk, 
                                    nextToEnemy,
                                    AILives,
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
                                    shouldPredictiveShoot,
) {

    /*document.getElementById('AILives').textContent = AILives;
    document.getElementById('tankPosition').textContent = `${AITank.x.toFixed(1)},${AITank.y.toFixed(1)}`;
    document.getElementById('boundingBox').textContent = `${AITank.bx},${AITank.by}`;
 

    const directions = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
    document.getElementById('tankDirection').textContent = directions[AITank.direction];
    document.getElementById('needsAlignmentStatus').textContent = AITank.needsAlignment ? "Yes" : "No";
    document.getElementById('needsAlignmentStatus').style.color = AITank.needsAlignment ? '#ff9900' : '#44ff44';
    document.getElementById('aiShootCooldown').textContent = aiShootCooldown;

    document.getElementById('enemyFacingPlayer').textContent = enemyFacingPlayer ? "Yes" : "No";
    document.getElementById('enemyFacingPlayer').style.color = enemyFacingPlayer ? '#ff4444' : '#44ff44';

    document.getElementById('aiStrategy').textContent = aiStrategy;

    document.getElementById('lineOfSightStatus').textContent = lineOfSightToEnemy ? "Yes" : "No";
    document.getElementById('lineOfSightStatus').style.color = lineOfSightToEnemy ? '#44ff44' : '#ff4444';

    document.getElementById('canShootEnemyStatus').textContent = canShootEnemy ? "Yes" : "No";
    document.getElementById('canShootEnemyStatus').style.color = canShootEnemy ? '#44ff44' : '#ff4444';

    document.getElementById('bulletCollisionStatus').textContent = bulletCollisionRisk;
    document.getElementById('bulletCollisionStatus').style.color =
        bulletCollisionRisk === "Safe" ? '#44ff44' :
            bulletCollisionRisk === "Low" ? '#ffff44' : '#ff4444';

    document.getElementById('safeDirectionStatus').textContent = safeDirection !== null ?
        ['Stop', 'Up', 'Right', 'Down', 'Left'][safeDirection + 1] : 'None';

    document.getElementById('bulletTTCStatus').textContent =
        bulletTimeToCollision === null || bulletTimeToCollision === undefined || bulletTimeToCollision === Infinity ?
            '∞' : bulletTimeToCollision.toFixed(1);
    document.getElementById('bulletTTCStatus').style.color =
        bulletTimeToCollision < 10 ? '#ff4444' :
            bulletTimeToCollision < 20 ? '#ff9900' : '#44ff44';

    document.getElementById('moveBlockedStatus').textContent = moveBlockedByBullet ? "Yes" : "No";
    document.getElementById('moveBlockedStatus').style.color = moveBlockedByBullet ? '#ff4444' : '#44ff44';

    // Update prediction display
    document.getElementById('predictionStatus').textContent = predictionActive ? "Yes" : "No";
    document.getElementById('futurePosition').textContent = enemyFuturePosition ?
        `${enemyFuturePosition.x.toFixed(1)},${enemyFuturePosition.y.toFixed(1)}` : "N/A";
    document.getElementById('predictionLOS').textContent = predictionLineOfSight ? "Yes" : "No";
    document.getElementById('enemyPathClear').textContent = enemyPathClear ? "Yes" : "No";
    document.getElementById('shouldPredictiveShoot').textContent = shouldPredictiveShoot ? "Yes" : "No";

    // Update new display
    document.getElementById('perpendicularRiskStatus').textContent = perpendicularBulletRisk;
    document.getElementById('perpendicularRiskStatus').style.color =
        perpendicularBulletRisk === "High" ? '#ff4444' :
            perpendicularBulletRisk === "Medium" ? '#ff9900' : '#44ff44';

    document.getElementById('nextToEnemyStatus').textContent = nextToEnemy ? "Yes" : "No";
    document.getElementById('nextToEnemyStatus').style.color = nextToEnemy ? '#ff4444' : '#44ff44';*/
}


export function updateCanvasSize(BASE_SIZE, zoomLevel, canvas) {
    const size = BASE_SIZE * zoomLevel;
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    //document.getElementById('currentZoom').textContent = `${zoomLevel}x`;
}

export function updateEnemyDisplay(enemyTanks, MAX_ENEMIES, enemySpawnCooldown) {
    const aliveEnemies = enemyTanks.filter(e => e.isAlive).length;
    document.getElementById('enemyCount').textContent = `${aliveEnemies}/${MAX_ENEMIES}`;
    document.getElementById('enemySpawnCD').textContent = Math.ceil(enemySpawnCooldown / 60);
}

// Update wall count display
export function updateWallCount(brickWalls, steelWalls, bricksDestroyed) {
    const aliveBrickWalls = brickWalls.filter(wall => wall.isAlive()).length;
    const aliveSteelWalls = steelWalls.filter(steel => steel.isAlive).length;

    //document.getElementById('wallCount').textContent = aliveBrickWalls;
    //document.getElementById('steelWallCount').textContent = aliveSteelWalls;

    // Calculate remaining bits in brick walls
    let remainingBits = 0;
    for (const wall of brickWalls) {
        if (wall.isAlive()) {
            remainingBits += wall.getRemainingBits();
        }
    }
    //document.getElementById('brickBitsLeft').textContent = remainingBits;
    //document.getElementById('bricksDestroyed').textContent = bricksDestroyed;
}

export function updateAIDisplay(enemiesKilled, bulletsDodged, bulletsDestroyed, bricksDestroyed) {
    //document.getElementById('enemiesKilled').textContent = enemiesKilled;
    //document.getElementById('bulletsDodged').textContent = bulletsDodged;
    //document.getElementById('bulletsDestroyed').textContent = bulletsDestroyed;
    //document.getElementById('bricksDestroyed').textContent = bricksDestroyed;
   
}

export function updateAIDisplayInfo(aiEnabled,
                                    aiTargetEnemy,
                                    aiAction,
                                aiCurrentPath,
                                dangerLevel,
                                aiStrategy,
                                aiShooting,
) {
    /*document.getElementById('aiStatus').textContent = aiEnabled ? "Active" : "Off";
    document.getElementById('aiStatus').style.color = aiEnabled ? '#00ff00' : '#ff4444';
    document.getElementById('aiTarget').textContent = aiTargetEnemy ? `(${aiTargetEnemy.x.toFixed(1)}, ${aiTargetEnemy.y.toFixed(1)})` : "None";
    document.getElementById('aiAction').textContent = aiAction;
    document.getElementById('aiPathLength').textContent = aiCurrentPath.length;
    document.getElementById('dangerLevel').textContent = dangerLevel;
    document.getElementById('dangerLevel').style.color =
        dangerLevel === "Critical" ? '#ff0000' :
            dangerLevel === "High" ? '#ff4444' :
                dangerLevel === "Medium" ? '#ff9900' : '#44ff44';

    const indicator = document.getElementById('aiStatusIndicator');
    const statusText = document.getElementById('aiStatusText');
    indicator.className = 'status-indicator';

    if (aiEnabled) {
        indicator.classList.add('status-active');
        statusText.textContent = `AI: ${aiAction} | Strategy: ${aiStrategy}${aiShooting ? " | SHOOTING!" : ""}`;
    } else {
        indicator.classList.add('status-ready');
        statusText.textContent = 'AI: Ready to enable';
    }*/
}