// ========== STEEL WALL STRUCTURE ==========
export class SteelWall {
    constructor(x, y) {
        this.x = x; // Grid X position
        this.y = y; // Grid Y position
        this.width = 1;
        this.height = 1;
        this.isAlive = true; // Steel walls are always alive (indestructible)
    }

    // Steel walls cannot be destroyed
    damageFromBullet() {
        return 0; // No damage applied
    }

    // Draw the steel wall
    draw(ctx, scaledCellSize, zoomLevel, showBoundingBox, spriteImg) {
        const wallX = Math.round(this.x * scaledCellSize);
        const wallY = Math.round(this.y * scaledCellSize);
        const wallSize = Math.round(scaledCellSize);

        // Draw steel wall sprite
        ctx.drawImage(
            spriteImg,
            256, 16, 8, 8,
            wallX, wallY, wallSize, wallSize
        );

        // Bounding box (scales with zoom)
        if (showBoundingBox) {
            ctx.strokeStyle = '#8888FF';
            ctx.lineWidth = Math.max(1, zoomLevel);
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(wallX, wallY, wallSize, wallSize);
            ctx.setLineDash([]);
        }
    }
}