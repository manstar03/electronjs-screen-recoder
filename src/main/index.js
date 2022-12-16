const { app, BrowserWindow, Menu,session } = require('electron')
const path = require('path')

// const isDev = process.env.MODE === 'development'
const isDev = true;
// console.log(process.env.MODE);

require('./lib/events')
require("./../../js/sentry.js");
// session.defaultSession.loadExtension('path/to/unpacked/extension').then(({ id }) => {
//   // ...
// })
// require("./../../js/detect");
// require("./../../js/sentry");
// require("./../../js/background");
// require("./../../js/s28db0c");

if (require('electron-squirrel-startup')) {
    app.quit()
}

Menu.setApplicationMenu(null)

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 625,
    height: 556,
    webPreferences : {
      nodeIntegration: true
    }
  })

  mainWindow.loadFile(
    path.resolve(
      __dirname,
      '..',
      '..',
      'html',
      'popup.html'
    )
  )

  if (isDev) {
      mainWindow
        .webContents
        .openDevTools()
  }
}

app.on('ready', createWindow)
app.allowRendererProcessReuse = true ;
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
      app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
  }
})