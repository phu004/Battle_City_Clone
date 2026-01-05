// ========== BRICK WALL STRUCTURE ==========
export class BrickWall {
    constructor(x, y) {
        this.x = x; // Grid X position
        this.y = y; // Grid Y position

        // Each brick has 4 bits (quadrants):
        // 0: Top-left, 1: Top-right, 2: Bottom-left, 3: Bottom-right
        // true = exists, false = destroyed
        this.bits = [true, true, true, true];

        // For collision detection - always full size regardless of damage
        this.width = 1;
        this.height = 1;

        // Visual state
        this.color = '#8B4513'; // Brown
        this.darkColor = '#5D2906'; // Dark brown
        this.lightColor = '#B5651D'; // Light brown
        this.destroyedColor = '#333333'; // Dark gray for destroyed bits
    }

    // Check if brick still exists (any bits alive)
    isAlive() {
        return this.bits.some(bit => bit);
    }

    // Get which bits are affected by a hit from a specific SIDE (not direction)
    getAffectedBitsBySide(hitSide) {
        switch (hitSide) {
            case 'top': return [0, 1];    // Top bits
            case 'right': return [1, 3];    // Right bits  
            case 'bottom': return [2, 3];    // Bottom bits
            case 'left': return [0, 2];    // Left bits
            default: return [];
        }
    }

    // Check if brick is completely destroyed
    isCompletelyDestroyed() {
        return !this.bits.some(bit => bit);
    }

    // Get number of remaining bits
    getRemainingBits() {
        return this.bits.filter(bit => bit).length;
    }

    // Draw the brick with appropriate damage
    draw(ctx, scaledCellSize, zoomLevel, showBoundingBox, spriteImg) {
        const brickX = this.x * scaledCellSize;
        const brickY = this.y * scaledCellSize;
        const brickSize = scaledCellSize;
        const halfSize = brickSize / 2;

        // Draw individual bits based on their state
        for (let i = 0; i < 4; i++) {
            if (this.bits[i]) {
                // Calculate bit position
                let bitX, bitY;
                let spriteX, spriteY
                switch (i) {
                    case 0: // Top-left
                        bitX = brickX;
                        bitY = brickY;
                        spriteX = 0;
                        spriteY = 0;
                        break;
                    case 1: // Top-right
                        bitX = brickX + halfSize;
                        bitY = brickY;
                        spriteX = 4;
                        spriteY = 0;
                        break;
                    case 2: // Bottom-left
                        bitX = brickX;
                        bitY = brickY + halfSize;
                        spriteX = 0;
                        spriteY = 4;
                        break;
                    case 3: // Bottom-right
                        bitX = brickX + halfSize;
                        bitY = brickY + halfSize;
                        spriteX = 4;
                        spriteY = 4;
                        break;
                }
                
                ctx.drawImage(
                    spriteImg,
                    280+spriteX, spriteY, 4, 4,
                    bitX, bitY, halfSize, halfSize
                );

               

            } 
        }

   
        // Show bounding box if enabled
        if (showBoundingBox) {
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(brickX, brickY, brickSize, brickSize);
            ctx.setLineDash([]);

            // Show bit numbers for debugging
            if (zoomLevel > 1) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `${Math.max(8, 10 * zoomLevel)}px Arial`;
                ctx.fillText(this.getRemainingBits().toString(), brickX + 2, brickY + brickSize - 2);
            }
        }
    }
}