// Game logic chính
let canvas, ctx;
let gameMode, playerClass, enemyClass;
let players = []; // Danh sách người chơi phe mình
let enemies = []; // Danh sách người chơi phe đối thủ
let myPlayerIndex = 0; // Index của người chơi hiện tại trong mảng players
let cooldowns = { normal: 0, skill1: 0, skill2: 0, skill3: 0 };
let gameRunning = false;
let selectedTarget = null;
let activeZones = [];
let projectiles = [];
let moveKeys = { up: false, down: false, left: false, right: false };
let attackKeys = { normal: false };
let moveInterval = null;
let lastMoveTime = 0;
const MOVE_SPEED = 100; // ms giữa mỗi lần di chuyển

class Projectile {
    constructor(startX, startY, targetX, targetY, skill, isPlayer, maxRange) {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.skill = skill;
        this.isPlayer = isPlayer;
        this.maxRange = maxRange; // Tầm đánh tối đa
        this.speed = 0.2;
        this.reached = false;
        this.distanceTraveled = 0;
        
        // Tính hướng
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
        
        // Màu sắc theo loại skill
        this.color = this.getSkillColor();
    }
    
    getSkillColor() {
        // Màu theo loại skill
        if (this.skill.type === 'normal') {
            return this.isPlayer ? '#FFD700' : '#FFA500'; // Vàng
        } else if (this.skill.type === 'skill1') {
            return this.isPlayer ? '#00BFFF' : '#1E90FF'; // Xanh
        } else if (this.skill.type === 'skill2') {
            return this.isPlayer ? '#FF0000' : '#DC143C'; // Đỏ
        } else if (this.skill.type === 'skill3') {
            return this.isPlayer ? '#9C27B0' : '#8B008B'; // Tím
        }
        return this.isPlayer ? '#FFD700' : '#FF4500'; // Mặc định
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Tính khoảng cách đã bay
        const dx = this.x - this.startX;
        const dy = this.y - this.startY;
        this.distanceTraveled = Math.sqrt(dx * dx + dy * dy);
        
        // Kiểm tra vượt quá tầm đánh
        if (this.distanceTraveled >= this.maxRange) {
            this.reached = true;
            return;
        }
        
        // Kiểm tra đã đến đích chưa
        const distToTarget = Math.sqrt(
            Math.pow(this.x - this.targetX, 2) + 
            Math.pow(this.y - this.targetY, 2)
        );
        
        if (distToTarget < 0.3) {
            this.reached = true;
        }
    }
    
    draw() {
        const pixelX = this.x * GRID_SIZE + GRID_SIZE / 2;
        const pixelY = this.y * GRID_SIZE + GRID_SIZE / 2;
        
        ctx.save();
        ctx.translate(pixelX, pixelY);
        
        // Xoay đầu đạn theo hướng bay
        const angle = Math.atan2(this.vy, this.vx);
        ctx.rotate(angle);
        
        // 1. Hiệu ứng đuôi (Tail/Trail) - Dài và mờ dần
        const tailLength = 25;
        const trailGrad = ctx.createLinearGradient(-tailLength, 0, 0, 0);
        trailGrad.addColorStop(0, 'transparent');
        trailGrad.addColorStop(1, this.color);
        
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-tailLength, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        
        // 2. Đầu đạn (Projectile Head) - Hình thoi hoặc hạt sáng
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(0, 4);
        ctx.lineTo(-4, 0);
        ctx.lineTo(0, -4);
        ctx.closePath();
        ctx.fill();
        
        // Thêm lớp phủ màu của skill
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class Character {
    constructor(classType, x, y, isPlayer, id) {
        const config = CLASS_CONFIG[classType];
        this.classType = classType;
        this.name = config.name;
        this.maxHp = config.hp;
        this.hp = config.hp;
        this.range = config.range;
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;
        this.id = id; // Thêm ID để phân biệt
        this.effects = { slow: 0, stun: 0 };
        this.config = config;
    }

    draw() {
        const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;
        const size = GRID_SIZE * 0.8;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Vẽ bóng dưới chân
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, size/2, size/2.5, size/6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Màu sắc chủ đạo theo phe
        const mainColor = this.isPlayer ? '#6366f1' : '#ef4444';
        const secondaryColor = this.isPlayer ? '#818cf8' : '#f87171';

        // 1. Vẽ Thân (Body)
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.roundRect(-size/4, -size/4, size/2, size/2, 8);
        ctx.fill();
        
        // 2. Vẽ Đầu (Head)
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.arc(0, -size/2.5, size/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Mắt
        ctx.fillStyle = '#fff';
        const eyeX = size/10;
        const eyeY = -size/2.2;
        ctx.beginPath();
        ctx.arc(-eyeX, eyeY, size/20, 0, Math.PI * 2);
        ctx.arc(eyeX, eyeY, size/20, 0, Math.PI * 2);
        ctx.fill();

        // 3. Phụ kiện
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        if (this.classType === 'magic') {
            ctx.strokeStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(size/3, -size/2); ctx.lineTo(size/3, size/3); ctx.stroke();
            ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(size/3, -size/2, size/8, 0, Math.PI * 2); ctx.fill();
        } else if (this.classType === 'physical') {
            ctx.strokeStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(-size/3, -size/2); ctx.lineTo(-size/3, size/3); ctx.stroke();
        } else if (this.classType === 'tank') {
            ctx.fillStyle = '#94a3b8'; ctx.strokeStyle = '#475569'; ctx.beginPath(); ctx.roundRect(size/4, -size/4, size/3, size/1.5, 5); ctx.fill(); ctx.stroke();
        }

        // Tên hoặc ID mờ phía trên
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(this.id || this.name, 0, -size * 0.8);

        // 4. Hiệu ứng trạng thái
        if (this.effects.stun > Date.now()) {
            ctx.save(); ctx.rotate(Date.now() / 200); ctx.fillStyle = '#fbbf24'; ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.fillText('⭐', 0, -size); ctx.restore();
        }
        if (this.effects.slow > Date.now()) {
            ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, size/1.5, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.restore();
    }

    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
        this.updateHpBar();
        if (this.hp <= 0) {
            // Kiểm tra xem phe này còn ai sống không
            const allDead = (this.isPlayer ? players : enemies).every(p => p.hp <= 0);
            if (allDead) endGame(!this.isPlayer);
        }
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.updateHpBar();
    }

    updateHpBar() {
        // Logic mới cho nhiều HP bar
        const team = this.isPlayer ? 'player' : 'enemy';
        const barId = `${team}Hp-${this.id}`;
        const bar = document.getElementById(barId);
        if (bar) {
            const percent = (this.hp / this.maxHp) * 100;
            bar.style.width = percent + '%';
        }
    }

    getDistance(target) {
        return Math.abs(this.x - target.x) + Math.abs(this.y - target.y);
    }
}

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Responsive canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    gameMode = localStorage.getItem('gameMode') || 'ai';
    playerClass = localStorage.getItem('playerClass') || 'magic';
    
    const is2vs2 = gameMode === 'online-2vs2';
    
    // Khởi tạo người chơi
    if (is2vs2) {
        // Chế độ 2vs2: 2 người mỗi phe
        players = [
            new Character(playerClass, 2, 5, true, 'Bạn'),
            new Character('tank', 2, 9, true, 'Đồng Đội')
        ];
        enemies = [
            new Character('physical', 17, 5, false, 'Địch 1'),
            new Character('magic', 17, 9, false, 'Địch 2')
        ];
        myPlayerIndex = 0; // Bạn là người chơi đầu tiên
    } else {
        // Chế độ 1vs1 (AI hoặc Online)
        const classes = ['magic', 'physical', 'tank'];
        enemyClass = classes[Math.floor(Math.random() * classes.length)];
        players = [new Character(playerClass, 2, 7, true, 'Bạn')];
        enemies = [new Character(enemyClass, 17, 7, false, 'Đối Thủ')];
        myPlayerIndex = 0;
    }

    // Gán biến toàn cục để tương thích với logic hiện tại
    player = players[myPlayerIndex];
    enemy = enemies[0];

    // Tạo HP bars động
    setupHPBars();
    
    setupControls();
    setupMobileControls();
    gameRunning = true;
    gameLoop();
    
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyRelease);
    
    // Movement loop
    setInterval(() => {
        if (moveKeys.up) moveCharacter('up');
        if (moveKeys.down) moveCharacter('down');
        if (moveKeys.left) moveCharacter('left');
        if (moveKeys.right) moveCharacter('right');
    }, MOVE_SPEED);
    
    // Attack loop cho đánh thường
    setInterval(() => {
        if (attackKeys.normal) {
            useSkill('normal');
        }
    }, 50); // Kiểm tra mỗi 50ms để phản hồi nhanh hơn
    
    // Bắt đầu AI tấn công
    setTimeout(enemyTurn, 2000);
}

function setupHPBars() {
    const playerInfo = document.querySelector('.player-info');
    const enemyInfo = document.querySelector('.enemy-info');
    
    if (!playerInfo || !enemyInfo) return;

    playerInfo.innerHTML = '<h3>Phe Ta</h3>';
    enemyInfo.innerHTML = '<h3>Phe Địch</h3>';
    
    players.forEach(p => {
        playerInfo.innerHTML += `
            <div class="player-unit-info">
                <span>${p.id}</span>
                <div class="hp-bar"><div id="playerHp-${p.id}" class="hp-fill"></div></div>
            </div>`;
    });
    
    enemies.forEach(e => {
        enemyInfo.innerHTML += `
            <div class="player-unit-info">
                <span>${e.id}</span>
                <div class="hp-bar"><div id="enemyHp-${e.id}" class="hp-fill"></div></div>
            </div>`;
    });
}

function resizeCanvas() {
    const maxWidth = Math.min(800, window.innerWidth - 20);
    const scale = maxWidth / 800;
    canvas.style.width = maxWidth + 'px';
    canvas.style.height = (600 * scale) + 'px';
}

function setupControls() {
    const addControl = (id, skill) => {
        const btn = document.getElementById(id);
        
        if (skill === 'normal') {
            // Đánh thường: giữ để đánh liên tục
            btn.onmousedown = () => {
                attackKeys.normal = true;
                useSkill('normal');
            };
            btn.onmouseup = () => {
                attackKeys.normal = false;
            };
            btn.onmouseleave = () => {
                attackKeys.normal = false;
            };
            
            btn.ontouchstart = (e) => {
                e.preventDefault();
                attackKeys.normal = true;
                useSkill('normal');
            };
            btn.ontouchend = (e) => {
                e.preventDefault();
                attackKeys.normal = false;
            };
        } else {
            // Skill: click 1 lần
            btn.onclick = () => useSkill(skill);
            btn.ontouchstart = (e) => {
                e.preventDefault();
                useSkill(skill);
            };
        }
    };
    
    addControl('normalAttack', 'normal');
    addControl('skill1', 'skill1');
    addControl('skill2', 'skill2');
    addControl('skill3', 'skill3');
    
    // Movement controls với giữ nút
    const addMoveControl = (id, direction) => {
        const btn = document.getElementById(id);
        
        // Mouse events
        btn.onmousedown = () => {
            moveKeys[direction] = true;
            moveCharacter(direction);
        };
        btn.onmouseup = () => {
            moveKeys[direction] = false;
        };
        btn.onmouseleave = () => {
            moveKeys[direction] = false;
        };
        
        // Touch events
        btn.ontouchstart = (e) => {
            e.preventDefault();
            moveKeys[direction] = true;
            moveCharacter(direction);
        };
        btn.ontouchend = (e) => {
            e.preventDefault();
            moveKeys[direction] = false;
        };
    };
    
    addMoveControl('moveUp', 'up');
    addMoveControl('moveDown', 'down');
    addMoveControl('moveLeft', 'left');
    addMoveControl('moveRight', 'right');
}

function moveCharacter(direction) {
    if (!gameRunning || player.effects.stun > Date.now()) return;
    
    const now = Date.now();
    if (now - lastMoveTime < MOVE_SPEED) return;
    
    const moves = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0]
    };
    
    const [dx, dy] = moves[direction];
    const newX = Math.max(0, Math.min(GRID_COLS - 1, player.x + dx));
    const newY = Math.max(0, Math.min(GRID_ROWS - 1, player.y + dy));
    player.x = newX;
    player.y = newY;
    
    lastMoveTime = now;

    // Gửi qua mạng nếu đang chơi online
    if (typeof onlineManager !== 'undefined' && onlineManager) {
        onlineManager.sendData({ type: 'move', x: player.x, y: player.y, id: player.id });
    }
}

function handleKeyPress(e) {
    const keyMap = { 'q': 'normal', 'w': 'skill1', 'e': 'skill2', 'r': 'skill3' };
    if (keyMap[e.key.toLowerCase()]) {
        const skill = keyMap[e.key.toLowerCase()];
        if (skill === 'normal') {
            attackKeys.normal = true;
        } else {
            useSkill(skill);
        }
    }
    
    // Arrow keys for movement
    const moveMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    };
    
    if (moveMap[e.key]) {
        moveKeys[moveMap[e.key]] = true;
    }
}

function handleKeyRelease(e) {
    const keyMap = { 'q': 'normal' };
    if (keyMap[e.key.toLowerCase()]) {
        attackKeys.normal = false;
    }
    
    const moveMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    };
    
    if (moveMap[e.key]) {
        moveKeys[moveMap[e.key]] = false;
    }
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / GRID_SIZE);
    const y = Math.floor((e.clientY - rect.top) * scaleY / GRID_SIZE);
    
    // Tìm enemy bị click trúng
    const target = enemies.find(en => en.x === x && en.y === y);
    if (target) {
        selectedTarget = target;
        console.log("Đã chọn mục tiêu:", target.id);
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((touch.clientX - rect.left) * scaleX / GRID_SIZE);
    const y = Math.floor((touch.clientY - rect.top) * scaleY / GRID_SIZE);
    
    const target = enemies.find(en => en.x === x && en.y === y);
    if (target) {
        selectedTarget = target;
    }
}

function setupMobileControls() {
    const joystick = document.getElementById('joystick');
    if (!joystick) return;
    
    const container = joystick.parentElement;
    let active = false;
    let startX, startY;
    let moveIntervalId = null;
    
    joystick.addEventListener('touchstart', (e) => {
        active = true;
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
        
        // Bắt đầu di chuyển liên tục
        if (moveIntervalId) clearInterval(moveIntervalId);
        moveIntervalId = setInterval(() => {
            if (active) {
                processJoystickMove();
            }
        }, MOVE_SPEED);
    });
    
    let currentTouch = null;
    
    joystick.addEventListener('touchmove', (e) => {
        if (!active) return;
        e.preventDefault();
        currentTouch = e.touches[0];
        
        const dx = currentTouch.clientX - startX;
        const dy = currentTouch.clientY - startY;
        const distance = Math.min(35, Math.sqrt(dx * dx + dy * dy));
        const angle = Math.atan2(dy, dx);
        
        joystick.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px))`;
    });
    
    function processJoystickMove() {
        if (!currentTouch || !active || player.effects.stun > Date.now()) return;
        
        const dx = currentTouch.clientX - startX;
        const dy = currentTouch.clientY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 20) {
            const angle = Math.atan2(dy, dx);
            const moveX = Math.round(Math.cos(angle));
            const moveY = Math.round(Math.sin(angle));
            const newX = Math.max(0, Math.min(GRID_COLS - 1, player.x + moveX));
            const newY = Math.max(0, Math.min(GRID_ROWS - 1, player.y + moveY));
            player.x = newX;
            player.y = newY;
        }
    }
    
    joystick.addEventListener('touchend', () => {
        active = false;
        currentTouch = null;
        joystick.style.transform = 'translate(-50%, -50%)';
        if (moveIntervalId) {
            clearInterval(moveIntervalId);
            moveIntervalId = null;
        }
    });
}

function useSkill(skillType) {
    if (!gameRunning || player.effects.stun > Date.now()) return;
    if (cooldowns[skillType] > Date.now()) return;
    
    // Tìm mục tiêu: Ưu tiên target đã chọn, nếu không thì lấy enemy đầu tiên
    const target = selectedTarget || enemies.find(e => e.hp > 0) || enemies[0];
    if (!target) return;

    const config = player.config;
    let skill, cooldown;
    
    if (skillType === 'normal') {
        skill = config.normalAttack;
        cooldown = skill.cooldown;
    } else {
        const skillIndex = parseInt(skillType.replace('skill', '')) - 1;
        skill = config.skills[skillIndex];
        cooldown = skill.cooldown;
    }
    
    // Xử lý dash ngay lập tức
    if (skill.effect === 'dash') {
        const dx = Math.sign(target.x - player.x);
        const dy = Math.sign(target.y - player.y);
        for (let i = 0; i < skill.distance; i++) {
            if (player.x !== target.x) player.x += dx;
            else if (player.y !== target.y) player.y += dy;
        }
        cooldowns[skillType] = Date.now() + cooldown;
        updateCooldownUI();
        
        // Gửi qua mạng nếu đang chơi online
        if (onlineManager) {
            onlineManager.sendData({ type: 'move', x: player.x, y: player.y, id: player.id });
        }
        return;
    }
    
    // Tạo projectile
    const projectile = new Projectile(
        player.x, player.y, target.x, target.y, 
        { ...skill, type: skillType }, true, player.range
    );
    projectiles.push(projectile);
    
    // Gửi qua mạng nếu đang chơi online
    if (onlineManager) {
        onlineManager.sendData({ 
            type: 'skill', 
            skillType: skillType, 
            startX: player.x, startY: player.y, 
            targetX: target.x, targetY: target.y,
            id: player.id 
        });
    }

    cooldowns[skillType] = Date.now() + cooldown;
    updateCooldownUI();
}

function enemyTurn() {
    if (!gameRunning || enemy.effects.stun > Date.now()) return;
    
    const distance = enemy.getDistance(player);
    const config = enemy.config;
    
    // AI đơn giản: random skill
    const skills = ['normal', 'skill1', 'skill2', 'skill3'];
    const skill = skills[Math.floor(Math.random() * skills.length)];
    
    let skillData;
    
    if (skill === 'normal') {
        skillData = config.normalAttack;
    } else {
        const idx = parseInt(skill.replace('skill', '')) - 1;
        skillData = config.skills[idx];
    }
    
    // Xử lý dash
    if (skillData.effect === 'dash') {
        const dx = Math.sign(player.x - enemy.x);
        const dy = Math.sign(player.y - enemy.y);
        for (let i = 0; i < skillData.distance; i++) {
            if (enemy.x !== player.x) enemy.x += dx;
            else if (enemy.y !== player.y) enemy.y += dy;
        }
        // Tiếp tục đánh sau khi dash
        setTimeout(enemyTurn, 500);
        return;
    }
    
    // Tạo projectile với tầm đánh giới hạn
    const projectile = new Projectile(
        enemy.x, 
        enemy.y, 
        player.x, 
        player.y, 
        { ...skillData, type: skill }, 
        false,
        enemy.range // Truyền tầm đánh tối đa
    );
    projectiles.push(projectile);
    
    // AI tiếp tục đánh sau một khoảng thời gian ngẫu nhiên
    setTimeout(enemyTurn, 1000 + Math.random() * 1500);
}

function updateCooldownUI() {
    const now = Date.now();
    ['normal', 'skill1', 'skill2', 'skill3'].forEach(skill => {
        const id = skill === 'normal' ? 'normalAttack' : skill;
        const btn = document.getElementById(id);
        const label = btn.querySelector('.skill-label');
        
        if (cooldowns[skill] > now) {
            btn.disabled = true;
            btn.classList.add('cooldown');
            const remaining = Math.ceil((cooldowns[skill] - now) / 1000);
            if (label) {
                if (!label.dataset.original) label.dataset.original = label.textContent;
                label.textContent = `${label.dataset.original} (${remaining}s)`;
            }
        } else {
            btn.disabled = false;
            btn.classList.remove('cooldown');
            if (label && label.dataset.original) {
                label.textContent = label.dataset.original;
            }
        }
    });
}

function gameLoop() {
    if (!gameRunning) return;
    
    // Clear canvas với nền tối sâu
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ lưới (grid) mờ ảo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }
    
    // Vẽ zones với hiệu ứng glow
    activeZones = activeZones.filter(zone => {
        if (zone.endTime > Date.now()) {
            const centerX = (zone.x + 0.5) * GRID_SIZE;
            const centerY = (zone.y + 0.5) * GRID_SIZE;
            const radius = zone.radius * GRID_SIZE;
            
            const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Vẽ viền zone
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Sát thương
            const dist = Math.sqrt(Math.pow(player.x - zone.x, 2) + Math.pow(player.y - zone.y, 2));
            if (dist <= zone.radius) player.takeDamage(zone.damage / 60);
            
            return true;
        }
        return false;
    });
    
    // Cập nhật và vẽ projectiles
    projectiles = projectiles.filter(proj => {
        proj.update();
        proj.draw();
        
        if (proj.reached) {
            if (proj.distanceTraveled >= proj.maxRange) return false;
            
            // Tìm mục tiêu gần nhất tại điểm đạn rơi
            const targets = proj.isPlayer ? enemies : players;
            const target = targets.reduce((prev, curr) => {
                const d = Math.sqrt(Math.pow(curr.x - proj.x, 2) + Math.pow(curr.y - proj.y, 2));
                return d < 1.5 && (!prev || d < prev.dist) ? { unit: curr, dist: d } : prev;
            }, null);
            
            if (target) {
                const unit = target.unit;
                const skill = proj.skill;
                unit.takeDamage(skill.damage);
                
                if (skill.effect === 'slow') unit.effects.slow = Date.now() + 3000;
                else if (skill.effect === 'stun') unit.effects.stun = Date.now() + skill.duration;
                else if (skill.effect === 'zone') {
                    activeZones.push({ x: proj.x, y: proj.y, radius: skill.radius, endTime: Date.now() + 5000, damage: skill.damage });
                } else if (skill.effect === 'lifesteal') {
                    const caster = proj.isPlayer ? players[myPlayerIndex] : enemies[0];
                    caster.heal(skill.heal);
                }
            }
            return false;
        }
        return true;
    });
    
    // Vẽ nhân vật
    players.forEach(p => p.draw());
    enemies.forEach(e => e.draw());
    
    updateCooldownUI();
    requestAnimationFrame(gameLoop);
}

function endGame(playerWon) {
    gameRunning = false;
    const gameOver = document.getElementById('gameOver');
    const gameResult = document.getElementById('gameResult');
    gameOver.classList.remove('hidden');
    gameResult.textContent = playerWon ? 'BẠN CHIẾN THẮNG!' : 'BẠN ĐÃ THẤT BẠI!';
}

// Network helpers
function updateEnemyPosition(data) {
    const e = enemies.find(en => en.id === data.id);
    if (e) {
        e.x = data.x;
        e.y = data.y;
    }
}

function enemyUseSkill(data) {
    const e = enemies.find(en => en.id === data.id);
    if (!e) return;
    
    const config = e.config;
    let skill;
    if (data.skillType === 'normal') {
        skill = config.normalAttack;
    } else {
        const idx = parseInt(data.skillType.replace('skill', '')) - 1;
        skill = config.skills[idx];
    }

    const projectile = new Projectile(
        data.startX, data.startY, data.targetX, data.targetY,
        { ...skill, type: data.skillType }, false, e.range
    );
    projectiles.push(projectile);
}

window.onload = init;
