# VÓLTIKA Moto

VÓLTIKA Moto is a web and Android prototype for motorcycle rides and small-package deliveries in Santiago, Chile. Users can compare fares in Chilean pesos and XLM, follow a simulated route, and verify an optional payment on Stellar Testnet. The demo uses test funds and simulated drivers.

## Try the prototype

Download the [Android demo APK](dist/android/Voltika-Moto-Demo.apk) or run the web version from the project root:

```sh
python -m http.server 8000 --directory dist
```

Open [localhost:8000](http://localhost:8000). The passenger, sender, recipient and rider roles are played on one device. The interface is in Chilean Spanish. Eight predefined Santiago landmarks provide 56 origin–destination combinations.

1. Select **Viaje en moto** or **Envío pequeño**, two landmarks and a payment method.
2. Review the fare in CLP and its optional XLM equivalent. Confirm the simulation to lock the quote.
3. Review the rider's offer, requester alias, route, service type, payment method, commission and projected net amount. Accept or decline.
4. Open the fictional customer's pickup code and enter it in the rider field. After arrival, a parcel also needs an independent delivery code. Practice codes expire after five minutes and allow three attempts.
5. Review the receipt. For XLM quotes, choose whether to publish a test payment. The receipt links to Horizon after confirmation.

## Fares and Stellar

The demo uses a base of CLP 1,150 plus CLP 440 per simulated kilometre, rounded to the nearest CLP 50. The XLM option applies a 20% promotional discount at a fixed example rate of CLP 200 per XLM. Additional charges are zero. The rider preview uses an illustrative 10% commission on the standard fare. The platform absorbs the simulated promotion. The displayed driver earnings are an illustration, separate from the single demo payment.

The bundled Stellar JavaScript SDK creates an ephemeral account, requests test funds from Friendbot and signs a native XLM payment to the demonstration recipient on **Stellar Testnet**. Before publishing, the app explains the public fields and requires a separate confirmation. New payments use a random public reference independent of the local order number. Previously signed envelopes retain their original memo. On retry, the app checks the existing transaction hash. A failed lookup stays pending until Horizon confirms the outcome. First-time activation of the recipient can add a separate 2 test XLM starting balance.

## Privacy and scope

The route is schematic and the actors are fictional. The local web and Android data controls display the history, export a printable copy and erase local records. Public Stellar Testnet records have their own lifecycle. The app requests internet access for the optional network test; the simulation uses bundled assets and predefined stops. In particular it does not collect GPS traces, phone numbers, identity documents or biometrics.

This prototype does not dispatch vehicles, handle cargo or charge Chilean pesos or mainnet XLM. It is a software demonstration, not evidence of transport authorization, insurance or legal certification.

## Chilean operating requirements

Reviewed on **24 November 2026**. The app exposes the sources in Spanish in **Privacidad y ayuda**.

- **Passenger transport.** Before taking paid orders, establish the legal operator and applicable activity, obtain a mode-specific answer from the transport authority for motorcycles, verify driver and vehicle eligibility, insurance and incident channels. Law 21.553 provides a procedure for proposed pilots and links the law's commencement to publication of its regulation. A motorcycle licence alone does not establish permission to sell passenger transport. [Law 21.553, including article 19](https://www.bcn.cl/leychile/navegar?idNorma=1191380) · [BCN guidance on unauthorized passenger transport](https://www.bcn.cl/api-leyfacil/servicio/ObtenerGuiaPublicadaHTML?uri=transporte-ilegal-de-pasajeros)
- **Platform work.** Determine the actual employment or independent-contractor relationship. For covered workers, implement contracts, offer information, remuneration or fees, training, protective equipment and relevant insurance. Independent workers covered by the law have a right to 12 continuous hours of disconnection within each 24-hour period. Production would need real enforcement and human review of incidents and complaints. [Law 21.431](https://www.bcn.cl/leychile/navegar?idNorma=1173544)
- **Consumer protection.** Before selling services, publish the provider's verified legal name, RUT, address and working contact, commercial terms, transparent total prices in CLP and cancellation and complaint procedures. A practice receipt or transaction hash is not a tax document. [SERNAC e-commerce guidance](https://www.sernac.cl/portal/604/w3-propertyvalue-20982.html)
- **Personal data.** Identify the responsible party and appropriate basis for actual data processing, publish contact and retention rules, implement access, correction and deletion procedures, and assess any proposed use of live location or identity documents. Law 19.628 currently applies. Law 21.855 moved the general commencement of the 21.719 reform to 15 October 2027. [Law 19.628](https://www.bcn.cl/leychile/navegar?idNorma=141599) · [Official Gazette, Law 21.855](https://www.diariooficial.interior.gob.cl/publicaciones/2026/11/23/44606/01/2907953.pdf)
- **Live payments.** Assess the proposed payment, custody, accounting and settlement model before handling real value. The single demo recipient and locally generated practice accounts are specific to Testnet. [CMF financial services register](https://www.cmfchile.cl/educa/621/w3-propertyvalue-46455.html)

## Project layout

| Path | Purpose |
| --- | --- |
| `dist/` | Self-contained static web app, local assets, fonts and third-party notices |
| `dist/model.js` | Santiago route graph and pricing |
| `dist/app.js` | Quotes, rider decisions, verification, receipts and privacy controls |
| `dist/payment.js` | Optional Stellar Testnet payment and retry handling |
| `android/` | Android Studio project with an embedded WebView and Gradle wrapper |
| `dist/android/Voltika-Moto-Demo.apk` | Installable Android demo |

## Android build

Use JDK 17, Android SDK 35 and the included Gradle 8.9 wrapper. From the `android` directory:

```sh
./gradlew assembleDebug
```

On Windows use `gradlew.bat assembleDebug`. Output: `app/build/outputs/apk/debug/`. The build synchronizes the web assets from `../dist`, excluding the download directory. Android 9 or later with an updated Android System WebView is recommended. The 0.2.0 APK installs as **VÓLTIKA Demo CL**, alongside the initial demo. Each installation has its own history.
