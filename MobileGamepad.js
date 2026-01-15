// Complete Mobile Gamepad with Gesture D-Pad
export class MobileGamepad {
    constructor() {
        this.gamepad = document.getElementById('mobileGamepad');
        this.gestureDpad = document.getElementById('gestureDpad');
        this.dpadZones = document.querySelectorAll('.dpad-zone');
        this.fireBtn = document.querySelector('.fire-btn');
        this.pauseBtn = document.getElementById('mobilePauseBtn');
        
        this.activeDirection = null;
        this.activeKeys = new Set();
        this.touchId = null;
        this.isMouseDown = false;

        this.lastPauseTime = 0;
        this.PAUSE_COOLDOWN = 300; // ms
        
        this.init();
    }
    
    init() {
        this.setupGestureDpad();
        this.setupFireButton();
        this.setupPauseButton();
        
        // Prevent context menu
        this.gamepad.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Prevent scrolling when touching gamepad
        this.gamepad.addEventListener('touchmove', (e) => {
            if (e.target.closest('.gesture-dpad, .fire-btn, .pause-btn')) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    setupGestureDpad() {
        // Touch events
        this.gestureDpad.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouchStart(e);
        }, { passive: false });
        
        this.gestureDpad.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleTouchMove(e);
        }, { passive: false });
        
        this.gestureDpad.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleTouchEnd(e);
        });
        
        this.gestureDpad.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.handleTouchEnd(e);
        });
        
        // Mouse events for testing on desktop
        this.gestureDpad.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e);
        });
        
        this.gestureDpad.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        this.gestureDpad.addEventListener('mouseup', (e) => {
            this.handleMouseUp(e);
        });
        
        this.gestureDpad.addEventListener('mouseleave', (e) => {
            this.handleMouseUp(e);
        });
    }
    
    setupFireButton() {
        // Touch events
        this.fireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.pressFire();
            this.fireBtn.classList.add('active');
        }, { passive: false });
        
        this.fireBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.releaseFire();
            this.fireBtn.classList.remove('active');
        });
        
        this.fireBtn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.releaseFire();
            this.fireBtn.classList.remove('active');
        });
        
        // Mouse events
        this.fireBtn.addEventListener('mousedown', () => {
            this.pressFire();
            this.fireBtn.classList.add('active');
        });
        
        this.fireBtn.addEventListener('mouseup', () => {
            this.releaseFire();
            this.fireBtn.classList.remove('active');
        });
        
        this.fireBtn.addEventListener('mouseleave', () => {
            if (this.fireBtn.classList.contains('active')) {
                this.releaseFire();
                this.fireBtn.classList.remove('active');
            }
        });
    }
    
    setupPauseButton() {
        this.pauseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.pressPause();
            this.pauseBtn.classList.add('active');
            setTimeout(() => this.pauseBtn.classList.remove('active'), 200);
        });
    }
    
    handleTouchStart(e) {
        if (this.touchId === null) {
            const touch = e.touches[0];
            this.touchId = touch.identifier;
            this.processDirection(touch.clientX, touch.clientY);
        }
    }
    
    handleTouchMove(e) {
        if (this.touchId !== null) {
            // Find our specific touch
            for (let touch of e.touches) {
                if (touch.identifier === this.touchId) {
                    this.processDirection(touch.clientX, touch.clientY);
                    break;
                }
            }
        }
    }
    
    handleTouchEnd(e) {
        if (this.touchId !== null) {
            this.releaseAllDirections();
            this.touchId = null;
        }
    }
    
    handleMouseDown(e) {
        this.isMouseDown = true;
        this.processDirection(e.clientX, e.clientY);
    }
    
    handleMouseMove(e) {
        if (this.isMouseDown) {
            this.processDirection(e.clientX, e.clientY);
        }
    }
    
    handleMouseUp(e) {
        this.isMouseDown = false;
        this.releaseAllDirections();
    }
    
    processDirection(clientX, clientY) {
        const rect = this.gestureDpad.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate angle and distance from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If touch is too close to center, do nothing
        if (distance < 20) {
            this.releaseAllDirections();
            return;
        }
        
        // Calculate angle in degrees (0° = right, 90° = up)
        let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        
        let newDirection = null;
        
        // Determine direction based on angle
        if (angle >= 45 && angle < 135) {
            newDirection = 'UP';    // 45° to 135°
        } else if (angle >= 135 && angle < 225) {
            newDirection = 'LEFT';  // 135° to 225°
        } else if (angle >= 225 && angle < 315) {
            newDirection = 'DOWN';  // 225° to 315°
        } else {
            newDirection = 'RIGHT'; // 315° to 45°
        }
        
        // Only update if direction changed
        if (newDirection !== this.activeDirection) {
            this.releaseAllDirections();
            this.activeDirection = newDirection;
            this.pressDirection(newDirection);
        }
    }
    
    pressDirection(direction) {
        const key = this.directionToKey(direction);
        const keyCode = this.directionToKeyCode(direction);
        
        if (!this.activeKeys.has(key)) {
            this.activeKeys.add(key);
            this.simulateKeyEvent('keydown', key, keyCode);
            
            // Visual feedback
            const zone = document.querySelector(`.${direction.toLowerCase()}-zone`);
            if (zone) zone.classList.add('active');
        }
    }
    
    releaseDirection(direction) {
        const key = this.directionToKey(direction);
        const keyCode = this.directionToKeyCode(direction);
        
        if (this.activeKeys.has(key)) {
            this.activeKeys.delete(key);
            this.simulateKeyEvent('keyup', key, keyCode);
            
            // Remove visual feedback
            const zone = document.querySelector(`.${direction.toLowerCase()}-zone`);
            if (zone) zone.classList.remove('active');
        }
    }
    
    releaseAllDirections() {
        ['UP', 'DOWN', 'LEFT', 'RIGHT'].forEach(dir => {
            this.releaseDirection(dir);
        });
        this.activeDirection = null;
        this.dpadZones.forEach(zone => zone.classList.remove('active'));
    }
    
    pressFire() {
        const key = 'l'; // Your fire key is 'l'
        const keyCode = 76; // L key
        
        if (!this.activeKeys.has(key)) {
            this.activeKeys.add(key);
            this.simulateKeyEvent('keydown', key, keyCode);
        }
    }
    
    releaseFire() {
        const key = 'l';
        const keyCode = 76;
        
        if (this.activeKeys.has(key)) {
            this.activeKeys.delete(key);
            this.simulateKeyEvent('keyup', key, keyCode);
        }
    }
    
    pressPause() {
        const key = 'p';
        const keyCode = 80;

        this.simulateKeyEvent('keydown', key, keyCode);
        setTimeout(() => {
            this.simulateKeyEvent('keyup', key, keyCode);
        }, 100);
    }
    
    directionToKey(direction) {
        const map = {
            'UP': 'arrowup',
            'DOWN': 'arrowdown',
            'LEFT': 'arrowleft',
            'RIGHT': 'arrowright'
        };
        return map[direction] || '';
    }
    
    directionToKeyCode(direction) {
        const map = {
            'UP': 38,
            'DOWN': 40,
            'LEFT': 37,
            'RIGHT': 39
        };
        return map[direction] || 0;
    }
    
    simulateKeyEvent(type, key, keyCode) {
        // Create a proper keyboard event
        const event = new KeyboardEvent(type, {
            key: key,
            code: this.getKeyCode(key),
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        });
        
        // Dispatch the event to the window (same as real keyboard)
        window.dispatchEvent(event);
        
        // Debug log (optional)
        // console.log(`MobileGamepad: ${type} ${key} (${keyCode})`);
    }
    
    getKeyCode(key) {
        const map = {
            'arrowup': 'ArrowUp',
            'arrowdown': 'ArrowDown',
            'arrowleft': 'ArrowLeft',
            'arrowright': 'ArrowRight',
            'l': 'KeyL',
            'p': 'KeyP'
        };
        return map[key] || '';
    }
    
    // Clean up all pressed keys (useful when game loses focus)
    releaseAllKeys() {
        this.releaseAllDirections();
        
        // Release fire key if pressed
        if (this.activeKeys.has('l')) {
            this.releaseFire();
        }
        
        // Update button visuals
        this.fireBtn.classList.remove('active');
        this.pauseBtn.classList.remove('active');
    }
    
    // Optional: Call this when game is paused or loses focus
    reset() {
        this.releaseAllKeys();
        this.touchId = null;
        this.isMouseDown = false;
    }
}

