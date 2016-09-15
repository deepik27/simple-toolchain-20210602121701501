
### TODOs

* Revise OSSS versions
* Consider webpack



## Developers Note

### RxJS (ReactiveX)

Note that we are using RxJS 5.x (ReactiveX), which by default provides typescript definitions. It's due to Angular2 requirement. You'll see many results about old versions when you googles about RxJS and typescript, but they're obsoleted and not work!

### Workaorunds

This section describes required workarounds around typescripts

#### OpenLayers with Typescript

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

#### System JS bundler

The `gulpfile.js` builds `dist/js/bundle.js` from the javascripts. It's done by `systemjs-builder`. But we had to create the bundle in the server root directory, which is `..`, or we get *404 Not Found* error when we obtain angular2 template HTML files such as `app/app.component.html`.


## Developer Tips

### Light-server
  * Only JSON but .js file is supported in the `-c` option for the `lite-server`
    * You'll got error when you pass JS-style file (e.g. `bs-config.js`) to the option.
