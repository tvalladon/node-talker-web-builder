class Room {
    constructor(gridX, gridY, gridSize, roomId, zoneId) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.gridSize = gridSize;
        this.roomId = parseInt(roomId, 10);  // Ensure roomId is stored as an integer
        this.zoneId = parseInt(zoneId, 10);  // Ensure zoneId is stored as an integer
        this.name = "";
        this.description = "";
        this.lockable = false;
        this.locked = false;
        this.whitelist = [];
        this.temporary = false;
        this.creator = "";
        this.owner = "";
        this.solo = true;
        this.exits = {};
        this.props = {};
    }

    draw(ctx, scale, offsetX, offsetY) {
        ctx.fillStyle = 'rgb(180,180,180)';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;

        let roomX = this.gridX * 20 * scale + offsetX;
        let roomY = this.gridY * 20 * scale + offsetY;
        let roomSize = this.gridSize * 20 * scale;

        ctx.fillRect(roomX, roomY, roomSize, roomSize);
        ctx.strokeRect(roomX, roomY, roomSize, roomSize);

        ctx.fillStyle = 'black';
        ctx.font = (0.8 * scale) + "px Arial";
        const roomIdStr = zeroPad(this.roomId, 3); // Zero-pad roomId
        const zoneIdStr = zeroPad(this.zoneId, 3); // Zero-pad zoneId
        const padding = 1 * scale; // Add padding
        ctx.fillText(`${zoneIdStr}:${roomIdStr}`, roomX + padding, roomY + padding + ctx.measureText('M').width);
        ctx.lineWidth = 1;
    }
}

class Grid {
    constructor(canvas, ctx, totalGridSquares, scale) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.totalGridSquares = totalGridSquares;
        this.scale = scale;
        this.rooms = [];

        this.offsetX = this.calculateOffsetX();
        this.offsetY = this.calculateOffsetY();

        this.isPanning = false;
        this.startPanX = null;
        this.startPanY = null;

        this.mouseX = 0;
        this.mouseY = 0;

        this.isDrawing = false;
        this.selectedTool = null;

        this.startingRoomId = 1;
        this.currentRoomId = this.startingRoomId;

        this.setupEventListeners();
    }

    calculateOffsetX() {
        return -this.scale * 20 * (this.totalGridSquares / 2 - this.canvas.width / (2 * 20 * this.scale));
    }

    calculateOffsetY() {
        return -this.scale * 20 * (this.totalGridSquares / 2 - this.canvas.height / (2 * 20 * this.scale));
    }

    initializeGrid() {
        this.zoneId = document.getElementById('zoneId').value;
        this.scale = 1;
        this.offsetX = this.calculateOffsetX();
        this.offsetY = this.calculateOffsetY();
        this.drawGrid();
    }

    drawGrid() {
        this.clearCanvas();
        this.drawBackground();
        this.drawRooms();
        this.drawGridLines();

        if (this.isDrawing && this.selectedTool === 'room') {
            this.highlightTemporaryRoom();
        } else if (!this.isDrawing && !this.isPanning) {
            this.highlightMouseSquare();
        }
    }


    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }


    drawBackground() {
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawRooms() {
        for (let room of this.rooms) {
            room.draw(this.ctx, this.scale, this.offsetX, this.offsetY, this.zoneId);
        }
    }

    drawGridLines() {
        this.ctx.strokeStyle = '#444';
        let minGridX = Math.max(Math.floor((-this.offsetX) / (20 * this.scale)), 0);
        let maxGridX = Math.min(Math.ceil((this.canvas.width - this.offsetX) / (20 * this.scale)), this.totalGridSquares);
        let minGridY = Math.max(Math.floor((-this.offsetY) / (20 * this.scale)), 0);
        let maxGridY = Math.min(Math.ceil((this.canvas.height - this.offsetY) / (20 * this.scale)), this.totalGridSquares);

        for (let i = minGridX; i < maxGridX; i++) {
            for (let j = minGridY; j < maxGridY; j++) {
                this.drawGridLine(i, j);
                this.drawLabels(i, j);
            }
        }

        // Drawing the special label at (500, 500) only if no room exists
        if (this.scale >= 5 && !this.isRoomAt(500, 500)) {
            this.ctx.fillStyle = 'black';
            this.ctx.font = `${1 * this.scale}px Arial`;
            this.ctx.fillText(`500, 500`, (20 * 500 + 15) * this.scale + this.offsetX, (20 * 500 + 18) * this.scale + this.offsetY);
        } else if (!this.isRoomAt(500, 500)) {
            this.ctx.fillStyle = 'rgba(100, 100, 100, 1)';
            this.ctx.fillRect(500 * 20 * this.scale + this.offsetX, 500 * 20 * this.scale + this.offsetY, 20 * this.scale, 20 * this.scale);
        }
    }

    isRoomAt(gridX, gridY) {
        return this.rooms.some(room => room.gridX === gridX && room.gridY === gridY);
    }

    drawGridLine(i, j) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX, this.scale * 20 * j + this.offsetY);
        this.ctx.lineTo(this.scale * 20 * this.totalGridSquares + this.offsetX, this.scale * 20 * j + this.offsetY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(this.scale * 20 * i + this.offsetX, this.offsetY);
        this.ctx.lineTo(this.scale * 20 * i + this.offsetX, this.scale * 20 * this.totalGridSquares + this.offsetY);
        this.ctx.stroke();
    }

    drawLabels(i, j) {
        if (this.scale >= 5) {
            this.ctx.fillStyle = 'rgba(100, 100, 100, 1)';
            this.ctx.font = `${1 * this.scale}px Arial`;
            this.ctx.fillText(`${i}, ${j}`, (20 * i + 15) * this.scale + this.offsetX, (20 * j + 18) * this.scale + this.offsetY);
        }
    }

    highlightMouseSquare() {
        let highlightX = Math.floor((this.mouseX - this.offsetX) / (20 * this.scale));
        let highlightY = Math.floor((this.mouseY - this.offsetY) / (20 * this.scale));

        if (highlightX >= 0 && highlightX < this.totalGridSquares && highlightY >= 0 && highlightY < this.totalGridSquares) {
            switch (this.selectedTool) {
                case 'eraser':
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    break;
                case 'room':
                    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                    break;
                default:
                    this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                    break;
            }
            this.ctx.fillRect(highlightX * 20 * this.scale + this.offsetX, highlightY * 20 * this.scale + this.offsetY, 20 * this.scale, 20 * this.scale);
        }
    }

    getHighlightColor() {
        switch (this.selectedTool) {
            case 'room':
                return 'rgba(0, 255, 0, 0.5)';
            case 'eraser':
                return 'rgba(255, 0, 0, 0.5)';
            default:
                return 'rgba(255, 255, 0, 0.5)';
        }
    }

    drawCentralSquare() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillText(`${500}, ${500}`, (20 * 500 + 15) * this.scale + this.offsetX, (20 * 500 + 18) * this.scale + this.offsetY);
    }

    panStart(x, y) {
        this.isPanning = true;
        this.startPanX = x;
        this.startPanY = y;
    }

    panMove(x, y) {
        if (this.isPanning) {
            this.updateOffset(x - this.startPanX, y - this.startPanY);
            this.startPanX = x;
            this.startPanY = y;
            this.drawGrid();
        }
    }

    updateOffset(dx, dy) {
        if (this.isWithinBounds(this.offsetX + dx, this.canvas.width)) {
            this.offsetX += dx;
        }
        if (this.isWithinBounds(this.offsetY + dy, this.canvas.height)) {
            this.offsetY += dy;
        }
    }

    isWithinBounds(value, dimension) {
        return value < dimension / 2 && value > -this.totalGridSquares * 20 * this.scale + dimension / 2;
    }

    panEnd() {
        this.isPanning = false;
    }

    zoom(deltaY) {
        let oldScale = this.scale;
        this.scale *= Math.pow(1.01, -deltaY / 100);

        let mouseGridX = (this.mouseX - this.offsetX) / oldScale;
        let mouseGridY = (this.mouseY - this.offsetY) / oldScale;

        this.offsetX = this.mouseX - mouseGridX * this.scale;
        this.offsetY = this.mouseY - mouseGridY * this.scale;

        this.drawGrid();
    }

    updateInfo(x, y) {
        let gridX = Math.floor((x - this.offsetX) / (20 * this.scale));
        let gridY = Math.floor((y - this.offsetY) / (20 * this.scale));
        document.getElementById('info').textContent = `X ${gridX} Y ${gridY}`;// s:${this.scale.toFixed(2)}`;
    }

    setupKeyListener() {
        window.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    handleKeydown(e) {
        switch (e.key) {
            case ' ':
                this.resetOffset();
                this.drawGrid();
                break;
            case 'Escape':
                this.selectTool(null);
                break;
        }
    }

    resetOffset() {
        this.offsetX = this.calculateOffsetX();
        this.offsetY = this.calculateOffsetY();
    }

    selectTool(tool) {
        this.selectedTool = tool;
    }

    addRoom(room) {
        room.roomId = this.generateRoomId();
        this.rooms.push(room);
        this.drawGrid();
    }

    generateRoomId() {
        let roomIds = this.rooms.map(room => room.roomId);
        for (let i = this.startingRoomId; i <= this.currentRoomId; i++) {
            if (!roomIds.includes(i)) {
                return i;
            }
        }
        return ++this.currentRoomId;
    }

    removeRoom(index) {
        this.rooms.splice(index, 1);
        this.drawGrid();
    }

    setupEventListeners() {
        this.setupKeyListener();
        this.setupCanvasEventListeners();
        this.setupToolEventListeners();
        this.setupZoomEventListener();
        this.setupMouseMoveListener();
    }

    setupCanvasEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    handleMouseDown(e) {
        if (this.selectedTool === 'room') {
            this.startDrawing(e.clientX, e.clientY);
        } else if (this.selectedTool === 'eraser') {
            this.eraseRoom(e.clientX, e.clientY);
        } else {
            this.panStart(e.clientX, e.clientY);
        }
    }


    handleMouseUp() {
        if (this.isDrawing && this.selectedTool === 'room') {
            let gridX = this.temporaryRoomX;
            let gridY = this.temporaryRoomY;

            // Check if a room already exists at the specified grid coordinates
            let existingRoom = this.rooms.find(room => room.gridX === gridX && room.gridY === gridY);
            if (existingRoom) {
                console.log(`Room already exists at (${gridX}, ${gridY})`);
            } else {
                let roomId = this.generateRoomId(); // Generate roomId
                let zoneId = parseInt(this.zoneId, 10); // Ensure zoneId is an integer
                let room = new Room(gridX, gridY, 1, roomId, zoneId); // Pass zoneId when creating the room
                this.addRoom(room);
            }
            this.isDrawing = false;
        } else if (this.isPanning) {
            this.panEnd();
        }
        this.drawGrid(); // Redraw the grid to update the view
    }


    startDrawing(x, y) {
        this.isDrawing = true;
        this.initialDrawX = x;
        this.initialDrawY = y;
        this.temporaryRoomX = Math.floor((x - this.offsetX) / (20 * this.scale));
        this.temporaryRoomY = Math.floor((y - this.offsetY) / (20 * this.scale));
        this.highlightTemporaryRoom();
    }

    eraseRoom(x, y) {
        let roomX = Math.floor((x - this.offsetX) / (20 * this.scale));
        let roomY = Math.floor((y - this.offsetY) / (20 * this.scale));
        let roomIndex = this.rooms.findIndex(room => room.gridX === roomX && room.gridY === roomY);
        if (roomIndex > -1) {
            this.removeRoom(roomIndex);
        }
    }

    setupToolEventListeners() {
        document.getElementById('roomShape').addEventListener('click', () => this.selectTool('room'));
        document.getElementById('pointerIcon').addEventListener('click', () => this.selectTool(null));
        document.getElementById('eraserIconContainer').addEventListener('click', () => this.selectTool('eraser'));
    }

    setupZoomEventListener() {
        window.addEventListener('wheel', (e) => this.handleZoom(e));
    }

    handleZoom(e) {
        this.zoom(e.deltaY);
        this.updateInfo(e.x, e.y);
    }

    setupMouseMoveListener() {
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    handleMouseMove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;

        if (this.isDrawing && this.selectedTool === 'room') {
            this.updateTemporaryRoom(e.clientX, e.clientY);
        } else if (this.isPanning) {
            this.panMove(e.clientX, e.clientY);
        } else {
            this.drawGrid(); // Redraw the grid to clear previous highlights
            this.highlightMouseSquare();
        }
        this.updateInfo(e.clientX, e.clientY);
    }

    updateTemporaryRoom(x, y) {
        this.temporaryRoomX = Math.floor((x - this.offsetX) / (20 * this.scale));
        this.temporaryRoomY = Math.floor((y - this.offsetY) / (20 * this.scale));
        this.drawGrid();
        this.highlightTemporaryRoom();
    }


    drawTemporaryRoom(x, y) {
        let roomX = Math.floor((x - this.offsetX) / (20 * this.scale));
        let roomY = Math.floor((y - this.offsetY) / (20 * this.scale));
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.fillRect(roomX * 20 * this.scale + this.offsetX, roomY * 20 * this.scale + this.offsetY, 20 * this.scale, 20 * this.scale);
    }

    highlightTemporaryRoom() {
        if (this.selectedTool === 'room') {
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
            this.ctx.fillRect(
                this.temporaryRoomX * 20 * this.scale + this.offsetX,
                this.temporaryRoomY * 20 * this.scale + this.offsetY,
                20 * this.scale,
                20 * this.scale
            );
        }
    }


}

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const totalGridSquares = 1000;
const scale = 0.5;

const grid = new Grid(canvas, ctx, totalGridSquares, scale);
grid.initializeGrid();

// Hamburger menu function
function openMenu() {
    var menu = document.getElementById('expanded-menu');
    menu.classList.toggle('hidden');
}

function changeZoneId(input) {
    let zoneIdValue = parseInt(input.value, 10);
    if (isNaN(zoneIdValue) || zoneIdValue > 999 || zoneIdValue < -999) {
        input.setCustomValidity("Invalid field.");
    } else {
        input.setCustomValidity("");
        input.value = zeroPad(zoneIdValue, 3);
    }
}

function changeRoomId(input) {
    let roomIdValue = parseInt(input.value, 10);
    if (isNaN(roomIdValue) || roomIdValue > 999 || roomIdValue < -999) {
        input.setCustomValidity("Invalid field.");
    } else {
        input.setCustomValidity("");
        input.value = zeroPad(roomIdValue, 3);
    }
}

function zeroPad(num, places) {
    let absNum = Math.abs(num);
    let sign = num < 0 ? '-' : '';
    let zeroPadded = absNum.toString().padStart(places, '0');
    return sign + zeroPadded;
}

document.getElementById('zoneId').addEventListener('change', function () {
    changeZoneId(this);
    grid.zoneId = parseInt(this.value, 10); // Update grid zoneId as an integer
    grid.drawGrid();
});

document.getElementById('startingRoomId').addEventListener('change', function () {
    changeRoomId(this);
    grid.startingRoomId = parseInt(this.value, 10); // Update grid startingRoomId as an integer
});

function debugRooms() {
    if (typeof grid !== 'undefined') {
        console.log(grid.rooms);
    } else {
        console.error('Grid is not defined');
    }
}