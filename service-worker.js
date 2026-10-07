/* =====================================================================
   SERVICE WORKER für "YouDo"

   Ein Service Worker ist eine kleine JavaScript-Datei, die der Browser
   im HINTERGRUND laufen lässt - unabhängig davon, ob die App gerade
   offen ist. Auf dem iPhone ist er zwingend nötig, damit die App
   überhaupt Benachrichtigungen anzeigen darf.

   WICHTIG: Diese Datei muss im GLEICHEN Ordner liegen wie die
   index.html, sonst findet der Browser sie nicht.
   ===================================================================== */


/*
   NAME DES ZWISCHENSPEICHERS

   Wird NUR als Notfall-Kopie benutzt (siehe fetch-Teil weiter unten),
   damit die App auch ohne Internet noch startet. Ändere die Nummer am
   Ende, wenn du den Zwischenspeicher einmal komplett verwerfen willst.
*/

const CACHE_NAME = "notfall-kopie-v1";


/*
   INSTALLIEREN
   skipWaiting() sorgt dafür, dass eine neue Version dieser Datei
   sofort übernommen wird, statt zu warten, bis alle Tabs der App
   geschlossen sind.
*/

self.addEventListener("install", function (event) {

    self.skipWaiting();

});


/*
   AKTIVIEREN
   clients.claim() bedeutet: der neue Service Worker ist ab sofort für
   die bereits geöffnete Seite zuständig.

   Außerdem werden alte Zwischenspeicher aufgeräumt, falls du oben
   CACHE_NAME änderst.
*/

self.addEventListener("activate", function (event) {

    event.waitUntil(

        (async function () {

            const namen =
                await caches.keys();


            await Promise.all(
                namen.map(function (name) {

                    if (name !== CACHE_NAME) {

                        return caches.delete(name);

                    }

                })
            );


            await self.clients.claim();

        })()

    );

});


/*
   DIE SEITE IMMER FRISCH LADEN

   Das Problem: Die als App gespeicherte Seite zeigte manchmal noch
   eine ALTE Fassung, obwohl längst eine neue hochgeladen war. Schuld
   ist der ganz normale Zwischenspeicher des Browsers - GitHub Pages
   sagt ihm nämlich "du darfst diese Seite ein paar Minuten lang
   aufheben", und gespeicherte Web-Apps halten sich besonders lange
   daran.

   Die Lösung: Für die SEITE selbst (nicht für Bilder o.ä.) holt der
   Service Worker die Datei immer direkt vom Server. Damit wirklich
   kein Zwischenspeicher dazwischenfunkt, wird an die Adresse ein
   wechselnder Zusatz gehängt (?frisch=...) - für den Server ist das
   dieselbe Datei, für den Zwischenspeicher aber jedes Mal etwas Neues.

   Klappt das nicht, weil gerade kein Internet da ist, wird die zuletzt
   erfolgreich geladene Fassung aus der Notfall-Kopie genommen. So
   startet die App auch im Flugmodus noch.
*/

self.addEventListener("fetch", function (event) {

    const anfrage = event.request;


    /*
    // Nur die Seite selbst behandeln. "navigate" heißt: der Browser
    // öffnet gerade eine Seite (App-Start, Neu-Laden). Alles andere -
    // Bilder, Schriften, Anfragen an Supabase - läuft unverändert
    // weiter, als gäbe es gar keinen Service Worker.
    */

    if (anfrage.mode !== "navigate") {

        return;

    }


    if (anfrage.method !== "GET") {

        return;

    }


    event.respondWith(

        (async function () {

            try {

                const adresse =
                    new URL(anfrage.url);


                adresse.searchParams.set(
                    "frisch",
                    String(Date.now())
                );


                const antwort =
                    await fetch(
                        adresse.toString(),
                        {
                            cache: "no-store",
                            credentials: "same-origin"
                        }
                    );


                // Nur brauchbare Antworten aufheben.
                if (antwort && antwort.ok) {

                    const speicher =
                        await caches.open(CACHE_NAME);


                    await speicher.put(
                        "notfall-seite",
                        antwort.clone()
                    );

                }


                return antwort;

            }

            catch (fehler) {

                const speicher =
                    await caches.open(CACHE_NAME);


                const kopie =
                    await speicher.match("notfall-seite");


                if (kopie) {

                    return kopie;

                }


                // Es gibt wirklich nichts - dann den Fehler des
                // Browsers durchreichen.
                throw fehler;

            }

        })()

    );

});


/*
   PUSH-NACHRICHT EMPFANGEN

   Kommt auch an, wenn die App komplett geschlossen ist.

   WICHTIG: Apple verlangt, dass bei JEDER empfangenen Push-Nachricht
   auch wirklich eine Benachrichtigung angezeigt wird. Wer das nicht
   tut, dem entzieht iOS die Erlaubnis wieder. Deshalb gibt es hier
   immer einen Standardtext als Rückfallebene.
*/

self.addEventListener("push", function (event) {

    let title = "YouDo";

    let body = "Es gibt etwas Neues.";


    if (event.data) {

        try {

            // Erwartet wird z.B. { "title": "Update: ...", "body": "..." }
            const data = event.data.json();

            title = data.title || title;

            body = data.body || body;

        }

        catch (error) {

            // Falls der Server nur reinen Text schickt statt JSON
            body = event.data.text() || body;

        }

    }


    event.waitUntil(

        self.registration.showNotification(
            title,
            {
                body: body,
                icon: "icon-192.png",
                badge: "icon-192.png",
                tag: "app-update"
            }
        )

    );

});


/*
   KLICK AUF DIE BENACHRICHTIGUNG

   Holt ein bereits offenes Fenster der App nach vorne. Gibt es keines,
   wird die App neu geöffnet.
*/

self.addEventListener("notificationclick", function (event) {

    event.notification.close();


    event.waitUntil(

        self.clients
            .matchAll({
                type: "window",
                includeUncontrolled: true
            })
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
