
### TODOs

* Revise OSSS versions
* Consider webpack



## Developers Note

### RxJS (ReactiveX)

Note that we are using RxJS 5.x (ReactiveX), which by default provides typescript definitions. It's due to Angular2 requirement. You'll see many results about old versions when you googles about RxJS and typescript, but they're obsoleted and not work!

### Typescript workaorunds

This section describes required workarounds around typescripts

#### OpenLayers

Issues and the workrounds for Openlayers.

`fromLonLat`
* The second parameter is optional, but mandatory in the typings
  * Workaround: always pass `undefined` as the second argument
  * Should be: make the second argument optional by adding `?`

`ol.style.RegularShape`
* Should inherit `Image`, but not
* Should take an options object in its constructor, but not
  * Workaround: call the constructor without typings
    * ERROR: `new ol.style.RegularShape({image: ...})`
    * WORKAROUND: `new (<any>ol.style.RegularShape)({image: ...})`
* No precise definitions of methods or properties
  * Workaround: always treat the object as `<any>`

### Deployment patterns

#### Local - light-server (for client development)

- Prepare development tools
  - `cd webclient && npm install` - install typescript, definitions, and dependencies
- Start local server
  - `npm start`
    - transpile `*.ts` files
    - start server at http://localhost:3123/
    - open http://localhost:3123/webclient in Web browser
- Server resources
  - The `./webclient` is mapped to `/webclient`
  - All the changes to \*.ts files are tracked and transpiled and they automatically refreshes browser
  - NOTE that when the client is hosted at port 3123, all the REST API invocations are redirected to port 3000.
- Start express server
  - set environment variables `APP_USER` and `APP_PASSWORD` to `none` so that the Angular2 pages hosted by the light-server can reach to the server REST APIs without authentication.
  - the server starts at http://localhost:3000/ by default


#### Local - Express (for server development)

- Transpile WebClient
  - `cd webclient && npm install` - install typescript and type definitions
  - `npm run tsc` - transpile \*.ts files
- Run the Express server as usual
  - NOTE: here expects `NODE_ENV=development` environment variable is set (when you use Eclipse, it's automatically set).
- Runtime
  - The `./webclient` is mapped to `/webclient`
  - The `./webclient/npm_modules` is mapped to `/webclient/npm_modules`

#### Bluemix - development

- Build process (at the DevOps services)
  - Builds the WebClient by `cd ./webclient && npm run tsc`
    - `*.ts` files are transpiled to `*.js` files.
- Deploy process (at DevOps service)
  - `cf push`
    - Note that all files under `node_modules` are excluded
    - Environment variable `NODE_ENV=development` is required in the target app
- CF build
  - `npm install`
    - Builds the `./npm_modules` directory
      - NOTE: the content of the directory is cached and never been updated.
      - TODO: how to make sure to update them?
- Runtime
  - The `./webclient` is mapped to `/webclient`
  - The `./node_modules/[pkg-name]/npm_modules` is mapped to `/webclient/npm_modules`

#### Bluemix - production [NOT YET]

- Same to *-development* process from *Build* to *CF build*.
  - But append `npm run bundle:prod` to the build process
    - TODO: consider to use webpack
    - NOT YET: it generates `./webclient/dist`
- Runtime
  - NOT YET: The content of `./node_modules/[pkg-name]/dist` is mapped to `/webclient`.



## Developer Tips

### Light-server
  * Only JSON but .js file is supported in the `-c` option for the `lite-server`
    * You'll got error when you pass JS-style file (e.g. `bs-config.js`) to the option.
