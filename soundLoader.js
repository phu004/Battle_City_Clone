import {drawLoadingScreen } from  './renderer.js';

export async function initializeSound(sound, ctx, gameState, canvas) {
    // Define sounds in exact order
    const soundConfigs = [
        { url: "sound/shoot.wav", volume: 0.65 },   
        { url: "sound/bulletHitWall.wav", volume: 1 },
        { url: "sound/destoryWall.wav", volume: 1 },
        { url: "sound/enemyExplode.wav", volume: 1 },
        { url: "sound/armorLost.wav", volume: 1 },
        { url: "sound/powerUpSpawn.wav", volume: 1 },
        { url: "sound/playerExplode.wav", volume: 1 },
        { url: "sound/consumePowerUp.wav", volume: 1 },
        { url: "sound/consumeExtraLife.wav", volume: 1 },
        { url: "sound/pause.wav", volume: 1 },
        { url: "sound/playerMoveSound.wav", volume:0.65 },
        { url: "sound/enemyMoveSound.wav", volume: 0.65 },
        { url: "sound/gameStart.mp3", volume: 1}
    ];

    // Initialize array with correct length to preserve indexes
    for (let i = 0; i < soundConfigs.length; i++) {
        sound[i] = null; // Placeholder
    }

    // Create and load sounds sequentially to ensure order
    for (let i = 0; i < soundConfigs.length; i++) {
        const { url, volume } = soundConfigs[i];
        
        await new Promise((resolve) => {
            const audio = new Audio();
            
            audio.addEventListener('canplaythrough', () => {
                audio.volume = volume;
                sound[i] = audio; // Insert at exact index
                resolve();
            }, { once: true });
            
            audio.addEventListener('error', () => {
                console.warn(`Failed to load sound at index ${i}: ${url}`);
                // Still create Audio object but it won't play
                sound[i] = new Audio();
                resolve();
            }, { once: true });
            
            audio.preload = 'auto';
            audio.src = url;
            audio.load(); // Start loading
        });
        
        drawLoadingScreen("Loading sounds...", Math.floor(20 + 70 * i/soundConfigs.length), ctx, gameState, canvas);
    }
    
    return sound;
}