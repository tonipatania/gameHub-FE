import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { UserCardComponent } from './user-card.component';
import { SuggestedUser } from '../../../core/models/user.model';

const baseUser: SuggestedUser = { id: 'u1', username: 'toniplayer' };

describe('UserCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserCardComponent],
      providers: [provideRouter([])],
    });
  });

  function create(user: SuggestedUser = baseUser) {
    const fixture = TestBed.createComponent(UserCardComponent);
    fixture.componentRef.setInput('user', user);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the first two letters of the username as initials, uppercased', () => {
    const fixture = create();
    expect(fixture.componentInstance.initials()).toBe('TO');
  });

  it('shows a generic subtitle when there is no suggestion reason', () => {
    const fixture = create();
    expect(fixture.componentInstance.subtitle()).toBeTruthy();
  });

  it('builds a common-friends subtitle with the plural game count', () => {
    const fixture = create({ ...baseUser, reason: 'COMMON_FRIENDS', commonGames: 3 });
    expect(fixture.componentInstance.subtitle()).toContain('3');
  });

  it('builds a common-friends subtitle with the singular game count', () => {
    const fixture = create({ ...baseUser, reason: 'COMMON_FRIENDS', commonGames: 1 });
    expect(fixture.componentInstance.subtitle()).not.toContain('0');
  });

  it('builds a popular subtitle with follower count when present', () => {
    const fixture = create({ ...baseUser, reason: 'POPULAR', followers: 42 });
    expect(fixture.componentInstance.subtitle()).toContain('42');
  });

  it('does not render a follow button by default', () => {
    const fixture = create();
    expect(fixture.debugElement.query(By.css('button'))).toBeNull();
  });

  it('emits followToggle with the username when the follow button is clicked', () => {
    const fixture = create();
    fixture.componentRef.setInput('showFollowButton', true);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.followToggle.subscribe((u) => emitted.push(u));

    fixture.debugElement.query(By.css('button')).triggerEventHandler('click', null);

    expect(emitted).toEqual(['toniplayer']);
  });
});
