// Cấu hình các hệ và kỹ năng
const CLASS_CONFIG = {
    magic: {
        name: 'Phép Thuật',
        hp: 200,
        range: 8,
        normalAttack: { damage: 5, cooldown: 200 },
        skills: [
            { name: 'Làm Chậm', damage: 15, cooldown: 3000, effect: 'slow' },
            { name: 'Vòng Tròn', damage: 15, cooldown: 10000, effect: 'zone', radius: 3 },
            { name: 'Hút Máu', damage: 100, cooldown: 15000, effect: 'lifesteal', heal: 50 }
        ]
    },
    physical: {
        name: 'Vật Lý',
        hp: 300,
        range: 5,
        normalAttack: { damage: 15, cooldown: 200 },
        skills: [
            { name: 'Choáng', damage: 30, cooldown: 7000, effect: 'stun', duration: 2000 },
            { name: 'Lao Tới', damage: 0, cooldown: 5000, effect: 'dash', distance: 6 },
            { name: 'Hút Máu', damage: 100, cooldown: 15000, effect: 'lifesteal', heal: 50 }
        ]
    },
    tank: {
        name: 'Đỡ Đòn',
        hp: 500,
        range: 5,
        normalAttack: { damage: 3, cooldown: 200 },
        skills: [
            { name: 'Choáng Dài', damage: 10, cooldown: 9000, effect: 'stun', duration: 4000 },
            { name: 'Lao Ngắn', damage: 0, cooldown: 4000, effect: 'dash', distance: 3 },
            { name: 'Hút Máu', damage: 100, cooldown: 15000, effect: 'lifesteal', heal: 50 }
        ]
    }
};

const GRID_SIZE = 40; // Kích thước mỗi ô (m)
const GRID_COLS = 20;
const GRID_ROWS = 15;
