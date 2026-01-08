class StarryPiano {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.piano = document.getElementById('piano');
        
        // 星空相关
        this.stars = [];
        this.shootingStars = [];
        
        // 钢琴相关
        this.synth = null;
        this.keys = [];
        this.activeNotes = new Map(); // 存储正在播放的音符和定时器
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.createStars();
        this.setupPiano();
        this.setupAudio();
        this.animate();
        
        window.addEventListener('resize', () => this.setupCanvas());
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createStars() {
        this.stars = [];
        const numStars = 200;
        
        for (let i = 0; i < numStars; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.8 + 0.2,
                twinkleSpeed: Math.random() * 0.02 + 0.01
            });
        }
    }

    createShootingStar() {
        if (Math.random() < 0.003) { // 0.3% 概率生成流星
            this.shootingStars.push({
                x: Math.random() * this.canvas.width,
                y: 0,
                length: Math.random() * 80 + 20,
                speed: Math.random() * 5 + 3,
                angle: Math.random() * Math.PI / 4 + Math.PI / 4,
                opacity: 1
            });
        }
    }

    setupPiano() {
        // 钢琴键的音符映射
        const whiteKeys = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'];
        const blackKeys = [
            { note: 'C#4', position: 0 },
            { note: 'D#4', position: 1 },
            { note: 'F#4', position: 3 },
            { note: 'G#4', position: 4 },
            { note: 'A#4', position: 5 },
            { note: 'C#5', position: 7 },
            { note: 'D#5', position: 8 },
            { note: 'F#5', position: 10 },
            { note: 'G#5', position: 11 },
            { note: 'A#5', position: 12 }
        ];

        // 创建白键
        whiteKeys.forEach((note, index) => {
            const key = document.createElement('div');
            key.className = 'white-key';
            key.dataset.note = note;
            key.addEventListener('mousedown', () => this.playNote(note, key));
            // 移除 mouseup 和 mouseleave 的 stopNote 调用，让音符自然播放完
            // key.addEventListener('mouseup', () => this.stopNote(key));
            // key.addEventListener('mouseleave', () => this.stopNote(key));
            this.piano.appendChild(key);
            this.keys.push({ element: key, note: note, type: 'white' });
        });

        // 创建黑键
        blackKeys.forEach(({ note, position }) => {
            const key = document.createElement('div');
            key.className = 'black-key';
            key.dataset.note = note;
            key.style.left = `${position * 51 + 36}px`; // 51px = 50px width + 1px margin
            key.addEventListener('mousedown', () => this.playNote(note, key));
            // 移除 mouseup 和 mouseleave 的 stopNote 调用，让音符自然播放完
            // key.addEventListener('mouseup', () => this.stopNote(key));
            // key.addEventListener('mouseleave', () => this.stopNote(key));
            this.piano.appendChild(key);
            this.keys.push({ element: key, note: note, type: 'black' });
        });

        // 键盘事件
        this.setupKeyboardEvents();
    }

    setupKeyboardEvents() {
        const keyMap = {
            'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
            'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
            'u': 'A#4', 'j': 'B4', 'k': 'C5', 'o': 'C#5', 'l': 'D5',
            'p': 'D#5', ';': 'E5', "'": 'F5'
        };

        document.addEventListener('keydown', (e) => {
            const note = keyMap[e.key.toLowerCase()];
            if (note && !e.repeat) {
                const keyObj = this.keys.find(k => k.note === note);
                if (keyObj) {
                    this.playNote(note, keyObj.element);
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            const note = keyMap[e.key.toLowerCase()];
            if (note) {
                const keyObj = this.keys.find(k => k.note === note);
                if (keyObj) {
                    // 键盘松开时不立即停止，让音符自然播放完1秒
                    // 只移除按键的视觉激活状态，但保持音符播放
                    // keyObj.element.classList.remove('active');
                }
            }
        });
    }

    async setupAudio() {
        try {
            await Tone.start();
            this.synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    type: "triangle"
                },
                envelope: {
                    attack: 0.02,
                    decay: 0.1,
                    sustain: 0.3,
                    release: 0.3  // 缩短释放时间，让音符1秒后快速停止
                }
            }).toDestination();

            // 添加混响效果
            const reverb = new Tone.Reverb(1).toDestination();  // 减少混响时间
            this.synth.connect(reverb);
        } catch (error) {
            console.error('音频初始化失败:', error);
        }
    }

    playNote(note, keyElement) {
        console.log('播放音符:', note); // 调试信息
        
        if (this.synth) {
            // 如果这个音符已经在播放，先停止它
            if (this.activeNotes.has(note)) {
                const existingTimer = this.activeNotes.get(note);
                clearTimeout(existingTimer.stopTimer);
                this.synth.triggerRelease(note);
            }

            // 开始播放新的音符
            this.synth.triggerAttack(note);
            keyElement.classList.add('active');
            
            console.log('创建烟雾粒子'); // 调试信息
            // 立即创建烟雾粒子效果
            this.createSmokeParticles(keyElement);
            
            // 设置1秒后自动停止音符
            const stopTimer = setTimeout(() => {
                console.log('停止音符:', note); // 调试信息
                this.synth.triggerRelease(note);
                keyElement.classList.remove('active');
                this.activeNotes.delete(note);
            }, 1000);
            
            // 存储定时器引用
            this.activeNotes.set(note, { stopTimer });
        } else {
            console.error('音频合成器未初始化');
        }
    }

    stopNote(keyElement) {
        // 手动停止时，找到对应的音符并清理定时器
        const note = keyElement.dataset.note;
        if (this.activeNotes.has(note)) {
            const timers = this.activeNotes.get(note);
            clearTimeout(timers.stopTimer);
            this.synth.triggerRelease(note);
            this.activeNotes.delete(note);
        }
        keyElement.classList.remove('active');
    }

    createSmokeParticles(keyElement) {
        console.log('开始创建烟雾粒子'); // 调试信息
        const rect = keyElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top;
        
        console.log('按键位置:', centerX, centerY); // 调试信息

        // 创建多个烟雾粒子，形成烟雾效果
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const smokeParticle = document.createElement('div');
                smokeParticle.className = 'smoke-particle';
                
                // 随机位置偏移，让烟雾更自然
                const offsetX = (Math.random() - 0.5) * 30;
                const offsetY = Math.random() * 10;
                smokeParticle.style.left = `${centerX + offsetX}px`;
                smokeParticle.style.top = `${centerY - offsetY}px`;
                
                // 随机大小
                const size = Math.random() * 15 + 10; // 10-25px
                smokeParticle.style.width = `${size}px`;
                smokeParticle.style.height = `${size}px`;
                
                // 随机漂移方向
                const driftX = (Math.random() - 0.5) * 60; // -30px 到 30px
                smokeParticle.style.setProperty('--drift-x', `${driftX}px`);
                
                console.log('创建烟雾粒子:', i, smokeParticle.style.left, smokeParticle.style.top); // 调试信息
                
                document.body.appendChild(smokeParticle);
                
                // 3秒后移除烟雾粒子
                setTimeout(() => {
                    if (smokeParticle.parentNode) {
                        smokeParticle.remove();
                    }
                }, 3000);
            }, i * 50); // 每50ms创建一个粒子，形成连续的烟雾效果
        }
    }

    drawStars() {
        this.stars.forEach(star => {
            // 闪烁效果
            star.brightness += Math.sin(Date.now() * star.twinkleSpeed) * 0.1;
            star.brightness = Math.max(0.2, Math.min(1, star.brightness));
            
            this.ctx.save();
            this.ctx.globalAlpha = star.brightness;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 添加光晕效果
            if (star.size > 1.5) {
                this.ctx.globalAlpha = star.brightness * 0.3;
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }

    drawShootingStars() {
        this.shootingStars = this.shootingStars.filter(star => {
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;
            star.opacity -= 0.01;
            
            if (star.opacity <= 0 || star.x > this.canvas.width || star.y > this.canvas.height) {
                return false;
            }
            
            // 绘制流星
            this.ctx.save();
            this.ctx.globalAlpha = star.opacity;
            
            const gradient = this.ctx.createLinearGradient(
                star.x, star.y,
                star.x - Math.cos(star.angle) * star.length,
                star.y - Math.sin(star.angle) * star.length
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.5, '#87ceeb');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(
                star.x - Math.cos(star.angle) * star.length,
                star.y - Math.sin(star.angle) * star.length
            );
            this.ctx.stroke();
            
            this.ctx.restore();
            return true;
        });
    }

    drawNebula() {
        // 绘制星云效果
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width * 0.3, this.canvas.height * 0.2, 0,
            this.canvas.width * 0.3, this.canvas.height * 0.2, this.canvas.width * 0.4
        );
        gradient.addColorStop(0, 'rgba(138, 43, 226, 0.1)');
        gradient.addColorStop(0.5, 'rgba(75, 0, 130, 0.05)');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 另一个星云
        const gradient2 = this.ctx.createRadialGradient(
            this.canvas.width * 0.7, this.canvas.height * 0.6, 0,
            this.canvas.width * 0.7, this.canvas.height * 0.6, this.canvas.width * 0.3
        );
        gradient2.addColorStop(0, 'rgba(0, 100, 200, 0.08)');
        gradient2.addColorStop(0.5, 'rgba(0, 50, 150, 0.04)');
        gradient2.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient2;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    animate() {
        // 清空画布
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制星云
        this.drawNebula();
        
        // 绘制星星
        this.drawStars();
        
        // 创建和绘制流星
        this.createShootingStar();
        this.drawShootingStars();
        
        requestAnimationFrame(() => this.animate());
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new StarryPiano();
});

// 点击开始音频（某些浏览器需要用户交互才能播放音频）
document.addEventListener('click', async () => {
    if (Tone.context.state !== 'running') {
        console.log('启动音频上下文...');
        await Tone.start();
        console.log('音频上下文已启动');
    }
}, { once: true });