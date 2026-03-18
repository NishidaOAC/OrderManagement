import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryChannels } from './delivery-channels';

describe('DeliveryChannels', () => {
  let component: DeliveryChannels;
  let fixture: ComponentFixture<DeliveryChannels>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryChannels]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryChannels);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
