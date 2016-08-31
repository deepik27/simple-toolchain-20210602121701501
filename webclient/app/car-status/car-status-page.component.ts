import { Component, OnInit } from '@angular/core';

import * as _ from 'underscore';


@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-page',
  templateUrl: 'car-status-page.component.html',
})
export class CarStatusPageComponent implements OnInit {
  constructor() {  }

  ngOnInit() {
    var style = document.createElement('style');
    style.type = 'text/css';

    // TODO - Here you will add dynamic fuel level where it says (6 / 8) * 90
    // All you need to change is the number "6" to your dynamic number which is out of 8
    style.innerHTML = '.pointerTriggered { transform: rotate(' + ((6 / 8) * 90) + 'deg) !important; }'

    // TODO - Here you will add dyanimc temperature where it says (((220 - 20) / 300) * 100)
    // All you need to change is the number "220" to your dynamic number which is out of 300
                    + '.thermometerTriggered { width: ' + (((220 - 20) / 300) * 100) + '% !important; }';

    document.getElementsByTagName('head')[0].appendChild(style);

    setTimeout(function () {
        document.getElementById('speedometer-pointer').classList.add('pointerTriggered');
        document.getElementById('thermometer-range').classList.add('thermometerTriggered');
    }, 5);

    var modalCallsArray = Array.prototype.slice.call(document.querySelectorAll('.numCounter'), 0);

    modalCallsArray.forEach(function(el) {
            var number = parseInt(el.innerHTML);
            var delay = number;

            // 1500 is animation duration in milliseconds (1.5s)
            var delayAccum = 1500 / el.innerHTML;
            var accum = 1;

            for (var i=0; i < number; ++i) {
                    doSetTimeout(delay, el, accum);

                    accum += 1;
                    delay = delay + delayAccum;
            }
    });

    function doSetTimeout(delay, el, accum) {
      setTimeout(function() {
          el.innerHTML = accum;
      }, delay);
    }
  }
}
