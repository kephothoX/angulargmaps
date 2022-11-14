import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Kephotho Maps';

  constructor() {
    let elem = document.getElementsByTagName('head')[0];

    if(elem) {
      let style_elem = document.createElement('link');
      style_elem.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
      style_elem.rel = 'stylesheet';

      elem.appendChild(style_elem);
    }
  }
}
