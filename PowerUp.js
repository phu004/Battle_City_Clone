export class PowerUp {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 2;
        this.height = 2;
        this.isAlive = false; // Not spawned initially
        
        // Define power-up types with their rarity and sprite positions
        this.powerUpTypes = {
            // Common power-ups
            'helmet': { 
                name: 'helmet', 
                spriteY: 122, 
                rarity: 1
            },
            'clock': { 
                name: 'clock', 
                spriteY: 138, 
                rarity: 1
            },
            'shovel': { 
                name: 'shovel', 
                spriteY: 154, 
                rarity: 1
            },
            'star': { 
                name: 'star', 
                spriteY: 170, 
                rarity: 1
            },
            'bomb': { 
                name: 'bomb', 
                spriteY: 186, 
                rarity: 1
            },
            
            // Rare power-ups
            'extraLife': { 
                name: 'extraLife', 
                spriteY: 202, 
                rarity: 0.3
            },
            'gun': { 
                name: 'gun', 
                spriteY: 218, 
                rarity: 0.3
            }
        };
        
        this.type = null;
        this.spriteX = 256;
        this.spriteY = 0;
        
        // Animation properties
        this.animationFrame = 0;
        this.animationSpeed = 0.1;
        this.pulseScale = 1;
        this.pulseDirection = 1;
        this.pulseSpeed = 0.02;
    }
    
    // Spawn the power-up at a random position
    spawn() {
        return this.spawnAtPosition(
            Math.floor(Math.random() * (22 - 2 + 1)) + 2, // X: 2-22
            Math.floor(Math.random() * (20 - 4 + 1)) + 4  // Y: 4-20
        );
    }
    
    // Spawn at specific position
    spawnAtPosition(x, y) {
        this.x = x;
        this.y = y;
        this.isAlive = true;
        this.type = this.selectRandomPowerUp();
        this.spriteY = this.powerUpTypes[this.type].spriteY;
        this.animationFrame = 0;
        this.pulseScale = 1;
        
        console.log(`PowerUp spawned at (${this.x}, ${this.y}) - Type: ${this.type}`);
        return true;
    }
    
    // Remove the power-up (called when collected or new one spawns)
    remove() {
        this.isAlive = false;
        this.type = null;
        console.log(`PowerUp removed from (${this.x}, ${this.y})`);
    }
    
    // For spawning a new power-up when one already exists
    spawnNew() {
        this.remove(); // Remove existing power-up first
        return this.spawn(); // Spawn new one
    }
    
    selectRandomPowerUp() {
        const weightedTypes = [];
        
        for (const [type, data] of Object.entries(this.powerUpTypes)) {
            const weight = Math.ceil(data.rarity * 10);
            for (let i = 0; i < weight; i++) {
                weightedTypes.push(type);
            }
        }
        
        const randomIndex = Math.floor(Math.random() * weightedTypes.length);
        return weightedTypes[randomIndex];
    }
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
        // Update animation
        this.animationFrame += this.animationSpeed * deltaTime;
        
        // Update pulsing effect
        this.pulseScale += this.pulseSpeed * this.pulseDirection;
        if (this.pulseScale > 1.2 || this.pulseScale < 0.8) {
            this.pulseDirection *= -1;
        }
    }
    
    draw(ctx, scaledCellSize, spriteImg) {
        if (!this.isAlive) return;
        
        const drawX = Math.round(this.x * scaledCellSize);
        const drawY = Math.round(this.y * scaledCellSize);
        const drawSize = Math.round(scaledCellSize * 2);
        
        ctx.save();
        
        // Apply pulsing effect
        const centerX = drawX + drawSize / 2;
        const centerY = drawY + drawSize / 2;
        ctx.translate(centerX, centerY);
        ctx.scale(this.pulseScale, this.pulseScale);
        ctx.translate(-centerX, -centerY);
        
        // Simple 2-frame animation
        const frameOffset = Math.floor(this.animationFrame) % 2 * 16;
        
        // Draw power-up sprite
        ctx.drawImage(
            spriteImg,
            this.spriteX + frameOffset, this.spriteY,
            16, 16,
            drawX, drawY,
            drawSize, drawSize
        );
        
        ctx.restore();
    }
    
    // Simple method to get power-up data when collected
    // Collision detection will be handled in main game loop
    getPowerUpData() {
        if (!this.isAlive) return null;
        
        return {
            type: this.type,
            name: this.powerUpTypes[this.type].name,
            spriteY: this.spriteY,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    
    // Called when tank collects the power-up
    consumed(tank) {
        if (!this.isAlive) return null;
        
        const powerUpData = this.getPowerUpData();
        
        // Despawn the power-up
        this.remove();
        
        console.log(`Power-up ${this.type} collected by tank`);
        
        // Return data for external handling
        // Effects will be implemented in main game logic
        return powerUpData;
    }
    
    // Optional: Check if position is valid for spawning (not overlapping with walls)
    isPositionValid(levelMap) {
        // Check all 4 cells of the 2x2 power-up
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const cellX = this.x + dx;
                const cellY = this.y + dy;
                
                // Check if cell is walkable (0 = empty in typical Battle City)
                if (levelMap && levelMap[cellY] && levelMap[cellY][cellX] !== 0) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // Spawn with position validation
    spawnWithValidation(levelMap, maxAttempts = 20) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = Math.floor(Math.random() * (22 - 2 + 1)) + 2;
            const y = Math.floor(Math.random() * (20 - 4 + 1)) + 4;
            
            // Temporarily set position for validation
            const tempX = this.x;
            const tempY = this.y;
            this.x = x;
            this.y = y;
            
            if (this.isPositionValid(levelMap)) {
                // Restore original position before spawning
                this.x = tempX;
                this.y = tempY;
                return this.spawnAtPosition(x, y);
            }
            
            // Restore original position
            this.x = tempX;
            this.y = tempY;
        }
        
        // If no valid position found after max attempts, spawn anyway
        console.warn("Could not find valid position for power-up after", maxAttempts, "attempts");
        return this.spawn();
    }
}