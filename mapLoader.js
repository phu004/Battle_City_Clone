import { BrickWall } from './BrickWall.js';
import { SteelWall } from './SteelWall.js';
import { River } from './River.js';
import { Bush } from './Bush.js';

const levelInfo = {};
const imgs = {};

export async function loadAllLevelImages() {
    
    for (let levelNum = 1; levelNum <= 30; levelNum++) {
        const imgSrc = `levels/${levelNum}.png`;
        const img = new Image();
        
        // Simple promise to wait for each image
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Just continue even if it fails
            img.src = imgSrc;
        });
        
        imgs[levelNum] = img;
        console.log(`Loaded level ${levelNum} image`);
    }
}




// Level generation parameters
const TOTAL_LEVELS = 30;
const START_FIRE_RATE = 120;  // Starts slow
const END_FIRE_RATE = 10;     // Ends fast (plus 50 base = 60 total)
const START_SPAWN_RATE = 150; // Starts slow
const END_SPAWN_RATE = 52;    // Minimum spawn rate
const START_ENEMIES = 20;     // Starts easy
const END_ENEMIES = 60;       // Ends challenging
const START_MAX_CONCURRENT = 4;  // Max enemies at once at level 1
const END_MAX_CONCURRENT = 16;    // Max enemies at once at level 30

// Generate all 30 levels
for (let level = 1; level <= TOTAL_LEVELS; level++) {
    // Calculate progression (0 to 1)
    const progression = (level - 1) / (TOTAL_LEVELS - 1);

    // Linear interpolation for values
    const fireRate = Math.round(START_FIRE_RATE + (END_FIRE_RATE - START_FIRE_RATE) * progression);
    const spawnRate = Math.round(START_SPAWN_RATE + (END_SPAWN_RATE - START_SPAWN_RATE) * progression);
    const enemyCount = Math.round(START_ENEMIES + (END_ENEMIES - START_ENEMIES) * progression);
    const maxConcurrent = Math.round(START_MAX_CONCURRENT + (END_MAX_CONCURRENT - START_MAX_CONCURRENT) * progression);

    // Tank probabilities change based on level
    let tankProbabilities;

    if (level <= 5) {
        // Levels 1-5: Mostly type 1 and 2, very little type 3 and 4
        const type1 = 0.8 - (level * 0.06);      // Decreases from 0.7 to 0.4
        const type2 = 0.2 + (level * 0.01);     // Increases from 0.25 to 0.30
        const type3 = 0.1 + (level * 0.005);   // Increases from 0.025 to 0.05
        const type4 = 0.05 + (level * 0.005);   // Increases from 0.025 to 0.05
        tankProbabilities = [type1, type2, type3, type4];
    } else if (level <= 10) {
        // Levels 6-10: Start introducing more type 3 and 4
        const type1 = 0.4 - ((level - 5) * 0.04);  // Decreases from 0.4 to 0.2
        const type2 = 0.3 - ((level - 5) * 0.02);  // Decreases from 0.3 to 0.2
        const type3 = 0.15 + ((level - 5) * 0.05); // Increases from 0.05 to 0.3
        const type4 = 0.1 + ((level - 5) * 0.05); // Increases from 0.05 to 0.3
        tankProbabilities = [type1, type2, type3, type4];
    } else if (level <= 15) {
        // Levels 11-15: More balanced mix, type 1 still present
        const type1 = 0.2 - ((level - 10) * 0.02);   // Decreases from 0.2 to 0.1
        const type2 = 0.2 - ((level - 10) * 0.01);   // Decreases from 0.2 to 0.15
        const type3 = 0.3 + ((level - 10) * 0.03);   // Increases from 0.3 to 0.45
        const type4 = 0.3 + ((level - 10) * 0.02);   // Increases from 0.3 to 0.4
        tankProbabilities = [type1, type2, type3, type4];
    } else if (level <= 20) {
        // Levels 16-20: Type 1 still present but reduced
        const type1 = 0.2 - ((level - 15) * 0.008);  // Decreases from 0.1 to 0.06
        const type2 = 0.25 - ((level - 15) * 0.006); // Decreases from 0.15 to 0.12
        const type3 = 0.35 - ((level - 15) * 0.01);  // Decreases from 0.45 to 0.4
        const type4 = 0.4 + ((level - 15) * 0.024);  // Increases from 0.4 to 0.52
        tankProbabilities = [type1, type2, type3, type4];
    } else {
        // Levels 21-30: All types present, type 1 never eliminated
        const type1 = 0.2 - ((level - 15) * 0.008);  // Decreases from 0.1 to 0.06
        const type2 = 0.25 - ((level - 15) * 0.006); // Decreases from 0.15 to 0.12
        const type3 = 0.35 - ((level - 20) * 0.015);   // Decreases from 0.4 to 0.25
        const type4 = 0.45 + ((level - 20) * 0.021);  // Increases from 0.52 to 0.73

        // Normalize to ensure sum = 1
        const sum = type1 + type2 + type3 + type4;
        tankProbabilities = [
            type1 / sum,
            type2 / sum,
            type3 / sum,
            type4 / sum
        ];
    }

    levelInfo[level] = {
        level: level,
        enemyFireRate: fireRate,
        enemySpawnRate: spawnRate,
        enemyCount: enemyCount,
        maxConcurrent: maxConcurrent,  // Added parameter
        tankProbabilities: tankProbabilities
    };
}



export function initializeMap(levelNum, brickWalls, steelWalls, rivers, bushes, level) {
    if (levelNum > 30)
        level.levelParameter = levelInfo[30];
    else
        level.levelParameter = levelInfo[levelNum];

    levelNum = levelNum % 30;
    if(levelNum == 0)
        levelNum = 30;
    brickWalls.length = 0;
    steelWalls.length = 0;
    rivers.length = 0;
    bushes.length = 0;

    let img = imgs[levelNum]

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const tileWidth = img.width / 26;
    const tileHeight = img.height / 26;

    for (let ty = 0; ty < 26; ty++) {
        for (let tx = 0; tx < 26; tx++) {
            const imageData = ctx.getImageData(
                tx * tileWidth,
                ty * tileHeight,
                tileWidth,
                tileHeight
            ).data;

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const a = imageData[i + 3];
                if (a > 0) {
                    rSum += r;
                    gSum += g;
                    bSum += b;
                    count++;
                }
            }
            if (count === 0) continue;

            const rAvg = rSum / count;
            const gAvg = gSum / count;
            const bAvg = bSum / count;

            // Map colors to wall types
            if (rAvg < 50 && gAvg < 50 && bAvg < 50) {
                continue; // empty
            } else if (rAvg > 150 && gAvg > 150 && bAvg > 150) {
                steelWalls.push(new SteelWall(tx, ty));
            } else if (rAvg > 100 && rAvg < 200 && gAvg < 150 && bAvg < 100) {
                brickWalls.push(new BrickWall(tx, ty));
            } else if (bAvg > 150 && rAvg < 100 && gAvg < 100) {
                rivers.push(new River(tx, ty));
            } else if (gAvg > 140 && rAvg < 100 && bAvg < 100) {
                bushes.push(new Bush(tx, ty));
            }
        }
    }
}