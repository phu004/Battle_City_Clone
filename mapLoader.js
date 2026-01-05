import { BrickWall } from './BrickWall.js';
import { SteelWall } from './SteelWall.js';
import { River } from './River.js';
import { Bush } from './Bush.js';


export async function initializeMap(levelNum, brickWalls, steelWalls, rivers, bushes) {
    brickWalls.length = 0;
    steelWalls.length = 0;
    rivers.length = 0;
    bushes.length = 0;

    const imgSrc = `levels/${levelNum}.png`;
    const img = new Image();
    img.src = imgSrc;

    // Wait until the image is loaded
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        console.log("Loading level image:", imgSrc);
    });

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