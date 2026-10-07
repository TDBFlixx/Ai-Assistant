/* Service Worker für "Mein KI-Assistent"
   Läuft im Hintergrund und darf als Einziger Benachrichtigungen
   anzeigen. Muss im gleichen Ordner liegen wie die index.html.
   Bewusst OHNE Zwischenspeichern von Dateien - sonst würde der
   Browser die alte App-Version zeigen, obwohl du eine neue hochlädst. */

self.addEventListener("install", function (event) {
    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(self.clients.claim());
});

/* Push-Nachricht empfangen. Apple verlangt, dass JEDE empfangene
   Nachricht auch wirklich angezeigt wird - sonst entzieht iOS die
   Erlaubnis. Deshalb immer ein Standardtext als Rückfallebene. */
self.addEventListener("push", function (event) {

    let title = "Mein KI-Assistent";
    let body = "Es gibt etwas Neues.";

    if (event.data) {
        try {
            const data = event.data.json();
            title = data.title || title;
            body = data.body || body;
        } catch (error) {
            body = event.data.text() || body;
        }
    }

    event.waitUntil(
        self.registration.showNotification(title, {
            body: body,
            icon: "icon-192.png",
            badge: "icon-192.png",
            tag: "app-update"
        })
    );
});

/* Klick auf die Benachrichtigung: offenes Fenster nach vorne holen,
   sonst die App neu öffnen. */
self.addEventListener("notificationclick", function (event) {

    event.notification.close();

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (clientList) {
                for (const client of clientList) {
                    if ("focus" in client) {
                        return client.focus();
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow("./");
                }
            })
    );
});
