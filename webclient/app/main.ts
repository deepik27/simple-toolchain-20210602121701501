import { bootstrap }    from '@angular/platform-browser-dynamic';
import { provide } from '@angular/core';
import { HTTP_PROVIDERS, BaseRequestOptions, RequestOptions, RequestOptionsArgs } from '@angular/http';

import { AppComponent } from './app.component';

/**
 * When client is hosted at port 3123, it seems that lite-server is used for debugging.
 * So, re-target the API host to port 3000
 */
let webApiHost = (function(){
  if(window.location.port == '3123'){
    console.warn('WARNING');
    console.warn('WARNING: This client seems hosted by lite-server. Directing Web APIs to ' +  window.location.hostname + ':3000' + '.');
    console.warn('WARNING');
    return window.location.hostname + ':3000';
  }
  return window.location.host;
})();

class AppRequestOptions extends BaseRequestOptions {
  merge(options?:RequestOptionsArgs):RequestOptions {
    if(webApiHost){
      options.url = window.location.protocol + '//' + webApiHost + options.url;
    }
    var result = super.merge(options);
    result.merge = this.merge;
    return result;
  }
}

bootstrap(AppComponent, [
  HTTP_PROVIDERS,
  provide(RequestOptions, {useClass: AppRequestOptions}),
  provide('webApiHost', {useValue: webApiHost}),
]);
