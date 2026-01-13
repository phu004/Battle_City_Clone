// Simple Mobile Gamepad - Emulates Keyboard Events
export class MobileGamepad {
    constructor() {
        this.gamepad = document.getElementById('mobileGamepad');
        this.dpadButtons = document.querySelectorAll('.dpad-btn');
        this.fireBtn = document.querySelector('.fire-btn');
        this.pauseBtn = document.getElementById('mobilePauseBtn');
        
        // Track active buttons
        this.activeKeys = new Set();
        
        this.init();
    }
    
    init() {
        this.setupDpadEvents();
        this.setupFireButton();
        this.setupPauseButton();
        
        // Prevent context menu on long press
        this.gamepad.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setupDpadEvents() {
        this.dpadButtons.forEach(button => {
            // Touch events
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const direction = button.dataset.direction;
                this.pressDirection(direction);
                button.classList.add('active');
            });
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                const direction = button.dataset.direction;
                this.releaseDirection(direction);
                button.classList.remove('active');
            });
            
            button.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                const direction = button.dataset.direction;
                this.releaseDirection(direction);
                button.classList.remove('active');
            });
            
            // Mouse events for testing on desktop
            button.addEventListener('mousedown', () => {
                const direction = button.dataset.direction;
                this.pressDirection(direction);
                button.classList.add('active');
            });
            
            button.addEventListener('mouseup', () => {
                const direction = button.dataset.direction;
                this.releaseDirection(direction);
                button.classList.remove('active');
            });
            
            button.addEventListener('mouseleave', () => {
                if (button.classList.contains('active')) {
                    const direction = button.dataset.direction;
                    this.releaseDirection(direction);
                    button.classList.remove('active');
                }
            });
        });
    }
    
    setupFireButton() {
        // Touch events
        this.fireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.pressFire();
            this.fireBtn.classList.add('active');
        });
        
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
    
    pressDirection(direction) {
        let key;
        let keyCode;
        
        // Map direction to keyboard key
        switch(direction) {
            case 'UP':
                key = 'arrowup';
                keyCode = 38;
                break;
            case 'DOWN':
                key = 'arrowdown';
                keyCode = 40;
                break;
            case 'LEFT':
                key = 'arrowleft';
                keyCode = 37;
                break;
            case 'RIGHT':
                key = 'arrowright';
                keyCode = 39;
                break;
            default:
                return;
        }
        
        // Only send event if not already pressed
        if (!this.activeKeys.has(key)) {
            this.activeKeys.add(key);
            this.simulateKeyEvent('keydown', key, keyCode);
        }
    }
    
    releaseDirection(direction) {
        let key;
        let keyCode;
        
        switch(direction) {
            case 'UP':
                key = 'arrowup';
                keyCode = 38;
                break;
            case 'DOWN':
                key = 'arrowdown';
                keyCode = 40;
                break;
            case 'LEFT':
                key = 'arrowleft';
                keyCode = 37;
                break;
            case 'RIGHT':
                key = 'arrowright';
                keyCode = 39;
                break;
            default:
                return;
        }
        
        // Only send event if was pressed
        if (this.activeKeys.has(key)) {
            this.activeKeys.delete(key);
            this.simulateKeyEvent('keyup', key, keyCode);
        }
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
        
        // Pause is a single press, not held
        this.simulateKeyEvent('keydown', key, keyCode);
        setTimeout(() => {
            this.simulateKeyEvent('keyup', key, keyCode);
        }, 100);
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
        // console.log(`${type}: ${key} (${keyCode})`);
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
    
    // Optional: Clean up all pressed keys (useful when game loses focus)
    releaseAllKeys() {
        const keysToRelease = Array.from(this.activeKeys);
        keysToRelease.forEach(key => {
            switch(key) {
                case 'arrowup':
                    this.releaseDirection('UP');
                    break;
                case 'arrowdown':
                    this.releaseDirection('DOWN');
                    break;
                case 'arrowleft':
                    this.releaseDirection('LEFT');
                    break;
                case 'arrowright':
                    this.releaseDirection('RIGHT');
                    break;
                case 'l':
                    this.releaseFire();
                    break;
            }
        });
        
        // Also update button visuals
        this.dpadButtons.forEach(btn => btn.classList.remove('active'));
        this.fireBtn.classList.remove('active');
    }
}

