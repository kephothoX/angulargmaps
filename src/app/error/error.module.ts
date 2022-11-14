import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ErrorRoutingModule } from './error-routing.module';
import { ErrorComponent } from './error.component';


@NgModule({
  declarations: [
    ErrorComponent
  ],
  imports: [
    CommonModule,
    ErrorRoutingModule,

    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ]
})
export class ErrorModule { }
