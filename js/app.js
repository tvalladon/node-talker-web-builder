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
        this.solo = false;
        this.exits = {};
        this.props = {};
    }
}

class Grid {
    constructor(totalGridSquares, scale) {
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

        // Add resize event listener
        window.addEventListener('resize', () => this.handleResize());
    }

    calculateOffsetX() {
        return -this.scale * 20 * (this.totalGridSquares / 2 - stage.width() / (2 * 20 * this.scale));
    }

    calculateOffsetY() {
        return -this.scale * 20 * (this.totalGridSquares / 2 - stage.height() / (2 * 20 * this.scale));
    }

    handleResize() {
        stage.width(window.innerWidth);
        stage.height(window.innerHeight);
        this.offsetX = this.calculateOffsetX();
        this.offsetY = this.calculateOffsetY();
        this.drawGrid();
    }

    initializeGrid() {
        this.zoneId = document.getElementById('zoneId').value;
        this.scale = 1;
        this.offsetX = this.calculateOffsetX();
        this.offsetY = this.calculateOffsetY();
        this.drawGrid();
    }

    drawGrid() {
        layer.destroyChildren(); // Clear the Konva layer before redrawing

        // Draw the background if necessary
        this.drawBackground();

        // Draw rooms and connections
        this.drawRooms();
        this.drawConnections();

        // Optional: draw grid lines if needed
        this.drawGridLines();

        // Highlight temporary room or mouse square based on the current tool
        if (this.isDrawing && this.selectedTool === 'room') {
            this.highlightTemporaryRoom();
        } else if (!this.isDrawing && !this.isPanning) {
            this.highlightMouseSquare();
        }

        // Ensure everything is drawn in a single batch
        layer.batchDraw();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBackground() {
        const background = new Konva.Rect({
            x: 0,
            y: 0,
            width: stage.width(),
            height: stage.height(),
            fill: '#333',
        });
        layer.add(background);
    }

    drawRooms() {
        for (let room of this.rooms) {
            const roomId = `${String(room.zoneId).padStart(3, '0')}:${String(room.roomId).padStart(3, '0')}`;
            const rect = new Konva.Rect({
                x: room.gridX * 20 * this.scale + this.offsetX,
                y: room.gridY * 20 * this.scale + this.offsetY,
                width: 20 * this.scale,
                height: 20 * this.scale,
                fill: 'white',
                stroke: 'black',
                strokeWidth: 1,
            });

            const text = new Konva.Text({
                x: room.gridX * 20 * this.scale + this.offsetX,
                y: room.gridY * 20 * this.scale + this.offsetY + 5 * this.scale,
                text: roomId,
                fontSize: 12 * this.scale,
                width: 20 * this.scale,
                align: 'center',
            });

            layer.add(rect);
            layer.add(text);
            room.rect = rect;
            room.text = text;
        }
        layer.draw();
    }

    drawGridLines() {
        let minGridX = Math.max(Math.floor((-this.offsetX) / (20 * this.scale)), 0);
        let maxGridX = Math.min(Math.ceil((stage.width() - this.offsetX) / (20 * this.scale)), this.totalGridSquares);
        let minGridY = Math.max(Math.floor((-this.offsetY) / (20 * this.scale)), 0);
        let maxGridY = Math.min(Math.ceil((stage.height() - this.offsetY) / (20 * this.scale)), this.totalGridSquares);

        let lines = [];

        for (let i = minGridX; i <= maxGridX; i++) {
            lines.push(new Konva.Line({
                points: [
                    i * 20 * this.scale + this.offsetX, this.offsetY,
                    i * 20 * this.scale + this.offsetX, this.totalGridSquares * 20 * this.scale + this.offsetY
                ],
                stroke: '#444',
                strokeWidth: 1,
            }));
        }

        for (let j = minGridY; j <= maxGridY; j++) {
            lines.push(new Konva.Line({
                points: [
                    this.offsetX, j * 20 * this.scale + this.offsetY,
                    this.totalGridSquares * 20 * this.scale + this.offsetX, j * 20 * this.scale + this.offsetY
                ],
                stroke: '#444',
                strokeWidth: 1,
            }));
        }

        lines.forEach(line => layer.add(line));

        layer.batchDraw();
    }

    drawGridLine(i, j) {
        if (i <= this.totalGridSquares) {
            let verticalLine = new Konva.Line({
                points: [
                    i * 20 * this.scale + this.offsetX, this.offsetY,
                    i * 20 * this.scale + this.offsetX, this.totalGridSquares * 20 * this.scale + this.offsetY
                ],
                stroke: '#444',
                strokeWidth: 1,
            });
            layer.add(verticalLine);
            // console.log(`Added vertical line at x = ${i}`);
        }

        if (j <= this.totalGridSquares) {
            let horizontalLine = new Konva.Line({
                points: [
                    this.offsetX, j * 20 * this.scale + this.offsetY,
                    this.totalGridSquares * 20 * this.scale + this.offsetX, j * 20 * this.scale + this.offsetY
                ],
                stroke: '#444',
                strokeWidth: 1,
            });
            layer.add(horizontalLine);
            // console.log(`Added horizontal line at y = ${j}`);
        }
    }

    isRoomAt(gridX, gridY) {
        return this.rooms.some(room => room.gridX === gridX && room.gridY === gridY);
    }

    drawLabels(i, j) {
        if (this.scale >= 5) {
            let text = new Konva.Text({
                x: (20 * i + 15) * this.scale + this.offsetX,
                y: (20 * j + 18) * this.scale + this.offsetY,
                text: `${i}, ${j}`,
                fontSize: 12 * this.scale,
                fill: 'rgba(100, 100, 100, 1)',
            });
            layer.add(text);
        }
    }

    highlightMouseSquare() {
        layer.find('.highlight').forEach(node => node.destroy()); // Clear previous highlights

        let highlightX = Math.floor((this.mouseX - this.offsetX) / (20 * this.scale));
        let highlightY = Math.floor((this.mouseY - this.offsetY) / (20 * this.scale));

        if (highlightX >= 0 && highlightX < this.totalGridSquares && highlightY >= 0 && highlightY < this.totalGridSquares) {
            let highlightColor;
            switch (this.selectedTool) {
                case 'eraser':
                    highlightColor = 'rgba(255, 0, 0, 0.5)';
                    break;
                case 'room':
                    highlightColor = 'rgba(0, 255, 0, 0.5)';
                    break;
                case 'edit':
                    highlightColor = 'rgba(0, 0, 255, 0.5)';
                    break;
                default:
                    highlightColor = 'rgba(255, 255, 0, 0.5)';
                    break;
            }

            const rect = new Konva.Rect({
                x: highlightX * 20 * this.scale + this.offsetX,
                y: highlightY * 20 * this.scale + this.offsetY,
                width: 20 * this.scale,
                height: 20 * this.scale,
                fill: highlightColor,
                name: 'highlight' // Tagging the rectangle for easy removal later
            });

            layer.add(rect);
            layer.batchDraw();
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
            const dx = x - this.startPanX;
            const dy = y - this.startPanY;
            this.updateOffset(dx, dy);
            this.startPanX = x;
            this.startPanY = y;
            this.drawGrid(); // Redraw the grid to update the view
        }
    }

    updateOffset(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
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
        this.setupToolEventListeners();
        this.setupZoomEventListener();
        this.setupMouseMoveListener();
        this.setupCanvasEventListeners();
    }

    setupCanvasEventListeners() {
        stage.on('mousedown', (e) => {
            const pos = stage.getPointerPosition();
            this.handleMouseDown(pos.x, pos.y);
        });
        stage.on('mouseup', () => this.handleMouseUp());
        stage.on('mousemove', (e) => {
            const pos = stage.getPointerPosition();
            this.handleMouseMove(pos.x, pos.y);
        });
    }

    handleMouseDown(x, y) {
        if (this.selectedTool === 'room') {
            this.startDrawing(x, y);
        } else if (this.selectedTool === 'eraser') {
            this.eraseRoom(x, y);
        } else if (this.selectedTool === 'edit') {
            this.editRoom(x, y);
        } else {
            this.panStart(x, y);
        }
    }

    editRoom(x, y) {
        let gridX = Math.floor((x - this.offsetX) / (20 * this.scale));
        let gridY = Math.floor((y - this.offsetY) / (20 * this.scale));

        let room = this.rooms.find(room => room.gridX === gridX && room.gridY === gridY);
        if (room) {
            this.showEditForm(room);
        }
    }

    showEditForm(room) {
        const directions = ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"];
        const formattedZoneId = String(room.zoneId).padStart(3, '0');
        const formattedRoomId = String(room.roomId).padStart(3, '0');

        let exitsHtml = '';
        for (let [direction, target] of Object.entries(room.exits)) {
            exitsHtml += `
            <div class="exit-row" data-direction="${direction}">
                ${direction} to ${target} 
                <i class="fas fa-edit edit-exit"></i> 
                <i class="fas fa-trash-alt delete-exit"></i>
            </div>`;
        }
        if (Object.keys(room.exits).length < 10) {
            exitsHtml += `<div class="exit-row add-exit"><i class="fas fa-plus"></i> Add Exit</div>`;
        }

        const formHtml = `
        <div id="editFormContent">
            <h3>Edit Room: ${formattedZoneId}:${formattedRoomId}</h3>
            <label for="roomName">Name:</label>
            <input type="text" id="roomName" value="${room.name}">
            <label for="roomDescription">Description:</label>
            <textarea id="roomDescription">${room.description}</textarea>
            <label for="roomLockable">Lockable:</label>
            <input type="checkbox" id="roomLockable" ${room.lockable ? 'checked' : ''}>
            <label for="roomLocked">Locked:</label>
            <input type="checkbox" id="roomLocked" ${room.locked ? 'checked' : ''}>
            <label for="roomTemporary">Temporary:</label>
            <input type="checkbox" id="roomTemporary" ${room.temporary ? 'checked' : ''}>
            <label for="roomSolo">Solo:</label>
            <input type="checkbox" id="roomSolo" ${room.solo ? 'checked' : ''}>
            <label for="roomCreator">Creator:</label>
            <input type="text" id="roomCreator" value="${room.creator}">
            <label for="roomOwner">Owner:</label>
            <input type="text" id="roomOwner" value="${room.owner}">
            <div id="exitsPlaceholder">Exits: ${exitsHtml}</div>
            <div id="whitelistPlaceholder">Whitelist: <em>Placeholder for whitelist</em></div>
            <div id="propsPlaceholder">Props: <em>Placeholder for props</em></div>
            <button id="saveRoom">Save</button>
            <button id="cancelEdit">Cancel</button>
        </div>
    `;

        const slideOutForm = document.getElementById('slideOutForm');
        slideOutForm.innerHTML = formHtml;
        slideOutForm.classList.remove('hidden');
        slideOutForm.classList.add('visible');

        // Add event listeners for save and cancel buttons
        document.getElementById('saveRoom').addEventListener('click', () => this.saveRoom(room));
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeEditForm());

        // Add event listeners for editing and deleting exits
        document.querySelectorAll('.edit-exit').forEach(el => el.addEventListener('click', (e) => this.editExit(e, room)));
        document.querySelectorAll('.delete-exit').forEach(el => el.addEventListener('click', (e) => this.deleteExit(e, room)));
        document.querySelector('.add-exit').addEventListener('click', () => this.addExit(room));
    }

    editExit(e, room) {
        const exitRow = e.target.closest('.exit-row');
        const direction = exitRow.getAttribute('data-direction');
        const target = room.exits[direction];
        const directions = ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"];

        const roomOptions = this.rooms.map(r => {
            const roomId = String(r.roomId).padStart(3, '0');
            const zoneId = String(r.zoneId).padStart(3, '0');
            const roomName = r.name ? ` (${r.name})` : '';
            return `<option value="${zoneId}:${roomId}" ${zoneId}:${roomId} === target ? 'selected' : ''>${zoneId}:${roomId}${roomName}</option>`;
        }).join('');

        const editHtml = `
        <select class="edit-direction">${directions.map(dir => `<option value="${dir}" ${dir === direction ? 'selected' : ''}>${dir}</option>`).join('')}</select>
        <select class="edit-target">${roomOptions}</select>
        <i class="fas fa-save save-exit"></i>
        <i class="fas fa-times cancel-edit"></i>
    `;

        exitRow.innerHTML = editHtml;

        exitRow.querySelector('.save-exit').addEventListener('click', () => this.saveExit(exitRow, room));
        exitRow.querySelector('.cancel-edit').addEventListener('click', () => this.cancelEditExit(exitRow, direction, target));
    }

    saveExit(exitRow, room) {
        const newDirection = exitRow.querySelector('.edit-direction').value;
        const newTarget = exitRow.querySelector('.edit-target').value;
        const oldDirection = exitRow.getAttribute('data-direction');

        delete room.exits[oldDirection];
        room.exits[newDirection] = newTarget;

        // Automatically create reciprocal exit
        const reverseDirection = this.getReverseDirection(newDirection);
        const targetRoom = this.rooms.find(r => `${String(r.zoneId).padStart(3, '0')}:${String(r.roomId).padStart(3, '0')}` === newTarget);
        if (targetRoom) {
            targetRoom.exits[reverseDirection] = `${String(room.zoneId).padStart(3, '0')}:${String(room.roomId).padStart(3, '0')}`;
        }

        this.showEditForm(room);
    }

    cancelEditExit(exitRow, direction, target) {
        exitRow.innerHTML = `
        ${direction} to ${target}
        <i class="fas fa-edit edit-exit"></i>
        <i class="fas fa-trash-alt delete-exit"></i>
    `;

        exitRow.querySelector('.edit-exit').addEventListener('click', (e) => this.editExit(e, room));
        exitRow.querySelector('.delete-exit').addEventListener('click', (e) => this.deleteExit(e, room));
    }

    deleteExit(e, room) {
        const exitRow = e.target.closest('.exit-row');
        const direction = exitRow.getAttribute('data-direction');

        delete room.exits[direction];

        this.showEditForm(room);
    }

    addExit(room) {
        const directions = ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"];
        const roomOptions = this.rooms.map(r => {
            const roomId = String(r.roomId).padStart(3, '0');
            const zoneId = String(r.zoneId).padStart(3, '0');
            const roomName = r.name ? ` (${r.name})` : '';
            return `<option value="${zoneId}:${roomId}">${zoneId}:${roomId}${roomName}</option>`;
        }).join('');

        const newExitHtml = `
        <div class="exit-row new-exit">
            <select class="edit-direction">${directions.map(dir => `<option value="${dir}">${dir}</option>`).join('')}</select>
            <select class="edit-target">${roomOptions}</select>
            <i class="fas fa-save save-exit"></i>
            <i class="fas fa-times cancel-edit"></i>
        </div>
    `;

        document.querySelector('#exitsPlaceholder').insertAdjacentHTML('beforeend', newExitHtml);

        const newExitRow = document.querySelector('.new-exit');
        newExitRow.querySelector('.save-exit').addEventListener('click', () => this.saveNewExit(newExitRow, room));
        newExitRow.querySelector('.cancel-edit').addEventListener('click', () => newExitRow.remove());
    }

    saveNewExit(newExitRow, room) {
        const newDirection = newExitRow.querySelector('.edit-direction').value;
        const newTarget = newExitRow.querySelector('.edit-target').value;

        room.exits[newDirection] = newTarget;

        // Automatically create reciprocal exit
        const reverseDirection = this.getReverseDirection(newDirection);
        const targetRoom = this.rooms.find(r => `${String(r.zoneId).padStart(3, '0')}:${String(r.roomId).padStart(3, '0')}` === newTarget);
        if (targetRoom) {
            targetRoom.exits[reverseDirection] = `${String(room.zoneId).padStart(3, '0')}:${String(room.roomId).padStart(3, '0')}`;
        }

        this.showEditForm(room);
    }

    closeEditForm() {
        const slideOutForm = document.getElementById('slideOutForm');
        slideOutForm.classList.remove('visible');
        slideOutForm.classList.add('hidden');
        slideOutForm.innerHTML = ''; // Clear form content
    }

    getReverseDirection(direction) {
        const reverseMap = {
            north: 'south',
            south: 'north',
            east: 'west',
            west: 'east',
            up: 'down',
            down: 'up',
            northeast: 'southwest',
            southwest: 'northeast',
            northwest: 'southeast',
            southeast: 'northwest'
        };
        return reverseMap[direction];
    }

    saveRoom(room) {
        room.name = document.getElementById('roomName').value;
        room.description = document.getElementById('roomDescription').value;
        room.lockable = document.getElementById('roomLockable').checked;
        room.locked = document.getElementById('roomLocked').checked;
        room.temporary = document.getElementById('roomTemporary').checked;
        room.solo = document.getElementById('roomSolo').checked || false;  // Default to false
        room.creator = document.getElementById('roomCreator').value;
        room.owner = document.getElementById('roomOwner').value;

        this.drawGrid(); // Redraw the grid to reflect changes
        this.closeEditForm();
    }

    closeEditForm() {
        const slideOutForm = document.getElementById('slideOutForm');
        slideOutForm.classList.remove('visible');
        slideOutForm.classList.add('hidden');
        slideOutForm.innerHTML = ''; // Clear form content
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
            this.rooms.splice(roomIndex, 1);
            this.drawGrid(); // Redraw the grid to reflect changes
        }
    }

    setupToolEventListeners() {
        document.getElementById('roomShape').addEventListener('click', () => this.selectTool('room'));
        document.getElementById('pointerIcon').addEventListener('click', () => this.selectTool(null));
        document.getElementById('eraserIconContainer').addEventListener('click', () => this.selectTool('eraser'));
        document.getElementById('penIconContainer').addEventListener('click', () => this.selectTool('edit'));
    }

    setupZoomEventListener() {
        stage.on('wheel', (e) => this.handleZoom(e));
    }

    handleZoom(e) {
        e.evt.preventDefault();

        const oldScale = this.scale;
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - this.offsetX) / oldScale,
            y: (pointer.y - this.offsetY) / oldScale,
        };

        const newScale = e.evt.deltaY > 0 ? oldScale * 1.05 : oldScale * (1 / 1.05);
        this.scale = newScale;

        this.offsetX = pointer.x - mousePointTo.x * newScale;
        this.offsetY = pointer.y - mousePointTo.y * newScale;

        this.drawGrid();
    }

    setupMouseMoveListener() {
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    handleMouseMove(x, y) {
        this.mouseX = x;
        this.mouseY = y;

        if (this.isDrawing && this.selectedTool === 'room') {
            this.updateTemporaryRoom(x, y);
        } else if (this.isPanning) {
            this.panMove(x, y);
        } else {
            this.drawGrid(); // Redraw the grid to clear previous highlights
            this.highlightMouseSquare();
        }
        this.updateInfo(x, y);
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
            const rect = new Konva.Rect({
                x: this.temporaryRoomX * 20 * this.scale + this.offsetX,
                y: this.temporaryRoomY * 20 * this.scale + this.offsetY,
                width: 20 * this.scale,
                height: 20 * this.scale,
                fill: 'rgba(0, 255, 0, 0.5)',
            });

            layer.add(rect);
            layer.draw();
        }
    }

    updateAllRoomZoneIds(newZoneId) {
        this.rooms.forEach(room => {
            room.zoneId = newZoneId;
        });
    }

    drawConnections() {
        for (let room of this.rooms) {
            const sourceId = `${String(room.zoneId).padStart(3, '0')}:${String(room.roomId).padStart(3, '0')}`;
            Object.entries(room.exits).forEach(([direction, targetId]) => {
                const targetRoom = this.rooms.find(r => `${String(r.zoneId).padStart(3, '0')}:${String(r.roomId).padStart(3, '0')}` === targetId);
                if (targetRoom) {
                    const reverseDirection = this.getReverseDirection(direction);
                    const reciprocal = targetRoom.exits[reverseDirection] === sourceId;
                    let color = reciprocal ? 'green' : 'yellow';
                    if (sourceId === targetId) color = 'red';

                    const line = new Konva.Line({
                        points: this.getLinePoints(room, targetRoom, direction),
                        stroke: color,
                        strokeWidth: 2,
                        lineCap: 'round',
                        lineJoin: 'round',
                    });
                    layer.add(line);
                }
            });
        }
        layer.draw();
    }

    getLinePoints(sourceRoom, targetRoom, direction) {
        const sourceX = sourceRoom.rect.x() + sourceRoom.rect.width() / 2;
        const sourceY = sourceRoom.rect.y() + sourceRoom.rect.height() / 2;
        const targetX = targetRoom.rect.x() + targetRoom.rect.width() / 2;
        const targetY = targetRoom.rect.y() + targetRoom.rect.height() / 2;

        // Adjust points based on direction
        switch (direction) {
            case 'north':
                return [sourceX, sourceY - 30, targetX, targetY + 30];
            case 'south':
                return [sourceX, sourceY + 30, targetX, targetY - 30];
            case 'east':
                return [sourceX + 30, sourceY, targetX - 30, targetY];
            case 'west':
                return [sourceX - 30, sourceY, targetX + 30, targetY];
            case 'northeast':
                return [sourceX + 30, sourceY - 30, targetX - 30, targetY + 30];
            case 'northwest':
                return [sourceX - 30, sourceY - 30, targetX + 30, targetY + 30];
            case 'southeast':
                return [sourceX + 30, sourceY + 30, targetX - 30, targetY - 30];
            case 'southwest':
                return [sourceX - 30, sourceY + 30, targetX + 30, targetY - 30];
            default:
                return [sourceX, sourceY, targetX, targetY];
        }
    }

}

// Initialize Konva
const stage = new Konva.Stage({
    container: 'konva-container', // Use the ID of your Konva div container
    width: window.innerWidth,
    height: window.innerHeight,
});

const layer = new Konva.Layer();
stage.add(layer);

// let canvas = document.getElementById('canvas');
// let ctx = canvas.getContext('2d');

// canvas.width = window.innerWidth;
// canvas.height = window.innerHeight;

// Other initialization code
const totalGridSquares = 1000;
const scale = 0.5;

const grid = new Grid(totalGridSquares, scale);
grid.initializeGrid();

// Handle window resize
window.addEventListener('resize', () => grid.handleResize());

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
        grid.updateAllRoomZoneIds(zoneIdValue);
        grid.zoneId = zoneIdValue;
        grid.drawGrid(); // Redraw the grid to reflect the updated zone IDs
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

function jsonRooms() {
    if (typeof grid !== 'undefined') {
        console.log(JSON.stringify(grid.rooms, null, 2));
    } else {
        console.error('Grid is not defined');
    }
}