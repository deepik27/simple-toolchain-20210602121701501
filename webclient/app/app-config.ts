import { OpaqueToken } from '@angular/core';

export let APP_CONFIG = new OpaqueToken('app.config');

export interface AppConfig {
  DEBUG: boolean;
  webApiHost: string;
}

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

export const DEFAULT_APP_CONFIG: AppConfig = {
  DEBUG: false,
  webApiHost: webApiHost,
};
