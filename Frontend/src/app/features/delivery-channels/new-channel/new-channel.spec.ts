import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewChannel } from './new-channel';

describe('NewChannel', () => {
  let component: NewChannel;
  let fixture: ComponentFixture<NewChannel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewChannel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewChannel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
