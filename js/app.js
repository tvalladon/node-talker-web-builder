class Room {
    /**
     * Constructor for creating a new instance of a room.
     *
     * @param {number} gridX - The X coordinate of the room on the grid.
     * @param {number} gridY - The Y coordinate of the room on the grid.
     * @param {number} gridSize - The size of the room on the grid.
     * @param {string} roomId - The ID of the room.
     * @param {string} zoneId - The ID of the zone containing the room.
     */
    constructor(gridX, gridY, gridSize, roomId, zoneId) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.gridSize = gridSize;
        this.roomId = parseInt(roomId, 10); // Ensure roomId is stored as an integer
        this.zoneId = parseInt(zoneId, 10); // Ensure zoneId is stored as an integer
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

/**
 * Represents a grid for drawing rooms and connections.
 * @constructor
 * @param {number} totalGridSquares - The total number of squares in the grid.
 * @param {number} scale - The scale of the grid.
 */
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
        window.addEventListener('resize', () => this.handleResize());

        if(this.isDataInLocalStorage()) {
            this.loadFromLocalStorage();
            this.drawRooms();
        }
    }

    /**
     * Adds a new exit to the given room.
     *
     * @param {object} room - The room object to add the exit to.
     */
    addExit(room) {
        const directions = ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"];
        const roomOptions = this.rooms.map(r => {
            const roomId = String(r.roomId).padStart(3, '0');
            const zoneId = String(r.zoneId).padStart(3, '0');
            const roomName = r.name ? ` (${r.name})` : '';
            return `<option value="${zoneId}:${roomId}">${zoneId}:${roomId}${roomName}</option>`;
        }).join('');

        const newExitHtml = `<div class="exit-row new-exit">
            <select class="edit-direction">${directions.map(dir => `<option value="${dir}">${dir}</option>`).join('')}</select>
            <select class="edit-target">${roomOptions}</select>
            <span style="right: 0;position: absolute;margin-right: 20px;">
                <i class="fas fa-save save-exit"></i>
                <i class="fas fa-times cancel-edit"></i>            
            </span>
        </div>`;

        document.querySelector('#exitsPlaceholder').insertAdjacentHTML('beforeend', newExitHtml);

        const newExitRow = document.querySelector('.new-exit');
        newExitRow.querySelector('.save-exit').addEventListener('click', () => this.saveNewExit(newExitRow, room));
        newExitRow.querySelector('.cancel-edit').addEventListener('click', () => newExitRow.remove());
    }

    /**
     * Add a room to the list of rooms in the grid.
     *
     * @param {Object} room - The room object to be added.
     * @param {number} room.roomId - The unique identifier of the room.
     */
    addRoom(room) {
        room.roomId = this.generateRoomId();
        this.rooms.push(room);
        this.drawGrid();
        this.saveToLocalStorage();
    }

    /**
     * Calculates the offset in the x-axis based on the given parameters.
     *
     * @returns {number} The calculated x-axis offset.
     */
    calculateOffsetX() {
        return -this.scale * 20 * (this.totalGridSquares / 2 - stage.width() / (2 * 20 * this.scale));
    }

    /**
     * Calculates the offset on the Y-axis based on the current scale, grid squares, and stage height.
     *
     * @returns {number} The calculated offset on the Y-axis.
     */
    calculateOffsetY() {
        return -this.scale * 20 * (this.totalGridSquares / 2 - stage.height() / (2 * 20 * this.scale));
    }

    /**
     * Cancels editing and exits the edit mode.
     *
     * @param {HTMLElement} exitRow - The HTML element that represents the exit row.
     * @param {string} direction - The direction of the exit.
     * @param {string} target - The target of the exit.
     */
    cancelEditExit(exitRow, direction, target) {
        exitRow.innerHTML = `${direction} to ${target}
        <i class="fas fa-edit edit-exit"></i>
        <i class="fas fa-trash-alt delete-exit"></i>`;

        exitRow.querySelector('.edit-exit').addEventListener('click', (e) => this.editExit(e, room));
        exitRow.querySelector('.delete-exit').addEventListener('click', (e) => this.deleteExit(e, room));
    }

    /**
     * Closes the edit form. This method hides the edit form by removing the 'visible' class and adding the 'hidden' class to the element with the id 'slideOutForm'. It also clears the content of the form by setting the innerHTML to an empty string.
     *
     * @return {void} - This method does not return any value.
     */
    closeEditForm() {
        const slideOutForm = document.getElementById('slideOutForm');
        slideOutForm.classList.remove('visible');
        slideOutForm.classList.add('hidden');
        slideOutForm.innerHTML = ''; // Clear form content
        this.saveToLocalStorage();
    }

    /**
     * Deletes an exit from a room.
     *
     * @param {Event} e - The event object that triggered the delete operation.
     * @param {object} room - The room object from which the exit is to be deleted.
     * @returns {void}
     */
    deleteExit(e, room) {
        const exitRow = e.target.closest('.exit-row');
        const direction = exitRow.getAttribute('data-direction');

        delete room.exits[direction];

        this.showEditForm(room);
        this.saveToLocalStorage();
    }

    /**
     * Draws connections between rooms. This method iterates over each room and draws connections between them. It uses Konva.Line to draw lines
     * representing the connections based on each room's exits. The color of the line is determined by whether the connection
     * is reciprocal or not, and if the source and target rooms are the same.
     *
     * @returns {void} - This method does not return a value.
     */
    drawConnections() {
        for (let room of this.rooms) {
            const sourceId = `${String(room.zoneId).padStart(3, '0')}:${String(room.roomId).padStart(3, '0')}`;
            Object.entries(room.exits).forEach(([direction, targetId]) => {
                const targetRoom = this.rooms.find(r => `${String(r.zoneId).padStart(3, '0')}:${String(r.roomId).padStart(3, '0')}` === targetId);
                if (targetRoom) {
                    const reverseDirection = this.getReverseDirection(direction);
                    const reciprocal = targetRoom.exits[reverseDirection] === sourceId;
                    let color = reciprocal ? 'black' : 'yellow';
                    if (sourceId === targetId) color = 'red';

                    const line = new Konva.Line({
                        points: this.getLinePoints(room, targetRoom, direction),
                        stroke: color,
                        strokeWidth: 3 * this.scale, // Adjust line width based on scale
                        lineCap: 'round',
                        lineJoin: 'round',
                    });
                    layer.add(line);
                }
            });
        }
        layer.draw();
    }

    /**
     * Draws the background of the stage using a rectangle shape.
     * The background color is set to '#333' by default.
     */
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

    /**
     * Clears the Konva layer and redraws the grid, rooms, and connections.
     * If the drawing tool is set to 'room' and drawing is in progress,
     * highlights the temporary room. Otherwise, highlights the mouse square.
     *
     * @returns {void}
     */
    drawGrid() {
        layer.destroyChildren(); // Clear the Konva layer before redrawing

        this.drawBackground();
        this.drawGridLines();
        this.drawRooms();
        this.drawConnections();

        if (this.isDrawing && this.selectedTool === 'room') {
            this.highlightTemporaryRoom();
        } else if (!this.isDrawing && !this.isPanning) {
            this.highlightMouseSquare();
        }

        layer.batchDraw();
    }

    /**
     * Draws grid lines on the canvas.
     *
     * @returns {void}
     */
    drawGridLines() {
        let minGridX = Math.max(Math.floor((-this.offsetX) / (20 * this.scale)), 0);
        let maxGridX = Math.min(Math.ceil((stage.width() - this.offsetX) / (20 * this.scale)), this.totalGridSquares);
        let minGridY = Math.max(Math.floor((-this.offsetY) / (20 * this.scale)), 0);
        let maxGridY = Math.min(Math.ceil((stage.height() - this.offsetY) / (20 * this.scale)), this.totalGridSquares);

        for (let i = minGridX; i <= maxGridX; i++) {
            this.drawVerticalLine(i);
        }

        for (let j = minGridY; j <= maxGridY; j++) {
            this.drawHorizontalLine(j);
        }

        this.highlightCentralSquare();

        if (this.scale >= 10) {
            for (let i = minGridX; i <= maxGridX; i++) {
                for (let j = minGridY; j <= maxGridY; j++) {
                    this.drawLabels(i, j);
                }
            }
        }

        layer.batchDraw();
    }

    /**
     * Draws a horizontal line on the canvas.
     *
     * @param {number} j - The y-coordinate of the line.
     * @returns {void}
     */
    drawHorizontalLine(j) {
        let line = new Konva.Line({
            points: [
                this.offsetX, j * 20 * this.scale + this.offsetY,
                this.totalGridSquares * 20 * this.scale + this.offsetX, j * 20 * this.scale + this.offsetY
            ],
            stroke: '#444',
            strokeWidth: 1,
        });
        layer.add(line);
    }

    /**
     * Draws labels for a given position (i, j).
     *
     * @param {number} i - The x-coordinate of the position.
     * @param {number} j - The y-coordinate of the position.
     * @return {void}
     */
    drawLabels(i, j) {
        let text = new Konva.Text({
            x: (20 * i + 1) * this.scale + this.offsetX,
            y: (20 * j + 1) * this.scale + this.offsetY,
            text: `${i}, ${j}`,
            fontSize: .75 * this.scale, // Adjust font size based on scale
            fill: (i === 500 && j === 500) ? 'black' : 'rgba(100, 100, 100, 1)'
        });
        layer.add(text);
    }

    /**
     * Draws a room on the canvas with the given properties.
     *
     * @param {object} room - The room object containing the properties of the room.
     * @param {number} room.zoneId - The id of the zone the room belongs to.
     * @param {number} room.roomId - The id of the room.
     * @param {number} room.gridX - The x coordinate of the room on the grid.
     * @param {number} room.gridY - The y coordinate of the room on the grid.
     * @return {void}
     */
    drawRoom(room) {
        const roomId = `${String(room.zoneId).padStart(3, '0')}:${String(room.roomId).padStart(3, '0')}`;
        const roomName = `${room.name}`;
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
            x: room.gridX * 20 * this.scale + this.offsetX + (1.75 * this.scale),
            y: room.gridY * 20 * this.scale + this.offsetY + (1.75 * this.scale), // Center text vertically
            text: `${roomName ? '{ ' + roomName + ' } ' : ''}[${roomId}]\r\n${room.description}`,
            fontSize: 0.25 * this.scale, // Adjust font size to fit within the room
            width: 16.5 * this.scale,
            verticalAlign: 'middle', // Ensure text is centered vertically
            wrap: 'word', // Ensure word wrapping
        });

        layer.add(rect);
        layer.add(text);
        room.rect = rect;
        room.text = text;
    }

    /**
     * Draws all the rooms in the current state.
     */
    drawRooms() {
        for (let room of this.rooms) {
            this.drawRoom(room);
        }
        layer.draw();
    }

    /**
     * Draw a vertical line on the canvas.
     *
     * @param {number} i - The index of the line to be drawn.
     * @return {void}
     */
    drawVerticalLine(i) {
        let line = new Konva.Line({
            points: [
                i * 20 * this.scale + this.offsetX, this.offsetY,
                i * 20 * this.scale + this.offsetX, this.totalGridSquares * 20 * this.scale + this.offsetY
            ],
            stroke: '#444',
            strokeWidth: 1,
        });
        layer.add(line);
    }

    /**
     * Edit the exit of a room.
     *
     * @param {Event} e - The event object.
     * @param {Room} room - The room object.
     */
    editExit(e, room) {
        const exitRow = e.target.closest('.exit-row');
        const direction = exitRow.getAttribute('data-direction');
        const target = room.exits[direction];
        const directions = ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"];

        const roomOptions = this.rooms.map(r => {
            const roomId = String(r.roomId).padStart(3, '0');
            const zoneId = String(r.zoneId).padStart(3, '0');
            const roomName = r.name ? ` (${r.name})` : '';
            return `<option value="${zoneId}:${roomId}" ${zoneId}:${roomId} === target ? 'selected' : ''}>${zoneId}:${roomId}${roomName}</option>`;
        }).join('');

        const editHtml = `<select class="edit-direction">${directions.map(dir => `<option value="${dir}" ${dir === direction ? 'selected' : ''}>${dir}</option>`).join('')}</select>
        <select class="edit-target">${roomOptions}</select>
        <i class="fas fa-save save-exit"></i>
        <i class="fas fa-times cancel-edit"></i>`;

        exitRow.innerHTML = editHtml;

        exitRow.querySelector('.save-exit').addEventListener('click', () => this.saveExit(exitRow, room));
        exitRow.querySelector('.cancel-edit').addEventListener('click', () => this.cancelEditExit(exitRow, direction, target));

        this.saveToLocalStorage();
    }

    /**
     * Edits the room at the specified coordinates.
     *
     * @param {number} x - The x coordinate of the mouse click.
     * @param {number} y - The y coordinate of the mouse click.
     * @return {void} - There is no return value.
     */
    editRoom(x, y) {
        let gridX = Math.floor((x - this.offsetX) / (20 * this.scale));
        let gridY = Math.floor((y - this.offsetY) / (20 * this.scale));

        let room = this.rooms.find(room => room.gridX === gridX && room.gridY === gridY);
        if (room) {
            this.showEditForm(room);
        }
    }

    /**
     * Erases a room at the given coordinates.
     *
     * @param {number} x - The X coordinate of the room.
     * @param {number} y - The Y coordinate of the room.
     * @return {void}
     */
    eraseRoom(x, y) {
        let roomX = Math.floor((x - this.offsetX) / (20 * this.scale));
        let roomY = Math.floor((y - this.offsetY) / (20 * this.scale));
        let roomIndex = this.rooms.findIndex(room => room.gridX === roomX && room.gridY === roomY);
        if (roomIndex > -1) {
            // Get the roomId and zoneId
            const roomId = this.rooms[roomIndex].roomId;
            const zoneId = this.rooms[roomIndex].roomId;

            // Remove any exits that point to this room
            this.rooms.forEach(room => {
                Object.keys(room.exits).forEach(exit => {
                    if (room.exits[exit] === `${zeroPad(zoneId, 3)}:${zeroPad(roomId, 3)}`) {
                        delete room.exits[exit];
                    }
                });
            });

            this.rooms.splice(roomIndex, 1);
            this.drawGrid(); // Redraw the grid to reflect changes
            this.saveToLocalStorage();
        }
    }

    /**
     * Generates a unique room ID for a new room.
     * The generated room ID is a number that is not already present in the existing room IDs.
     *
     * @returns {number} A unique room ID for a new room.
     */
    generateRoomId() {
        let roomIds = this.rooms.map(room => room.roomId);
        for (let i = this.startingRoomId; i <= this.currentRoomId; i++) {
            if (!roomIds.includes(i)) {
                return i;
            }
        }
        return ++this.currentRoomId;
    }

    /**
     * Returns the highlight color based on the selected tool.
     *
     * @return {string} The RGBA color value in the format 'rgba(r, g, b, a)'.
     */
    getHighlightColor() {
        switch (this.selectedTool) {
            case 'eraser':
                return 'rgba(255, 0, 0, 0.5)';
            case 'room':
                return 'rgba(0, 255, 0, 0.5)';
            case 'edit':
                return 'rgba(0, 0, 255, 0.5)';
            case 'pan':
                return 'rgba(255, 255, 0, 0.5)';
        }
    }

    /**
     * Retrieves the line points based on the source room, target room, and direction.
     *
     * @param {Room} sourceRoom - The source room object.
     * @param {Room} targetRoom - The target room object.
     * @param {string} direction - The direction of the line.
     * @returns {Array<number>} - The array containing the line points [sourceX, sourceY, targetX, targetY].
     */
    getLinePoints(sourceRoom, targetRoom, direction) {
        const sourceX = sourceRoom.gridX * 20 * this.scale + this.offsetX + 10 * this.scale;
        const sourceY = sourceRoom.gridY * 20 * this.scale + this.offsetY + 10 * this.scale;
        const targetX = targetRoom.gridX * 20 * this.scale + this.offsetX + 10 * this.scale;
        const targetY = targetRoom.gridY * 20 * this.scale + this.offsetY + 10 * this.scale;

        let adjustment = 10 * this.scale; // Adjust for room size

        switch (direction) {
            case 'north':
                return [sourceX, sourceY - adjustment, targetX, targetY + adjustment];
            case 'south':
                return [sourceX, sourceY + adjustment, targetX, targetY - adjustment];
            case 'east':
                return [sourceX + adjustment, sourceY, targetX - adjustment, targetY];
            case 'west':
                return [sourceX - adjustment, sourceY, targetX + adjustment, targetY];
            case 'northeast':
                return [sourceX + adjustment, sourceY - adjustment, targetX - adjustment, targetY + adjustment];
            case 'northwest':
                return [sourceX - adjustment, sourceY - adjustment, targetX + adjustment, targetY + adjustment];
            case 'southeast':
                return [sourceX + adjustment, sourceY + adjustment, targetX - adjustment, targetY - adjustment];
            case 'southwest':
                return [sourceX - adjustment, sourceY + adjustment, targetX + adjustment, targetY - adjustment];
            default:
                return [sourceX, sourceY, targetX, targetY];
        }
    }

    /**
     * Retrieves the reverse direction of the given direction.
     *
     * @param {string} direction - The direction to retrieve the reverse direction for.
     * @return {string} - The reverse direction of the given direction.
     */
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

    /**
     * Handles the keydown event.
     *
     * @param {Event} e - The keydown event object.
     * @return {void}
     */
    handleKeydown(e) {
        if (this.isEditFormOpen()) {
            return; // If the edit form is open, do nothing
        }

        switch (e.key) {
            case ' ':
                if (this.scale >= 30) {
                    this.zoomToMouse(1);
                } else {
                    this.zoomToMouse(30);
                }
                this.drawGrid();
                break;
            case 'Escape':
                this.selectTool('pan');
                break;
            case 'Tab':
                e.preventDefault();
                switch (this.selectedTool) {
                    case 'pan':
                        this.selectTool('room');
                        break;
                    case 'room':
                        this.selectTool('edit');
                        break;
                    case 'edit':
                        this.selectTool('eraser');
                        break;
                    case 'eraser':
                        this.selectTool("pan");
                        break;
                }
                break;
        }
    }

    /**
     * Handles the mouse down event.
     *
     * @param {number} x - The x-coordinate of the mouse event.
     * @param {number} y - The y-coordinate of the mouse event.
     * @return {void}
     */
    handleMouseDown(x, y) {
        switch (this.selectedTool) {
            case 'room':
                this.startDrawing(x, y);
                break;
            case 'eraser':
                this.eraseRoom(x, y);
                break;
            case 'edit':
                this.editRoom(x, y);
                break;
            case 'pan':
                this.panStart(x, y);
                break;
        }
    }

    /**
     * Handles the mouse up event and performs necessary actions based on the current state of the drawing tool and panning.
     * If the drawing tool is set to 'room' and the user is currently drawing, a new room is created at the mouse position.
     * If the room already exists at the mouse position, no action is performed.
     * If the drawing tool is not set to 'room' or the user is not currently drawing, the method checks if the user is panning.
     * If the user is panning, the panEnd() method is called to finalize the panning action.
     * Finally, the grid is redrawn to update the view.
     *
     * @returns {void}
     */
    handleMouseUp() {
        if (this.isDrawing && this.selectedTool === 'room') {
            let gridX = this.temporaryRoomX;
            let gridY = this.temporaryRoomY;

            let existingRoom = this.rooms.find(room => room.gridX === gridX && room.gridY === gridY);
            if (!existingRoom) {
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

    /**
     * Handles the resize event of the window.
     * Adjusts the stage size and recalculates the offset and redraws the grid.
     *
     * @returns {void}
     */
    handleResize() {
        stage.width(window.innerWidth);
        stage.height(window.innerHeight);
        this.offsetX = this.calculateOffsetX();
        this.offsetY = this.calculateOffsetY();
        this.drawGrid();
    }

    /**
     * Handles the zoom functionality based on the given mouse event.
     * Prevents the default behavior of the event to support zooming.
     * Calculates the new scale factor based on the delta value of the event.
     * Updates the scale factor, offsetX, offsetY values accordingly.
     * Triggers the redraw of the grid.
     *
     * @param {Event} e - The mouse event object.
     * @return {void}
     */
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

    /**
     * Highlights the central square if there is no room at the specified coordinates.
     * The central square is represented by a rectangle with specified dimensions and style.
     *
     * @returns {void}
     */
    highlightCentralSquare() {
        if (!this.isRoomAt(500, 500)) {
            let rect = new Konva.Rect({
                x: 500 * 20 * this.scale + this.offsetX,
                y: 500 * 20 * this.scale + this.offsetY,
                width: 20 * this.scale,
                height: 20 * this.scale,
                fill: 'rgba(100, 100, 100, 1)',
            });
            layer.add(rect);
        }
    }

    /**
     * Handles the mouse move event.
     *
     * @param {MouseEvent} event - The mouse move event.
     * @return {undefined}
     */
    handleMouseMove(event) {
        const pos = stage.getPointerPosition();
        this.mouseX = pos.x;
        this.mouseY = pos.y;

        if (this.isDrawing && this.selectedTool === 'room') {
            this.updateTemporaryRoom(pos.x, pos.y);
        } else if (this.isPanning) {
            this.panMove(pos.x, pos.y);
        } else {
            this.drawGrid(); // Redraw the grid to clear previous highlights
            this.highlightMouseSquare();
        }
        this.updateInfo(pos.x, pos.y);
    }

    /**
     * Clears previous highlights and highlights the square on which the mouse is currently positioned.
     * Uses Konva library to draw a rectangle highlighting the square.
     *
     * @returns {void}
     */
    highlightMouseSquare() {
        layer.find('.highlight').forEach(node => node.destroy()); // Clear previous highlights

        let highlightX = Math.floor((this.mouseX - this.offsetX) / (20 * this.scale));
        let highlightY = Math.floor((this.mouseY - this.offsetY) / (20 * this.scale));

        if (highlightX >= 0 && highlightX < this.totalGridSquares && highlightY >= 0 && highlightY < this.totalGridSquares) {
            const rect = new Konva.Rect({
                x: highlightX * 20 * this.scale + this.offsetX,
                y: highlightY * 20 * this.scale + this.offsetY,
                width: 20 * this.scale,
                height: 20 * this.scale,
                fill: this.getHighlightColor(),
                name: 'highlight' // Tagging the rectangle for easy removal later
            });

            layer.add(rect);
            layer.batchDraw();
        }
    }

    /**
     * Highlights the temporary room on the canvas if the selected tool is 'room'.
     *
     * @returns {void}
     */
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

    /**
     * Initializes the grid with the specified zone id, scale, offset X and offset Y.
     * It also draws the grid.
     *
     * @return {void}
     */
    initializeGrid() {
        this.zoneId = document.getElementById('zoneId').value;
        this.scale = 1;
        this.offsetX = this.calculateOffsetX();
        this.offsetY = this.calculateOffsetY();
        this.drawGrid();
    }

    /**
     * Checks if the data is stored in the browser's local storage.
     *
     * @returns {boolean} - Returns true if the data ('rooms') is stored in the local storage, otherwise false.
     */
    isDataInLocalStorage() {
        return localStorage.getItem('rooms') !== null;
    }

    /**
     * Checks if the edit form is open.
     *
     * @returns {boolean} True if the edit form is open, false otherwise.
     */
    isEditFormOpen() {
        const slideOutForm = document.getElementById('slideOutForm');
        return slideOutForm && slideOutForm.classList.contains('visible');
    }

    /**
     * Checks if there is a room at the specified grid coordinates.
     *
     * @param {number} gridX - The X-coordinate of the grid.
     * @param {number} gridY - The Y-coordinate of the grid.
     * @returns {boolean} - Returns true if there is a room at the specified grid coordinates, false otherwise.
     */
    isRoomAt(gridX, gridY) {
        return this.rooms.some(room => room.gridX === gridX && room.gridY === gridY);
    }

    /**
     * Retrieves rooms data from local storage and assigns it to the `this.rooms` property.
     * If no data is found in local storage, an empty array is assigned to `this.rooms`.
     *
     * @return {void}
     */
    loadFromLocalStorage() {
        this.rooms = JSON.parse(localStorage.getItem('rooms')) || [];
    }

    /**
     * Stops panning.
     *
     * @returns {void} No return value.
     */
    panEnd() {
        this.isPanning = false;
    }

    /**
     * Moves the pan based on the given x and y coordinates, if panning is enabled.
     *
     * @param {number} x - The x coordinate.
     * @param {number} y - The y coordinate.
     * @return {void}
     */
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

    /**
     * Marks the start of a panning action.
     *
     * @param {number} x - The X coordinate where the panning action starts.
     * @param {number} y - The Y coordinate where the panning action starts.
     *
     * @return {void}
     */
    panStart(x, y) {
        this.isPanning = true;
        this.startPanX = x;
        this.startPanY = y;
    }

    /**
     * Removes a room from the list of rooms and redraws the grid.
     *
     * @param {number} index - The index of the room to be removed.
     * @return {void} - This method does not return any value.
     */
    removeRoom(index) {
        this.rooms.splice(index, 1);
        this.drawGrid();
        this.saveToLocalStorage();
    }

    /**
     * Resets the offset values of the object.
     */
    resetOffset() {
        this.offsetX = this.calculateOffsetX();
        this.offsetY = this.calculateOffsetY();
    }

    /**
     * Saves and updates the exit details for a room.
     *
     * @param {Element} exitRow - The HTML element representing the exit row to be saved.
     * @param {Object} room - The room object to update the exit details for.
     * @return {void}
     */
    saveExit(exitRow, room) {
        const newDirection = exitRow.querySelector('.edit-direction').value;
        const newTarget = exitRow.querySelector('.edit-target').value;
        const oldDirection = exitRow.getAttribute('data-direction');

        delete room.exits[oldDirection];
        room.exits[newDirection] = newTarget;

        const reverseDirection = this.getReverseDirection(newDirection);
        const targetRoom = this.rooms.find(r => `${String(r.zoneId).padStart(3, '0')}:${String(r.roomId).padStart(3, '0')}` === newTarget);
        if (targetRoom) {
            targetRoom.exits[reverseDirection] = `${String(room.zoneId).padStart(3, '0')}:${String(room.roomId).padStart(3, '0')}`;
        }

        this.showEditForm(room);

        this.saveToLocalStorage();
    }

    /**
     * Saves a new exit for a given room.
     *
     * @param {Element} newExitRow - The HTML element representing the new exit row.
     * @param {Object} room - The room object to save the new exit to.
     * @return {void}
     */
    saveNewExit(newExitRow, room) {
        const newDirection = newExitRow.querySelector('.edit-direction').value;
        const newTarget = newExitRow.querySelector('.edit-target').value;

        room.exits[newDirection] = newTarget;

        const reverseDirection = this.getReverseDirection(newDirection);
        const targetRoom = this.rooms.find(r => `${String(r.zoneId).padStart(3, '0')}:${String(r.roomId).padStart(3, '0')}` === newTarget);
        if (targetRoom) {
            targetRoom.exits[reverseDirection] = `${String(room.zoneId).padStart(3, '0')}:${String(room.roomId).padStart(3, '0')}`;
        }

        this.showEditForm(room);

        this.saveToLocalStorage();
    }

    /**
     * Saves the changes made to the room.
     *
     * @param {Object} room - The room object to be saved.
     */
    saveRoom(room) {
        room.name = document.getElementById('roomName').value;
        room.description = document.getElementById('roomDescription').value;
        room.lockable = document.getElementById('roomLockable').checked;
        room.locked = document.getElementById('roomLocked').checked;
        room.temporary = document.getElementById('roomTemporary').checked;
        room.solo = document.getElementById('roomSolo').checked || false; // Default to false
        room.creator = document.getElementById('roomCreator').value;
        room.owner = document.getElementById('roomOwner').value;

        this.drawGrid(); // Redraw the grid to reflect changes
        this.closeEditForm();
        this.saveToLocalStorage();
    }

    /**
     * Saves the rooms data to the local storage.
     *
     * @returns {void} - This method does not return anything.
     */
    saveToLocalStorage() {
        localStorage.setItem('rooms', JSON.stringify(this.rooms));
    }

    /**
     * Selects a tool from the tool palette.
     *
     * @param {string} tool - The tool to be selected.
     *                        Supported values are 'room', 'eraser', 'edit', and any other tool.
     * @return {void}
     */
    selectTool(tool) {
        this.selectedTool = tool;

        const tools = document.querySelectorAll('#toolPallet div');
        tools.forEach(toolDiv => {
            toolDiv.classList.remove('active');
        });

        switch (tool) {
            case 'room':
                document.getElementById('roomShapeContainer').classList.add('active');
                break;
            case 'eraser':
                document.getElementById('eraserIconContainer').classList.add('active');
                break;
            case 'edit':
                document.getElementById('penIconContainer').classList.add('active');
                break;
            default:
                document.getElementById('pointerIconContainer').classList.add('active');
                break;
        }
    }

    /**
     * Sets up the event listeners for canvas interactions.
     *
     * @returns {void} This function does not return any value.
     */
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

    /**
     * Sets up event listeners for various actions within the application.
     *
     * @returns {void}
     */
    setupEventListeners() {
        this.setupKeyListener();
        this.setupToolEventListeners();
        this.setupZoomEventListener();
        this.setupMouseMoveListener();
        this.setupCanvasEventListeners();
    }

    /**
     * Sets up a key listener to handle keydown events.
     *
     * @param {function} handleKeydown - The function to be called when a keydown event is triggered.
     * @return {void}
     */
    setupKeyListener() {
        window.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    /**
     * Sets up a mouse move listener on the window object.
     *
     * @return {void}
     */
    setupMouseMoveListener() {
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    /**
     * Set up event listeners for tool icons.
     *
     * @function setupToolEventListeners
     * @returns {void}
     */
    setupToolEventListeners() {
        const roomShapeContainer = document.getElementById('roomShapeContainer');
        const pointerIconContainer = document.getElementById('pointerIconContainer');
        const eraserIconContainer = document.getElementById('eraserIconContainer');
        const penIconContainer = document.getElementById('penIconContainer');
        const helpIconContainer = document.getElementById('helpIconContainer');

        if (roomShapeContainer) {
            roomShapeContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTool('room');
            });
        }

        if (pointerIconContainer) {
            pointerIconContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTool('pan');
            });
        }

        if (eraserIconContainer) {
            eraserIconContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTool('eraser');
            });
        }

        if (penIconContainer) {
            penIconContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTool('edit');
            });
        }

        if (helpIconContainer) {
            helpIconContainer.addEventListener('click', (e) => {
                e.stopPropagation();

            });
        }
    }

    /**
     * Sets up the zoom event listener on the stage.
     *
     * @returns {undefined}
     */
    setupZoomEventListener() {
        stage.on('wheel', (e) => this.handleZoom(e));
    }

    /**
     * Displays the edit form for a given room.
     *
     * @param {Object} room - The room object to edit.
     */
    showEditForm(room) {
        const directions = ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"];
        const formattedZoneId = String(room.zoneId).padStart(3, '0');
        const formattedRoomId = String(room.roomId).padStart(3, '0');

        let exitsHtml = '';
        for (let [direction, target] of Object.entries(room.exits)) {
            exitsHtml += `
            <div class="exit-row" data-direction="${direction}">
                ${direction} to ${target} 
                    <span style="right: 0;position: absolute;margin-right: 20px;">
                        <i class="fas fa-edit edit-exit"></i> 
                    <i class="fas fa-trash-alt delete-exit"></i>
                </span>
            </div>`;
        }
        if (Object.keys(room.exits).length < 10) {
            exitsHtml += `<span class="exit-row add-exit"><i class="fas fa-plus"></i></span>`;
        }

        const formHtml = `
        <div id="editFormContent">
            <div>
                <button id="saveRoom">Save</button>
                <button id="cancelEdit" style="position: absolute;right: 0;">Cancel</button>            
            </div>
            <b>Edit Room: ${formattedZoneId}:${formattedRoomId}</b>
            <label for="roomName">Name:</label>
            <input type="text" id="roomName" value="${room.name}">
            <label for="roomDescription">Description:</label>
            <textarea id="roomDescription" style="min-width: 100%;">${room.description}</textarea>
            <div>
                <input type="checkbox" id="roomLockable" ${room.lockable ? 'checked' : ''}>
                <label for="roomLockable">Lockable</label>
            </div>
            <div>
                <input type="checkbox" id="roomLocked" ${room.locked ? 'checked' : ''}>
                <label for="roomLocked">Locked</label>            
            </div>
            <div>
                <input type="checkbox" id="roomTemporary" ${room.temporary ? 'checked' : ''}>
                <label for="roomTemporary">Temporary</label>
            </div>
            <div>
                <input type="checkbox" id="roomSolo" ${room.solo ? 'checked' : ''}>
                <label for="roomSolo">Solo</label>            
            </div>
            <label for="roomCreator">Creator:</label>
            <input type="text" id="roomCreator" value="${room.creator}">
            <label for="roomOwner">Owner:</label>
            <input type="text" id="roomOwner" value="${room.owner}">
            <div id="exitsPlaceholder"><b></b>Exits</b> ${exitsHtml}</div>
            <div id="whitelistPlaceholder">Whitelist: <em>Placeholder for whitelist</em></div>
            <div id="propsPlaceholder">Props: <em>Placeholder for props</em></div>
        </div>`;

        const slideOutForm = document.getElementById('slideOutForm');
        slideOutForm.innerHTML = formHtml;
        slideOutForm.classList.remove('hidden');
        slideOutForm.classList.add('visible');

        document.getElementById('saveRoom').addEventListener('click', () => this.saveRoom(room));
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeEditForm());

        document.querySelectorAll('.edit-exit').forEach(el => el.addEventListener('click', (e) => this.editExit(e, room)));
        document.querySelectorAll('.delete-exit').forEach(el => el.addEventListener('click', (e) => this.deleteExit(e, room)));
        document.querySelector('.add-exit').addEventListener('click', () => this.addExit(room));
    }

    /**
     * Start the drawing process.
     *
     * @param {number} x - The x-coordinate of the starting point.
     * @param {number} y - The y-coordinate of the starting point.
     * @return {void}
     */
    startDrawing(x, y) {
        this.isDrawing = true;
        this.initialDrawX = x;
        this.initialDrawY = y;
        this.temporaryRoomX = Math.floor((x - this.offsetX) / (20 * this.scale));
        this.temporaryRoomY = Math.floor((y - this.offsetY) / (20 * this.scale));
        this.highlightTemporaryRoom();
    }

    /**
     * Updates all room exit zone IDs with the provided new zone ID.
     *
     * @param {string} newZoneId - The new zone ID to replace the existing zone IDs.
     * @return {void}
     */
    updateAllRoomExitZoneIds(newZoneId) {
        this.rooms.forEach(room => {
            Object.keys(room.exits).forEach(exit => {
                let oldExitValue = room.exits[exit];
                // Break down the exit value (e.g. "002:001" becomes ["002", "001"])
                let [oldZone, roomId] = oldExitValue.split(':');
                // Build a new value (e.g. ["069", "001"] becomes "069:001")
                room.exits[exit] = `${zeroPad(newZoneId, 3)}:${roomId}`;
            });
        });

        this.saveToLocalStorage();
    }

    /**
     * Updates the zone ID for all rooms.
     *
     * @param {string} newZoneId - The new zone ID to be assigned to all rooms.
     */
    updateAllRoomZoneIds(newZoneId) {
        this.rooms.forEach(room => {
            room.zoneId = newZoneId;
        });
    }

    /**
     * Updates the information displayed in the 'info' element based on the provided coordinates.
     *
     * @param {number} x - The X coordinate.
     * @param {number} y - The Y coordinate.
     * @return {undefined}
     */
    updateInfo(x, y) {
        let gridX = Math.floor((x - this.offsetX) / (20 * this.scale));
        let gridY = Math.floor((y - this.offsetY) / (20 * this.scale));
        document.getElementById('info').textContent = `X ${gridX} Y ${gridY}`;// s:${this.scale.toFixed(2)}`;
    }

    /**
     * Updates the offset values by adding the provided dx and dy values to the current offsetX and offsetY values.
     *
     * @param {number} dx - The value to be added to the current offsetX.
     * @param {number} dy - The value to be added to the current offsetY.
     * @return {undefined}
     */
    updateOffset(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
    }

    /**
     * Updates the temporary room position and triggers necessary actions.
     *
     * @param {number} x - The x-coordinate of the new position.
     * @param {number} y - The y-coordinate of the new position.
     * @returns {void}
     */
    updateTemporaryRoom(x, y) {
        this.temporaryRoomX = Math.floor((x - this.offsetX) / (20 * this.scale));
        this.temporaryRoomY = Math.floor((y - this.offsetY) / (20 * this.scale));
        this.drawGrid();
        this.highlightTemporaryRoom();
    }

    /**
     * Adjusts the scale of the grid based on the delta of the Y coordinate.
     *
     * @param {number} deltaY - The change in the Y coordinate (mouse wheel or similar input).
     */
    zoom(deltaY) {
        let oldScale = this.scale;
        this.scale *= Math.pow(1.01, -deltaY / 100);

        let mouseGridX = (this.mouseX - this.offsetX) / oldScale;
        let mouseGridY = (this.mouseY - this.offsetY) / oldScale;

        this.offsetX = this.mouseX - mouseGridX * this.scale;
        this.offsetY = this.mouseY - mouseGridY * this.scale;

        this.drawGrid();
    }

    /**
     * Zooms the stage to the mouse position.
     *
     * @param {number} targetScale - The target scale to zoom to.
     * @return {void}
     */
    zoomToMouse(targetScale) {
        const oldScale = this.scale;
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - this.offsetX) / oldScale,
            y: (pointer.y - this.offsetY) / oldScale,
        };

        this.scale = targetScale;

        this.offsetX = pointer.x - mousePointTo.x * this.scale;
        this.offsetY = pointer.y - mousePointTo.y * this.scale;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const helpModal = document.getElementById("helpModal");
    const helpIcon = document.getElementById("helpIcon");
    const closeModal = document.getElementsByClassName("close")[0];

    // When the user clicks the help icon, open the modal
    helpIcon.onclick = function () {
        helpModal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    closeModal.onclick = function () {
        helpModal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == helpModal) {
            helpModal.style.display = "none";
        }
    }
});

document.getElementById('startingRoomId').addEventListener('change', function () {
    changeRoomId(this);
    grid.startingRoomId = parseInt(this.value, 10); // Update grid startingRoomId as an integer
});

let debounceTimer;

document.getElementById('zoneId').addEventListener('change', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        changeZoneId(this);
        grid.zoneId = parseInt(this.value, 10); // Update grid zoneId as an integer
        grid.drawGrid();
    }, 300); // delay in milliseconds
});

// Initialize Konva
const stage = new Konva.Stage({
    container: 'konva-container', // Use the ID of your Konva div container
    width: window.innerWidth,
    height: window.innerHeight,
});

const layer = new Konva.Layer();
stage.add(layer);

// Other initialization code
const totalGridSquares = 1000;
const scale = 0.5;

const grid = new Grid(totalGridSquares, scale);
grid.initializeGrid();

// Handle window resize
window.addEventListener('resize', () => grid.handleResize());

// Set the pan too to the selected tool on load
grid.selectTool('pan');

/**
 * Changes the room ID value of an input field.
 *
 * @param {HTMLElement} input - The input field element to change the room ID value for.
 *
 * @return {void} - This method does not return a value.
 */
const changeRoomId = (input) => {
    let roomIdValue = parseInt(input.value, 10);
    if (isNaN(roomIdValue) || roomIdValue > 999 || roomIdValue < -999) {
        input.setCustomValidity("Invalid field.");
    } else {
        input.setCustomValidity("");
        input.value = zeroPad(roomIdValue, 3);
    }
};

/**
 * Updates the zone ID for a given input field, and performs various additional actions if the zone ID is valid.
 *
 * @param {HTMLInputElement} input - The input field to update the zone ID for.
 * @return {void}
 */
const changeZoneId = (input) => {
    let zoneIdValue = parseInt(input.value, 10);
    if (isNaN(zoneIdValue) || zoneIdValue > 999 || zoneIdValue < -999) {
        input.setCustomValidity("Invalid field.");
    } else {
        input.setCustomValidity("");
        input.value = zeroPad(zoneIdValue, 3);
        grid.updateAllRoomZoneIds(zoneIdValue);
        grid.updateAllRoomExitZoneIds(zoneIdValue);
        grid.zoneId = zoneIdValue;
        grid.drawGrid(); // Redraw the grid to reflect the updated zone IDs
        grid.saveToLocalStorage();
    }
};

/**
 * Removes specified values from an array.
 *
 * @param {Array} array - The input array to be filtered.
 * @param {...*} values - The values to be excluded from the array.
 * @returns {Array} - A new array with the specified values removed.
 */
const exclude = (array, ...values) => {
    return array.filter(item => !values.includes(item));
};

/**
 * Logs the room information from the grid object.
 *
 * @return {undefined}
 */
const debugRooms = () => {
    if (typeof grid !== 'undefined') {
        console.log(grid.rooms);
    } else {
        console.log("Grid is not defined");
    }
};

/**
 * Retrieves JSON representation of rooms from the grid object.
 *
 * @return {void}
 */
const jsonRooms = () => {
    if (typeof grid !== 'undefined') {
        console.log(JSON.stringify(grid.rooms));
    } else {
        console.log("Grid is not defined");
    }
}


/**
 * Function to load a map from a JSON file.
 * The function creates an input element of type 'file' and accepts JSON files only.
 * On change of the input element, the function reads the selected file and attempts to parse it as JSON.
 * If successful, the function assigns the parsed data to the 'rooms' property of the 'grid' object and displays a success message.
 * If unable to parse the file as JSON, an error message is displayed.
 */
const loadMap = () => {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/map';

    input.onchange = (event) => {
        let file = event.target.files[0];
        let reader = new FileReader();

        reader.onload = (readerEvent) => {
            try {
                let data = JSON.parse(readerEvent.target.result);
                grid.rooms = data;
                if (grid.rooms[0].zoneId) {
                    document.getElementById("zoneId").value = zeroPad(grid.rooms[0].zoneId, 3);
                }
                grid.drawRooms();
            } catch (error) {
                alert("Error loading file: " + error.message);
            }
        };

        reader.readAsText(file);
    };

    input.click();
};

const newMap=()=>{
    grid.rooms = [];
    localStorage.clear();
    grid.drawGrid();
};

/**
 * Toggles the visibility of the menu by adding or removing the 'hidden' class.
 *
 * @return {undefined}
 */
const openMenu = () => {
    var menu = document.getElementById('expanded-menu');
    menu.classList.toggle('hidden');
};

/**
 * This function generates a zip file containing JSON files for each room in the grid.
 * It deep copies the grid.rooms data, removes unnecessary fields, and creates a JSON file for each room.
 * The generated zip file is then downloaded by creating a link element and clicking it.
 */
const processMap = () => {
    let zip = new JSZip();

    // Deep copy grid.rooms
    let roomsData = JSON.parse(JSON.stringify(grid.rooms));

    roomsData.forEach(room => {
        ['gridX', 'gridY', 'gridSize', 'rect', 'text'].forEach(key => delete room[key]);

        // Create a JSON file for each room and add it to the zip
        zip.file(`${zeroPad(room.zoneId, 3)}:${zeroPad(room.roomId, 3)}.json`, JSON.stringify(room));
    });

    zip.generateAsync({type: "blob"})
        .then(function (content) {
            // Create a link and click it to download the zip file
            let link = document.createElement('a');
            link.download = `${zeroPad(grid.rooms[0].zoneId, 3)}.zip`;
            link.href = URL.createObjectURL(content);
            link.click();
        });
};

/**
 * Saves the current rooms data to a file.
 * This function deep copies the room data from the global variable `grid`,
 * and saves it as a JSON file with a specified filename.
 *
 * If the `grid` variable is not defined, an error message is logged to the console.
 */
const saveMap = () => {
    if (typeof grid !== 'undefined') {
        // Deepcopy the room data
        let mapData = JSON.parse(JSON.stringify(grid.rooms));

        let data = JSON.stringify(mapData);
        let blob = new Blob([data], {type: 'application/json'});
        let url = URL.createObjectURL(blob);

        let link = document.createElement('a');
        link.download = `zone_${document.getElementById("zoneId").value}.map`;
        link.href = url;
        link.click();
    } else {
        alert("Grid is not defined");
    }
};

/**
 * Pads a number with leading zeros to a specified number of places.
 *
 * @param {number} num - The number to be padded.
 * @param {number} places - The number of places to pad to.
 * @return {string} - The padded number as a string.
 */
const zeroPad = (num, places) => {
    let absNum = Math.abs(num);
    let sign = num < 0 ? '-' : '';
    let zeroPadded = absNum.toString().padStart(places, '0');
    return sign + zeroPadded;
};