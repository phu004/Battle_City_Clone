import { createPowerUpScore, createBigExplosion } from './particles.js';
import { BrickWall } from './BrickWall.js';
import { SteelWall } from './SteelWall.js';


export class PowerUp {


    constructor() {
        this.imgSrc = `sprites/sprite1.png?v=${Date.now()}`;
        this.spriteImg = new Image();
        this.spriteImg.src = this.imgSrc;

        this.x = 0;
        this.y = 0;
        this.width = 2;
        this.height = 2;
        this.isAlive = false; // Not spawned initially
        this.shovelTimer = null;

        this.sound = null;

        // Define power-up types with their rarity and sprite positions
        this.powerUpTypes = {
            // Common power-ups
            'helmet': {
                name: 'helmet',
                rarity: 1
            },
            'clock': {
                name: 'clock',
                rarity: 1
            },
            'shovel': {
                name: 'shovel',
                rarity: 1
            },
            'star': {
                name: 'star',
                rarity: 1
            },
            'bomb': {
                name: 'bomb',
                rarity: 1
            },

            // Rare power-ups
            'extraLife': {
                name: 'extraLife',
                rarity: 0.5
            },
            'gun': {
                name: 'gun',
                rarity: 0.25
            }
        };

        this.type = null;
        this.spriteX = 256;

        // Animation properties
        this.animationFrame = 0;
        this.animationSpeed = 0.1;
        this.pulseScale = 1;
        this.pulseDirection = 1;
        this.pulseSpeed = 0.02;
    }

    setSound(sound){
        this.sound = sound;
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
        this.animationFrame = 0;
        this.pulseScale = 1;

        return true;
    }

    // Remove the power-up (called when collected or new one spawns)
    remove() {
        this.isAlive = false;
        this.type = null;
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

    draw(ctx, scaledCellSize, frameCount, zoomLevel) {
        if (!this.isAlive) return;

        if (frameCount % 20 >= 10)
            return;

        const drawX = Math.round(this.x * scaledCellSize);
        const drawY = Math.round(this.y * scaledCellSize) + zoomLevel;
        const drawSize = Math.round(scaledCellSize * 2);


        const keys = Object.keys(this.powerUpTypes);
        const index = keys.indexOf(this.type);


        // Draw power-up sprite
        ctx.save();
        ctx.globalAlpha = 0.85;

        ctx.drawImage(
            this.spriteImg,
            this.spriteX + index * 16, 112,
            16, 16,
            drawX, drawY,
            drawSize, drawSize
        );

        ctx.restore();

    }

    // Called when tank collects the power-up
    consumed(tank, particleEffects, enemyTanks, frozeTime, brickWalls, steelWalls) {
        if (!this.isAlive) return null;

        tank.score+=500;

        if (this.type == "helmet")
            tank.invulnerableTimer = 1000 + Math.random() * 500;
        if (this.type == "star")
            if (tank.powerLevel < 4)
                tank.powerLevel++;
        if (this.type == "gun")
            tank.powerLevel = 5;
        if (this.type == "extraLife"){
            this.sound[8].currentTime = 0;
            this.sound[8].play();
            tank.lives++;
        }else{
            this.sound[7].currentTime = 0;
            this.sound[7].play();
        }
        if (this.type == "bomb") {
            let enemyDestoried = false;
            for (let i = 0; i < enemyTanks.length; i++) {
                enemyTanks[i].isAlive = false;
                enemyDestoried = true;
                createBigExplosion({ x: enemyTanks[i].x, y: enemyTanks[i].y }, particleEffects)
            }
            if(enemyDestoried){
                this.sound[3].currentTime = 0;
                this.sound[3].play();
            }
        }
        if (this.type == "clock")
            frozeTime.time = 1000 + Math.random() * 500;
        if (this.type == "shovel") {
            let coordinates = [[11, 23], [11, 24], [11, 25], [12, 23], [13, 23], [14, 23], [14, 24], [14, 25]]; // Add more coordinates as needed

            for (let coord of coordinates) {
                let [x, y] = coord; // Destructure the coordinate
                for (let i = 0; i < brickWalls.length; i++) {
                    if (brickWalls[i].x == x && brickWalls[i].y == y) {
                        brickWalls[i].bits = [false, false, false, false];
                        break;
                    }
                }
                let steelWallFound = false;
                for (let i = 0; i < steelWalls.length; i++) {
                    if (steelWalls[i].x == x && steelWalls[i].y == y) {
                        steelWalls[i].isAlive = true;
                        steelWallFound = true;
                        break;
                    }
                }
                if (!steelWallFound)
                    steelWalls.push(new SteelWall(x, y));
            }
            this.clearShovelTimer();
            this.shovelTimer = setTimeout(() => {
                // Step 1: Initial fortification (at 25 seconds)
                for (let coord of coordinates) {
                    let [x, y] = coord;

                    // Remove steel walls
                    for (let i = 0; i < steelWalls.length; i++) {
                        if (steelWalls[i].x == x && steelWalls[i].y == y) {
                            steelWalls[i].isAlive = false;
                            break;
                        }
                    }

                    // Fortify brick walls
                    for (let i = 0; i < brickWalls.length; i++) {
                        if (brickWalls[i].x == x && brickWalls[i].y == y) {
                            brickWalls[i].bits = [true, true, true, true];
                            break;
                        }
                    }
                }

                // Step 2: Start alternating at 26 seconds (1 second later)
                let cycles = 0;
                let isSteelPhase = false; // Start with brick (since we just fortified)

                this.shovelTimer = setInterval(() => {
                    isSteelPhase = !isSteelPhase; // Toggle phase

                    for (let coord of coordinates) {
                        let [x, y] = coord;

                        if (isSteelPhase) {
                            // Phase 1: Show steel (hide brick)
                            // Restore steel walls
                            for (let i = 0; i < steelWalls.length; i++) {
                                if (steelWalls[i].x == x && steelWalls[i].y == y) {
                                    steelWalls[i].isAlive = true;
                                    break;
                                }
                            }

                            // Hide brick walls (set all bits to false)
                            for (let i = 0; i < brickWalls.length; i++) {
                                if (brickWalls[i].x == x && brickWalls[i].y == y) {
                                    brickWalls[i].bits = [false, false, false, false];
                                    break;
                                }
                            }
                        } else {
                            // Phase 2: Show brick (hide steel)
                            // Hide steel walls
                            for (let i = 0; i < steelWalls.length; i++) {
                                if (steelWalls[i].x == x && steelWalls[i].y == y) {
                                    steelWalls[i].isAlive = false;
                                    break;
                                }
                            }

                            // Restore brick walls
                            for (let i = 0; i < brickWalls.length; i++) {
                                if (brickWalls[i].x == x && brickWalls[i].y == y) {
                                    brickWalls[i].bits = [true, true, true, true];
                                    break;
                                }
                            }
                        }
                    }

                    cycles++;

                    // After 3 full alternations (6 phases), end with brick fortification
                    if (cycles >= 6) {
                        clearInterval(this.shovelTimer);
                        this.shovelTimer = null;

                        // Final state: Steel removed, bricks fortified
                        for (let coord of coordinates) {
                            let [x, y] = coord;

                            // Ensure steel is dead
                            for (let i = 0; i < steelWalls.length; i++) {
                                if (steelWalls[i].x == x && steelWalls[i].y == y) {
                                    steelWalls[i].isAlive = false;
                                    break;
                                }
                            }

                            // Ensure bricks are fortified
                            for (let i = 0; i < brickWalls.length; i++) {
                                if (brickWalls[i].x == x && brickWalls[i].y == y) {
                                    brickWalls[i].bits = [true, true, true, true];
                                    break;
                                }
                            }
                        }
                    }
                }, 500); // Alternate every 1 second

            }, 20000); // Initial delay: 20 seconds
        }

        createPowerUpScore(this, particleEffects);

        // Despawn the power-up
        this.remove();
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

    clearShovelTimer() {
        if (this.shovelTimer) {
            clearTimeout(this.shovelTimer);
            this.shovelTimer = null;
        }
    }

    isActive() {
        return this.isAlive;
    }

    getPosition() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }
}