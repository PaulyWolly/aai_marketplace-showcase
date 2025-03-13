import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemManagementComponent } from './item-management.component';

describe('ItemManagementComponent', () => {
  let component: ItemManagementComponent;
  let fixture: ComponentFixture<ItemManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ItemManagementComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
