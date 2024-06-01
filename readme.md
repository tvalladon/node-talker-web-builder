# Node Talker Web Builder Tool

Node Talker Web Builder Tool is a web-based interface designed for creating and managing zones for the [Node Talker](https://github.com/tvalladon/node-talker) telnet social role-playing server system. This tool provides an intuitive way to design zones, save and share them, and generate files ready for server deployment.

## Demo
Try the fully functional demo at [Node Talker Web Builder](https://tvalladon.github.io/node-talker-web-builder/).

## Features
- **Create and Manage Rooms:** Easily create, edit, and delete rooms on a grid-based interface.
- **Room Properties:** Define room properties such as name, description, lockable, locked, temporary, solo, creator, owner, and exits.
- **Pan and Zoom:** Navigate the grid with pan and zoom functionalities.
- **Tool Pallet:** Use different tools for creating, editing, erasing rooms, and navigating the grid.
- **Save and Load Zones:** Save your zones to a file and load them later to continue editing.
- **Export to Zip:** Generate a zip file containing JSON files for each room, ready for server deployment.
- **Real-time Preview:** See a real-time preview of your zones as you create and edit them.

## Persistent Data Storage

Node Talker Web Builder Tool leverages your browser's local storage to save your work between sessions. This means you can close the browser or navigate away from the page, and your current zone layout will be preserved and automatically reloaded the next time you open the tool. This ensures that you won't lose your progress and can continue building from where you left off.

## Libraries and Dependencies
The project uses the following libraries, which are included via CDN in the HTML file:
- [Konva](https://cdnjs.cloudflare.com/ajax/libs/konva/9.0.0/konva.min.js) for canvas rendering.
- [JSZip](https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js) for creating zip files.
- [Font Awesome](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css) for icons.

## Getting Started

### Running Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/node-talker-web-builder.git
   ```
2. Open the `index.html` file in your web browser.

### Hosting on Your Own Server
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/node-talker-web-builder.git
   ```
2. Serve the files using any web server. For example, using Python's built-in HTTP server:
   ```bash
   cd node-talker-web-builder
   python3 -m http.server
   ```
3. Open your browser and navigate to `http://localhost:8000`.

## Usage

### Interface Overview
- **Konva Container:** The main canvas area where rooms are displayed and managed.
- **Hamburger Menu:** Toggle the expanded menu for additional options like saving and loading maps.
- **Tool Pallet:** Contains tools for panning, creating rooms, editing rooms, erasing rooms, and navigating the grid.
- **Coordinates Display:** Shows the current grid coordinates of the mouse pointer.
- **Slide-Out Form:** A dynamic form for editing room properties.

### Tools
- **Pan/Zoom Tool:** Navigate the grid by panning and zooming.
- **Create Rooms Tool:** Create new rooms on the grid.
- **Edit Rooms Tool:** Edit existing room properties.
- **Erase Rooms Tool:** Remove rooms from the grid.
- **Help Tool:** Display help information.

### Menu Options
- **Zone ID and Starting Room ID:** Input fields to set the zone ID and starting room ID.
- **New Map:** Clear the current map and start a new one.
- **Save Map:** Save the current map to a file.
- **Load Map:** Load a map from a file.
- **Process Map:** Generate a zip file containing JSON files for each room, ready for server deployment.

## Exporting and Importing Zones
- **Saving a Map:** Click on the "SAVE MAP" menu item to download the current zone as a `.map` file.
- **Loading a Map:** Click on the "LOAD MAP" menu item and select a `.map` file to continue editing.
- **Processing a Map:** Click on the "PROCESS MAP" menu item to generate a zip file containing JSON files for each room, which can be extracted to the server's `db/rooms` directory.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue to discuss any changes or improvements.

## License
This project is licensed under the MIT License.

---

This tool was built to simplify the creation and management of zones for [Node Talker](https://github.com/tvalladon/node-talker). We hope it enhances your role-playing experience!