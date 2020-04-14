import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulatorControlComponent } from './simulator-control.component';

describe('SimulatorControlComponent', () => {
  let component: SimulatorControlComponent;
  let fixture: ComponentFixture<SimulatorControlComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SimulatorControlComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SimulatorControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
