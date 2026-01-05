export class River {
    constructor(x, y) {
        this.x = x; // Grid X position
        this.y = y; // Grid Y position
        this.width = 1;
        this.height = 1;
        this.isAlive = true; // Rivers are always present (indestructible)
    }

    // Rivers cannot be destroyed - bullets pass through
    damageFromBullet() {
        return 0; // No damage applied
    }

    // Draw the river with flowing water effect
    draw(ctx, scaledCellSize, zoomLevel, showBoundingBox, spriteImg, currentSecond) {
        const wallX = Math.round(this.x * scaledCellSize);
        const wallY = Math.round(this.y * scaledCellSize);
        const wallSize = Math.round(scaledCellSize);

        if (currentSecond % 1000 <=500) {


            // Draw steel wall sprite
            ctx.drawImage(
                spriteImg,
                256, 48, 8, 8,
                wallX, wallY, wallSize, wallSize
            );
        }else{
             ctx.drawImage(
                spriteImg,
                272, 48, 8, 8,
                wallX, wallY, wallSize, wallSize
            );
        }


        // Optional bounding box for debugging
        if (showBoundingBox) {
            ctx.strokeStyle = '#00FFFF'; // Cyan for water debugging
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(wallX, wallY, scaledCellSize, scaledCellSize);
            ctx.setLineDash([]);
        }
    }
}