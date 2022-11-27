# DA
Compare laps/sessions and see where you lost/gained time based on GPS (and other sensors) data.

Data analysis tool similar to Starlane MAAT or AIM Race Studio (with probably a lot less functionality than these ATM).
Basic functionality for the start is to load GPS logs and display graphs based on it.




This is a minimal Electron application based on the [Quick Start Guide](https://electronjs.org/docs/latest/tutorial/quick-start) within the Electron documentation.

A basic Electron application needs just these files:

- `package.json` - Points to the app's main file and lists its details and dependencies.
- `main.js` - Starts the app and creates a browser window to render HTML. This is the app's **main process**.
- `index.html` - A web page to render. This is the app's **renderer process**.
- `preload.js` - A content script that runs before the renderer process loads.

You can learn more about each of these components in depth within the [Tutorial](https://electronjs.org/docs/latest/tutorial/tutorial-prerequisites).

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/DZvO/da
# Go into the repository
cd da
# Install dependencies
npm install
# Run the app
npm start
```


## License

[CC0 1.0 (Public Domain)](LICENSE.md)
