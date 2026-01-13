// Complete Mobile Gamepad with T-Shape Sliding D-Pad
export class MobileGamepad {
    constructor() {
        this.gamepad = document.getElementById('mobileGamepad');
        this.gestureDpad = document.getElementById('gestureDpad');
        this.fireBtn = document.querySelector('.fire-btn');
        this.pauseBtn = document.getElementById('mobilePauseBtn');
        
        this.activeDirection = null;
        this.activeKeys = new Set();
        this.touchId = null;
        this.isMouseDown = false;
        this.activeHighlight = null;
        
        this.init();
    }
    
    init() {
        this.createActiveHighlight();
        this.setupGestureDpad();
        this.setupFireButton();
        this.setupPauseButton();
        
        // Prevent context menu
        this.gamepad.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Prevent scrolling when touching gamepad
        this.gamepad.addEventListener('touchmove', (e) => {
            if (e.target.closest('.t-shape-dpad, .fire-btn, .pause-btn')) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    createActiveHighlight() {
        // Create a div for active direction highlighting
        this.activeHighlight = document.createElement('div');
        this.activeHighlight.className = 'active-highlight';
        this.gestureDpad.appendChild(this.activeHighlight);
        this.hideActiveHighlight();
    }
    
    setupGestureDpad() {
        // Touch events for the entire D-pad
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
            this.processTouch(touch.clientX, touch.clientY);
        }
    }
    
    handleTouchMove(e) {
        if (this.touchId !== null) {
            // Find our specific touch
            for (let touch of e.touches) {
                if (touch.identifier === this.touchId) {
                    this.processTouch(touch.clientX, touch.clientY);
                    break;
                }
            }
        }
    }
    
    handleTouchEnd(e) {
        if (this.touchId !== null) {
            this.touchId = null;
            this.releaseAllDirections();
        }
    }
    
    handleMouseDown(e) {
        this.isMouseDown = true;
        this.processTouch(e.clientX, e.clientY);
    }
    
    handleMouseMove(e) {
        if (this.isMouseDown) {
            this.processTouch(e.clientX, e.clientY);
        }
    }
    
    handleMouseUp(e) {
        this.isMouseDown = false;
        this.releaseAllDirections();
    }
    
    processTouch(clientX, clientY) {
        const rect = this.gestureDpad.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Define T-shape zones programmatically
        const zoneBounds = {
            'UP': { x1: 40, y1: 0, x2: 120, y2: 50 },
            'LEFT': { x1: 0, y1: 50, x2: 40, y2: 120 },
            'DOWN': { x1: 40, y1: 50, x2: 120, y2: 120 },
            'RIGHT': { x1: 120, y1: 50, x2: 160, y2: 120 }
        };
        
        // Adjust for responsive sizes
        const widthScale = rect.width / 160;
        const heightScale = rect.height / 120;
        
        // Find which zone the touch is in
        let newDirection = null;
        
        for (const [direction, bounds] of Object.entries(zoneBounds)) {
            const scaledX1 = bounds.x1 * widthScale;
            const scaledX2 = bounds.x2 * widthScale;
            const scaledY1 = bounds.y1 * heightScale;
            const scaledY2 = bounds.y2 * heightScale;
            
            if (x >= scaledX1 && x <= scaledX2 && y >= scaledY1 && y <= scaledY2) {
                newDirection = direction;
                break;
            }
        }
        
        // If touch is in neutral area (center of DOWN zone), release all
        if (newDirection === 'DOWN') {
            const centerX = rect.width / 2;
            const centerY = 50 * heightScale + (70 * heightScale) / 2;
            const neutralRadius = 30 * Math.min(widthScale, heightScale);
            
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < neutralRadius) {
                newDirection = null;
            }
        }
        
        // Update direction if changed
        if (newDirection !== this.activeDirection) {
            if (this.activeDirection) {
                this.releaseDirection(this.activeDirection);
            }
            
            this.activeDirection = newDirection;
            
            if (newDirection) {
                this.pressDirection(newDirection);
                this.showActiveHighlight(newDirection, rect, widthScale, heightScale);
            } else {
                this.hideActiveHighlight();
            }
        }
    }
    
    showActiveHighlight(direction, rect, widthScale, heightScale) {
        const zoneBounds = {
            'UP': { x1: 40, y1: 0, x2: 120, y2: 50 },
            'LEFT': { x1: 0, y1: 50, x2: 40, y2: 120 },
            'DOWN': { x1: 40, y1: 50, x2: 120, y2: 120 },
            'RIGHT': { x1: 120, y1: 50, x2: 160, y2: 120 }
        };
        
        const bounds = zoneBounds[direction];
        if (!bounds) {
            this.hideActiveHighlight();
            return;
        }
        
        this.activeHighlight.style.display = 'block';
        this.activeHighlight.style.left = (bounds.x1 * widthScale) + 'px';
        this.activeHighlight.style.top = (bounds.y1 * heightScale) + 'px';
        this.activeHighlight.style.width = ((bounds.x2 - bounds.x1) * widthScale) + 'px';
        this.activeHighlight.style.height = ((bounds.y2 - bounds.y1) * heightScale) + 'px';
        
        // Adjust border radius based on direction
        if (direction === 'UP') {
            this.activeHighlight.style.borderRadius = '8px 8px 0 0';
        } else if (direction === 'LEFT') {
            this.activeHighlight.style.borderRadius = '0 0 0 8px';
        } else if (direction === 'DOWN') {
            this.activeHighlight.style.borderRadius = '0';
        } else if (direction === 'RIGHT') {
            this.activeHighlight.style.borderRadius = '0 0 8px 0';
        }
    }
    
    hideActiveHighlight() {
        this.activeHighlight.style.display = 'none';
    }
    
    pressDirection(direction) {
        const key = this.directionToKey(direction);
        const keyCode = this.directionToKeyCode(direction);
        
        if (!this.activeKeys.has(key)) {
            this.activeKeys.add(key);
            this.simulateKeyEvent('keydown', key, keyCode);
        }
    }
    
    releaseDirection(direction) {
        const key = this.directionToKey(direction);
        const keyCode = this.directionToKeyCode(direction);
        
        if (this.activeKeys.has(key)) {
            this.activeKeys.delete(key);
            this.simulateKeyEvent('keyup', key, keyCode);
        }
    }
    
    releaseAllDirections() {
        ['UP', 'DOWN', 'LEFT', 'RIGHT'].forEach(dir => {
            this.releaseDirection(dir);
        });
        this.activeDirection = null;
        this.hideActiveHighlight();
    }
    
    // ... (rest of the methods remain the same: pressFire, releaseFire, etc.)
    pressFire() {
        const key = 'l';
        const keyCode = 76;
        
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
        const event = new KeyboardEvent(type, {
            key: key,
            code: this.getKeyCode(key),
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        });
        
        window.dispatchEvent(event);
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
    
    releaseAllKeys() {
        this.releaseAllDirections();
        
        if (this.activeKeys.has('l')) {
            this.releaseFire();
        }
        
        this.fireBtn.classList.remove('active');
        this.pauseBtn.classList.remove('active');
    }
    
    reset() {
        this.releaseAllKeys();
        this.touchId = null;
        this.isMouseDown = false;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 768) {
        window.mobileGamepad = new MobileGamepad();
        
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768 && !window.mobileGamepad) {
                window.mobileGamepad = new MobileGamepad();
            }
        });
        
        window.addEventListener('blur', () => {
            if (window.mobileGamepad) {
                window.mobileGamepad.releaseAllKeys();
            }
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && window.mobileGamepad) {
                window.mobileGamepad.releaseAllKeys();
            }
        });
    }
});