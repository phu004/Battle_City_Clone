const imgSrc = `sprites/sprite1.png?v=${Date.now()}`;
const spriteImg = new Image();

// Define explosion sprite frames in order
const EXPLOSION_FRAMES = [
    { x: 256, y: 128, width: 16, height: 16 },    // Frame 1
    { x: 272, y: 128, width: 16, height: 16 },    // Frame 2
    { x: 288, y: 128, width: 16, height: 16 }     // Frame 3
];

const BIG_EXPLOSION_FRAMES = [
    { x: 256, y: 128, width: 16, height: 16 },    // Frame 1
    { x: 272, y: 128, width: 16, height: 16 },    // Frame 2
    { x: 288, y: 128, width: 16, height: 16 },     // Frame 3
    { x: 304, y: 128, width: 32, height: 32 },     // Frame 4
    { x: 336, y: 128, width: 32, height: 32 },
    { x: 288, y: 128, width: 16, height: 16 }
];

const SPAWN_FRAMES = [
    { x: 256 + 48, y: 96, width: 16, height: 16 },
    { x: 256 + 32, y: 96, width: 16, height: 16 },
    { x: 256 + 16, y: 96, width: 16, height: 16 },
    { x: 256, y: 96, width: 16, height: 16 },
    { x: 256 + 16, y: 96, width: 16, height: 16 },
    { x: 256 + 32, y: 96, width: 16, height: 16 },
    { x: 256 + 48, y: 96, width: 16, height: 16 },
    { x: 256 + 32, y: 96, width: 16, height: 16 },
    { x: 256 + 16, y: 96, width: 16, height: 16 },
    { x: 256, y: 96, width: 16, height: 16 },
    { x: 256 + 16, y: 96, width: 16, height: 16 },
    { x: 256 + 32, y: 96, width: 16, height: 16 },
    { x: 256 + 48, y: 96, width: 16, height: 16 }
];



export async function loadParticleSprites() {
    spriteImg.src = imgSrc;

    // Wait until the image is loaded
    await new Promise((resolve, reject) => {
        spriteImg.onload = resolve;
        spriteImg.onerror = reject;
    });
}

export function createSpawnAnimation(x, y, particleEffects) {
    const lifetime = 13 * 4;
    particleEffects.push({
        x: x + 1,
        y: y + 1,
        lifetime: lifetime,
        maxLifetime: lifetime,
        frameIndex: 0,
        frameTimer: 0,
        frames: SPAWN_FRAMES,
        frameDelay: Math.floor(lifetime / SPAWN_FRAMES.length),
    });
}

export function createBulletExplosion(x, y, BULLET_SIZE, CELL_SIZE, particleEffects) {
    const lifetime = 12;

    particleEffects.push({
        x: x + BULLET_SIZE / 2,
        y: y + BULLET_SIZE / 2,
        lifetime: lifetime,
        maxLifetime: lifetime,
        // Animation properties
        frameIndex: 0,
        frameTimer: 0,
        frames: EXPLOSION_FRAMES,
        frameDelay: Math.floor(lifetime / EXPLOSION_FRAMES.length),
    });
}

export function createBigExplosion(entity, particleEffects) {
    let x = entity.x;
    let y = entity.y;
    let lifetime = (13 + 3) * 4;
    let explosionFrame = [...BIG_EXPLOSION_FRAMES];
    if (entity.playerType == "enemy1") {
        explosionFrame.push(
            ...Array(3).fill({ x: 288, y: 160, width: 16, height: 16 })
        );
    }else if (entity.playerType == "enemy2") {
        explosionFrame.push(
            ...Array(3).fill({ x: 304, y: 160, width: 16, height: 16 })
        );
    }else if (entity.playerType == "enemy3") {
        explosionFrame.push(
            ...Array(3).fill({ x: 320, y: 160, width: 16, height: 16 })
        );
    }else if (entity.playerType == "enemy4") {
        explosionFrame.push(
            ...Array(3).fill({ x: 336, y: 160, width: 16, height: 16 })
        );
    }else{
        lifetime = 13 * 4;
    }

    particleEffects.push({
        x: x + 1,
        y: y + 1,
        lifetime: lifetime,
        maxLifetime: lifetime,
        // Animation properties
        frameIndex: 0,
        frameTimer: 0,
        frames: explosionFrame,
        frameDelay: Math.floor(lifetime / explosionFrame.length),
    });
}


export function updateParticleEffects(particleEffects) {
    for (let i = particleEffects.length - 1; i >= 0; i--) {
        const particle = particleEffects[i];

        // Decrease lifetime
        particle.lifetime--;

        // Update animation frame
        let length = particle.frames.length;
        particle.frameTimer++;
        if (particle.frameTimer >= particle.frameDelay && particle.frameIndex < length - 1) {
            particle.frameTimer = 0;
            particle.frameIndex++;
            // Stop at last frame
            if (particle.frameIndex >= length) {
                particle.frameIndex = length - 1;
            }
        }

        // Remove when lifetime ends
        if (particle.lifetime <= 0) {
            particleEffects.splice(i, 1);
        }
    }
}

export function drawParticleEffects(CELL_SIZE, zoomLevel, ctx, particleEffects) {

    for (const particle of particleEffects) {

        // Get the current frame based on frameIndex
        const frame = particle.frames[particle.frameIndex];

        let size = frame.width / 8;

        let scaledCellSize = 8 * zoomLevel * size;
        const particleX = (particle.x - size / 2) * 8 * zoomLevel;
        const particleY = (particle.y - size / 2) * 8 * zoomLevel;

        // Draw the current frame centered at explosion position
        ctx.drawImage(
            spriteImg,
            frame.x, frame.y, frame.width, frame.height,
            particleX, particleY,
            scaledCellSize, scaledCellSize
        );

    }
}