# Monitoring Dashboard Web UI

This Web UI is intended to provide a dashboard for monitoring real-time state of fleets. The UI is optimized for iPad and PC.

## Developer note
TENTATIVE

This monitoring UI is implemented using Angular2 with typescript. It requires build process to work with browser.
To support various scenario describes in the section below, the Web UI is provided as an npm package named `iota-driving-analyzer-webclient`.


### development scenarios

NOTE: **Windows** developers are recommended to install the following packages to avoid `PATH` issues.
- `npm install typescript -g`
- `npm install typings -g`

#### Client development

##### using mock object

1. Move to `./webclient`, then run `npm install` to install toolings
1. Run `npm start`, which does the following things
 - `*.ts` files are transpiled to javascript
 - typescript compilers runs in watch mode so as to capture \*.ts file changes
 - *lite-server* starts and the `webclient/index.html` (TBD) is opened in your browser
 - **TOBE** *lite-server* starts and the `webclient/index-mock.html` is opened in your browser as in `webclient/mock-bs-config.js`
1. Modify client code in your editor, then save
 - The change is automatically transpiled to javascript, and browser is reloaded automatically

This is all the same to the [Angular 2 Quickstart](https://angular.io/docs/ts/latest/quickstart.html) and see it for the details.

**Hint:** You may want to use Chrome Devleoper Tool and its *Add folder to workspace* menu.

##### using local server

1. Run `npm install`
  - This installs server pre-req packages
1. Move to `./webclient`, then run `npm install` to install toolings
1. **TODO: insert step to change client's target from mock to real server**
1. Run `npm start`
  - please find the step 2 of the *using mock object*

#### Server development

1. Run `npm install`
  - NPM installs this package `iota-driving-analyzer-webclient` as one of the dependencies to under the `node_modules` folder without *devDependencies*
1. Start the server `app.js`
  - The server provides resources under `node_modules/iota-driving-analyzer-webclient` as the content of `/webclient` (as implemented in `app.js`) when it runs in *development* mode (e.g. run from Nodeclipse)
1. Open https://localhost:3000/webclient to browse Web UI
  - All the contents are load from `node_modules/iota-driving-analyzer-webclient`

#### Production

1. Run `cf push`, behind the scene, CloudFoundty does:
  - Invokes a NodeJS buildpack and it invokes `npm install` with `NODE_ENV=production`, which installs this this package `iota-driving-analyzer-webclient` as one of the dependencies
    - This package is installed under `node_modules` without devDependencies
  - The Express server provides resources under `node_modules/iota-driving-analyzer-webclient` as the content of `/webclient` (same to the *Server development*)
  - **TOBE** The Express server provides resources under `node_modules/iota-driving-analyzer-webclient/dist` (TBD) as the content of `/webclient`
