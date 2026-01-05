export class Bush {
    constructor(x, y) {
        this.x = x; // Grid X position
        this.y = y; // Grid Y position
        this.width = 1;
        this.height = 1;
        this.isAlive = true; // Bushes are indestructible
        this.isPassable = true; // Tanks can move through bushes (optional)
        this.providesCover = true; // Hides tanks/bullets in classic Battle City
    }

    // Bushes cannot be destroyed - bullets pass through
    damageFromBullet() {
        return 0; // No damage applied
    }



    draw(ctx, scaledCellSize, zoomLevel, spriteImg) {
        const wallX = Math.round(this.x * scaledCellSize);
        const wallY = Math.round(this.y * scaledCellSize);
        const wallSize = Math.round(scaledCellSize);

        // Draw steel wall sprite
        ctx.drawImage(
            spriteImg,
            272, 32, 8, 8,
            wallX, wallY, wallSize, wallSize
        );
    }
}