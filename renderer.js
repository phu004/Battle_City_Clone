const imgSrc = `sprites/sprite1.png?v=${Date.now()}`;
const spriteImg = new Image();

export async function loadEntitySprites() {
    spriteImg.src = imgSrc;

    // Wait until the image is loaded
    await new Promise((resolve, reject) => {
        spriteImg.onload = resolve;
        spriteImg.onerror = reject;
    });
}

export function drawBackground(ctx, canvas) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawBrickWalls(ctx, brickWalls, zoomLevel, CELL_SIZE, showBoundingBox) {
    const scaledCellSize = CELL_SIZE * zoomLevel;

    for (const wall of brickWalls) {
        if (wall.isAlive()) {
            wall.draw(ctx, scaledCellSize, zoomLevel, showBoundingBox, spriteImg);
        }
    }
}

export function drawSteelWalls(ctx, steelWalls, zoomLevel, CELL_SIZE, showBoundingBox) {
    const scaledCellSize = CELL_SIZE * zoomLevel;

    for (const steel of steelWalls) {
        if (steel.isAlive) {
            steel.draw(ctx, scaledCellSize, zoomLevel, showBoundingBox, spriteImg);
        }
    }
}

export function drawRivers(ctx, rivers, zoomLevel, CELL_SIZE, showBoundingBox) {
    const scaledCellSize = CELL_SIZE * zoomLevel;
    const now = new Date();
    const currentMillisecond = now.getMilliseconds();
    for (const river of rivers) {
        river.draw(ctx, scaledCellSize, zoomLevel, showBoundingBox, spriteImg, currentMillisecond);
    }
}

export function drawBushes(ctx, bushes, zoomLevel, CELL_SIZE) {
    const scaledCellSize = CELL_SIZE * zoomLevel;
    for (const bush of bushes) {
        bush.draw(ctx, scaledCellSize, zoomLevel, spriteImg);
    }
}

export function drawFuturePosition(ctx, zoomLevel, CELL_SIZE, TANK_SIZE, showPredictions, enemyFuturePosition, aiTargetEnemy, AI_PREDICTION_TIME) {
    if (!showPredictions || !enemyFuturePosition || !aiTargetEnemy || !aiTargetEnemy.isAlive) return;

    const scaledCellSize = CELL_SIZE * zoomLevel;
    const futureX = enemyFuturePosition.x * scaledCellSize;
    const futureY = enemyFuturePosition.y * scaledCellSize;
    const futureSize = TANK_SIZE * scaledCellSize;

    // Draw transparent green rectangle for future position
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(futureX, futureY, futureSize, futureSize);

    // Draw outline
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(futureX, futureY, futureSize, futureSize);
    ctx.setLineDash([]);

    // Draw line from current position to future position
    const currentX = aiTargetEnemy.x * scaledCellSize + futureSize / 2;
    const currentY = aiTargetEnemy.y * scaledCellSize + futureSize / 2;
    const futureCenterX = futureX + futureSize / 2;
    const futureCenterY = futureY + futureSize / 2;

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.lineTo(futureCenterX, futureCenterY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw prediction text
    ctx.fillStyle = '#00FF00';
    ctx.font = `${Math.max(10, 12 * zoomLevel)}px Arial`;
    ctx.fillText(`+${AI_PREDICTION_TIME}s`, futureX + futureSize + 5, futureY + futureSize / 2);

    ctx.restore();
}

export function drawPredictionLineOfSight(ctx, zoomLevel, CELL_SIZE, TANK_SIZE, showPredictions, enemyFuturePosition, AITank, predictionLineOfSight) {
    if (!showPredictions || !enemyFuturePosition || !predictionLineOfSight) return;

    const scaledCellSize = CELL_SIZE * zoomLevel;
    const playerCenterX = AITank.x * scaledCellSize + (TANK_SIZE * scaledCellSize) / 2;
    const playerCenterY = AITank.y * scaledCellSize + (TANK_SIZE * scaledCellSize) / 2;
    const futureCenterX = enemyFuturePosition.x * scaledCellSize + (TANK_SIZE * scaledCellSize) / 2;
    const futureCenterY = enemyFuturePosition.y * scaledCellSize + (TANK_SIZE * scaledCellSize) / 2;

    ctx.save();
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(playerCenterX, playerCenterY);
    ctx.lineTo(futureCenterX, futureCenterY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw prediction indicator at shooting point
    ctx.fillStyle = '#FF00FF';
    ctx.beginPath();
    ctx.arc(playerCenterX, playerCenterY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}


export function drawPerpendicularBulletWarnings(ctx, zoomLevel, CELL_SIZE, BULLET_SIZE, showPredictions, perpendicularBullets) {
    if (!showPredictions || perpendicularBullets.length === 0) return;

    const scaledCellSize = CELL_SIZE * zoomLevel;

    for (const bulletInfo of perpendicularBullets) {
        const bullet = bulletInfo.bullet;
        const bulletX = bullet.x * scaledCellSize;
        const bulletY = bullet.y * scaledCellSize;
        const bulletSize = BULLET_SIZE * scaledCellSize;

        // Draw warning circle around perpendicular bullets
        ctx.save();
        ctx.strokeStyle = '#FF5500';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(
            bulletX + bulletSize / 2,
            bulletY + bulletSize / 2,
            bulletSize * 3,
            0,
            Math.PI * 2
        );
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw direction indicator
        ctx.strokeStyle = '#FF5500';
        ctx.lineWidth = 3;
        ctx.beginPath();

        let startX = bulletX + bulletSize / 2;
        let startY = bulletY + bulletSize / 2;
        let endX = startX;
        let endY = startY;

        switch (bullet.direction) {
            case 0: endY -= bulletSize * 4; break;
            case 1: endX += bulletSize * 4; break;
            case 2: endY += bulletSize * 4; break;
            case 3: endX -= bulletSize * 4; break;
        }

        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw "PERPENDICULAR" text
        ctx.fillStyle = '#FF5500';
        ctx.font = `${Math.max(8, 10 * zoomLevel)}px Arial`;
        ctx.fillText("⟂", bulletX + bulletSize + 3, bulletY - 3);

        ctx.restore();
    }
}

export function drawTank(ctx, tank, zoomLevel, CELL_SIZE, TANK_SIZE, showBoundingBox, frameCount, frozeTime) {
    if (!tank.isAlive) return;

    const scaledCellSize = CELL_SIZE * zoomLevel;
    const scaledTankSize = TANK_SIZE * scaledCellSize;
    const tankX = tank.x * scaledCellSize;
    const tankY = tank.y * scaledCellSize;

    let directionOffset = getSpriteOffsetByDirection(tank.direction);

    let movementOffset = 0;
    if (tank.moving) {
        if (frameCount % 6 >= 3)
            movementOffset = 16;
    }
    if(frozeTime.time > 0 && tank.playerType != "human" && tank.playerType != "ai")
        movementOffset = 0;

    if (tank.playerType == "human" || tank.playerType == "ai") {
        if(tank.firingDirection != null)
            directionOffset = getSpriteOffsetByDirection(tank.firingDirection);
        const powerLevel = tank.powerLevel;
        const playerOffset = tank.playerType == "human" ? 0 : 128;
        ctx.drawImage(
            spriteImg,
            0 + directionOffset + movementOffset,
            0 + Math.min(powerLevel - 1, 3) * 16 + playerOffset,
            16,
            16-0.09,
            tankX + zoomLevel,
            tankY + zoomLevel,
            scaledTankSize,
            scaledTankSize
        );
        tank.firingDirection = null;
        if(tank.invulnerableTimer > 0){
            let invulnerableOffset = 0;
            if(frameCount%6 >=3)
                invulnerableOffset = 16;
            ctx.drawImage(
            spriteImg,
            256 + invulnerableOffset,
            144,
            16,
            16,
            tankX + zoomLevel,
            tankY + zoomLevel,
            scaledTankSize,
            scaledTankSize
        );
        }
    }

        

    if(tank.playerType == "enemy1" || tank.playerType == "enemy2" || tank.playerType == "enemy3"){
        let powerupOffset = 0;
        if(tank.hasPowerUp && frameCount%20 >= 10)
            powerupOffset= 128;
        let enemyNumber = parseInt(tank.playerType.replace(/\D/g, ''), 10);
        let minorSpriteOffset = 0
        if(tank.direction == 3)
            minorSpriteOffset = 1;
        ctx.drawImage(
            spriteImg,
            128 + directionOffset + movementOffset,
            64 + powerupOffset + (enemyNumber - 1) * 16 + minorSpriteOffset,
            16,
            16,
            tankX + zoomLevel,
            tankY + zoomLevel,
            scaledTankSize,
            scaledTankSize
        );
    }

    if(tank.playerType == "enemy4"){
        let srcX1 = 0, srcY1 = 240;
        let srcX2 = 0, srcY2 = 112;
        let srcX3 = 128, srcY3 = 112;

        let srcX = srcX3, srcY = srcY3;

        if(tank.hasPowerUp){
            if(frameCount%20 >= 10){
                srcX = 128;
                srcY = 240;
            }

        }else if(tank.health == 4){
            if (frameCount % 2 > 0){
                srcX = srcX1;
                srcY = srcY1;
            }
        }
        else if(tank.health == 3){
            if (frameCount % 3 > 0){
                srcX = srcX2;
                srcY = srcY2;
            }
        }else if(tank.health == 2){
            if (frameCount % 12 > 0){
                srcX = srcX2;
                srcY = srcY2;
            }
        }


        ctx.drawImage(
            spriteImg,
            srcX + directionOffset + movementOffset,
            srcY,
            16,
            16,
            tankX + zoomLevel,
            tankY + zoomLevel,
            scaledTankSize,
            scaledTankSize
        );
    }


    if (showBoundingBox) {
        // First strokeRect
        if (tank.playerType === "enemy") {
            ctx.strokeStyle = '#FF0000'; // Red for enemy
        } else if (tank.playerType === "ai") {
            ctx.strokeStyle = '#FFA500'; // Orange for AI
        } else if (tank.playerType === "human") {
            ctx.strokeStyle = '#FFA500'; // Orange for human (same as AI)
        }
        ctx.lineWidth = 2;
        ctx.strokeRect(tankX, tankY, scaledTankSize, scaledTankSize);

        const physicalX = tank.bx * scaledCellSize;
        const physicalY = tank.by * scaledCellSize;

        // Second strokeRect with dashed line
        if (tank.playerType === "enemy") {
            ctx.strokeStyle = '#AA0000'; // Darker red for enemy
        } else if (tank.playerType === "ai") {
            ctx.strokeStyle = '#CC8400'; // Darker orange for AI
        } else if (tank.playerType === "human") {
            ctx.strokeStyle = '#CC8400'; // Darker orange for human (same as AI)
        }
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(physicalX, physicalY, scaledTankSize, scaledTankSize);
        ctx.setLineDash([]);

        // Center dot (keeping it white as in your original code)
        ctx.fillStyle = '#FFFFFF';
        const centerX = tankX + scaledTankSize / 2;
        const centerY = tankY + scaledTankSize / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function getSpriteOffsetByDirection(direction) {
    
    switch (direction) {
        case 0: return 0;    // Up
        case 3: return 32;   // Left
        case 2: return 64;   // Down
        case 1: return 96;   // Right
        default: return 0;   // Default to up
    }
}


export function drawBullets(ctx, bullets, zoomLevel, CELL_SIZE, BULLET_SIZE, showBoundingBox) {
    showBoundingBox = false;
    const scaledCellSize = CELL_SIZE * zoomLevel;
    const scaledBulletSize = BULLET_SIZE * scaledCellSize;

    // Base coordinates in sprite sheet (first bullet - up facing)
    const baseSpriteX = 304;
    const baseSpriteY = 48;
    const spriteWidth = 16;  // Assuming 16x16 bullet sprite
    const spriteHeight = 16;

    // Offset in game units (1 unit = 1 pixel offset in sprite positioning)
    const gameToSpriteOffset = BULLET_SIZE - 1;

    for (let bullet of bullets) {
        // Calculate adjusted position for 2x2 bullet centered in its cell
        const adjustedX = bullet.x + gameToSpriteOffset;
        const adjustedY = bullet.y + gameToSpriteOffset;

        // Convert to canvas coordinates and round to nearest pixel
        const bulletX = Math.round(adjustedX * scaledCellSize);
        const bulletY = Math.round(adjustedY * scaledCellSize);

        // Determine sprite position based on direction
        let spriteX = baseSpriteX;
        const spriteY = baseSpriteY;

        switch (bullet.direction) {
            case 0: // Up
                spriteX = baseSpriteX;
                break;
            case 1: // Right
                spriteX = baseSpriteX + 16;
                break;
            case 2: // Down
                spriteX = baseSpriteX + 32;
                break;
            case 3: // Left
                spriteX = baseSpriteX + 48;
                break;
            default:
                spriteX = baseSpriteX; // Default to up
        }

        // Draw bullet sprite
        ctx.drawImage(
            spriteImg,
            spriteX,           // Source X in sprite sheet
            spriteY + 1,           // Source Y in sprite sheet
            spriteWidth,       // Source width
            spriteHeight,      // Source height
            bulletX,           // Destination X (rounded for pixel-perfect)
            bulletY,           // Destination Y (rounded for pixel-perfect)
            16 * zoomLevel,  // Destination width
            16 * zoomLevel   // Destination height
        );

        // Draw bounding box if enabled
        if (showBoundingBox) {
            // Calculate bounding box position (original bullet position)
            const bboxX = Math.round(bullet.x * scaledCellSize);
            const bboxY = Math.round(bullet.y * scaledCellSize);

            ctx.strokeStyle = bullet.isAITank ? '#FFFF00' : '#FF8888';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(bboxX, bboxY, scaledBulletSize, scaledBulletSize);
            ctx.setLineDash([]);
        }

    }
}


export function drawBase(ctx, base, zoomLevel, CELL_SIZE) {
    const scaledCellSize = CELL_SIZE * zoomLevel;
    const baseX = base.x * scaledCellSize;
    const baseY = base.y * scaledCellSize;
    const baseWidth = base.width * scaledCellSize;
    const baseHeight = base.height * scaledCellSize;

    // Sprite source coordinates
    const srcX = base.isAlive ? 304 : 320;
    const srcY = 32;
    const srcW = 16;
    const srcH = 16;

    // Draw sprite scaled to base size
    ctx.drawImage(
        spriteImg,
        srcX,
        srcY,
        srcW,
        srcH,
        baseX,
        baseY,
        baseWidth,
        baseHeight
    );
}


export function drawLoadingScreen(message = "Loading...", progress = 0, ctx, gameState, canvas) {
    // Only draw if we're in loading state
    if (gameState !== 'loading') return;
    
    ctx.save();
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw loading message
    ctx.fillStyle = '#FFF';
    ctx.font = `20px Arial`;
    ctx.fillText(message, canvas.width / 2-60, canvas.height / 2);
    
    // Draw progress bar background
    const barWidth = canvas.width * 0.6;
    const barHeight = 20;
    const barX = (canvas.width - barWidth) / 2;
    const barY = canvas.height / 2 + 40;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Draw progress bar fill
    ctx.fillStyle = '#00FF00';
    const fillWidth = (barWidth * progress) / 100;
    ctx.fillRect(barX, barY, fillWidth, barHeight);
    
    // Draw progress percentage
    ctx.fillStyle = '#FFF';
    ctx.font = `16px Arial`;
    ctx.fillText(`${progress}%`, canvas.width / 2, barY + barHeight + 20);
    
    // Draw loading tips
    ctx.fillStyle = '#888';
    ctx.font = `14px Arial`;
    ctx.fillText('Please wait while assets are loading...', canvas.width / 2, canvas.height - 50);
    
    ctx.restore();
}


