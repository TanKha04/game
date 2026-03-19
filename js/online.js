// Sử dụng PeerJS để kết nối P2P đơn giản
// Thêm thư viện PeerJS vào game.html trước khi sử dụng

class OnlineManager {
    constructor() {
        this.roomId = localStorage.getItem('onlineRoomId');
        this.isHost = localStorage.getItem('isHost') === 'true';
        this.peer = null;
        this.conn = null;
        this.playersData = {};
        
        if (this.roomId) {
            this.init();
        }
    }

    init() {
        // Peer ID sẽ là Room ID nếu là Host, hoặc ID ngẫu nhiên nếu là Guest
        const peerId = this.isHost ? `ROOM-${this.roomId}` : undefined;
        // Kết nối tới PeerJS Cloud để hoạt động qua mạng Internet/khác WiFi
        const peerOptions = {
            host: '0.peerjs.com',
            port: 443,
            secure: true,
            path: '/'
        };
        this.peer = new Peer(peerId, peerOptions);

        this.peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            if (!this.isHost) {
                // Nếu là Guest, kết nối tới Host
                this.connectToHost();
            }
        });

        this.peer.on('connection', (conn) => {
            this.conn = conn;
            this.setupConnection();
        });
    }

    connectToHost() {
        this.conn = this.peer.connect(`ROOM-${this.roomId}`);
        this.setupConnection();
    }

    setupConnection() {
        this.conn.on('open', () => {
            console.log('Connected to peer!');
            // Gửi thông tin nhân vật của mình
            this.sendData({
                type: 'join',
                classType: localStorage.getItem('playerClass'),
                id: 'Khách'
            });
        });

        this.conn.on('data', (data) => {
            this.handleData(data);
        });
    }

    sendData(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    handleData(data) {
        switch(data.type) {
            case 'move':
                updateEnemyPosition(data);
                break;
            case 'skill':
                enemyUseSkill(data);
                break;
            case 'join':
                console.log('Đối thủ đã tham gia:', data.classType);
                // Cập nhật tên đối thủ
                const enemy = enemies.find(e => e.isPlayer === false);
                if (enemy) enemy.id = data.id;
                break;
        }
    }
}

// Khởi tạo online manager
let onlineManager;
if (typeof gameMode !== 'undefined' && gameMode.startsWith('online')) {
    onlineManager = new OnlineManager();
}
