import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivityCardComponent } from './activity-card.component';
import { ActivityItem } from '../../../core/models/activity.model';

const baseActivity: ActivityItem = {
  username: 'toniplayer',
  type: 'WISHLIST_ADD',
  gameName: 'Portal 2',
  createdAt: new Date().toISOString(),
};

describe('ActivityCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActivityCardComponent],
      providers: [provideRouter([])],
    });
  });

  function create(activity: ActivityItem = baseActivity) {
    const fixture = TestBed.createComponent(ActivityCardComponent);
    fixture.componentRef.setInput('activity', activity);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the first two letters of the username as initials, uppercased', () => {
    const fixture = create();
    expect(fixture.componentInstance.initials()).toBe('TO');
  });

  it('reports "just now" for a timestamp seconds in the past', () => {
    const fixture = create({ ...baseActivity, createdAt: new Date().toISOString() });
    expect(fixture.componentInstance.relativeTime()).toBe('Just now');
  });

  it('reports minutes ago for a timestamp under an hour old', () => {
    const createdAt = new Date(Date.now() - 5 * 60_000).toISOString();
    const fixture = create({ ...baseActivity, createdAt });
    expect(fixture.componentInstance.relativeTime()).toBe('5m ago');
  });

  it('reports hours ago for a timestamp under a day old', () => {
    const createdAt = new Date(Date.now() - 3 * 3_600_000).toISOString();
    const fixture = create({ ...baseActivity, createdAt });
    expect(fixture.componentInstance.relativeTime()).toBe('3h ago');
  });

  it('reports days ago for a timestamp a day or more old', () => {
    const createdAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const fixture = create({ ...baseActivity, createdAt });
    expect(fixture.componentInstance.relativeTime()).toBe('2d ago');
  });
});
