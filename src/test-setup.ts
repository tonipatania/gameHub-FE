import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NotificationService } from './app/core/services/notification.service';

// La navbar (dentro ogni pagina) fa partire il polling delle notifiche non lette non appena c'e'
// un utente loggato: nelle specifiche delle altre pagine sarebbe una richiesta HTTP inattesa che
// fa fallire `httpMock.verify()`. Di default il servizio e' quindi un finto inerte; le specifiche
// che vogliono il servizio vero (notification.service.spec, navbar.component.spec) lo
// ri-dichiarano nei propri `providers`, che vincono su questo.
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: NotificationService,
        useValue: { unreadCount: signal(0), refreshUnread: () => undefined },
      },
    ],
  });
});
