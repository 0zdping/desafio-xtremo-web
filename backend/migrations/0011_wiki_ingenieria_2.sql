-- 0011: wiki de ingeniería para DXIngenieria 2.0 (2026-10-03). Reescribe las 9 páginas.

-- Publicada por el panel de la web (purga la caché); este SQL queda como registro.

UPDATE wiki_pages SET title = 'Ingeniería: lo esencial', content = '![Aparatos de ingeniería](/assets/wiki/ingenieria/portada.webp)

> [!NOTE]
> **En 30 segundos:** pon un panel solar, una batería y una lámpara. Únelos con un carrete de cable. Ya tienes luz, de día y de noche.

La ingeniería es la parte técnica de Desafío Xtremo: sacar energía del sol, del viento, de una bici o de la gasolina, guardarla en baterías y usarla para iluminar, regar, fundir metal, abrir puertas blindadas o defender tu base con torretas y radares.

No hace falta saber nada de electricidad: **mira cualquier aparato y te dice qué le pasa**.

## Mirar y entender

Al mirar un aparato, encima de tu barra rápida sale su nombre y una frase: lo que está haciendo o lo que le falta (por ejemplo, *«Sin energía: únelo con un cable a un generador o una batería»*).

Además, cada aparato tiene una **lucecita**:

| Luz | Significa |
|---|---|
| Verde | Funciona |
| Ámbar | Ojo: le falta algo de energía o está avisando |
| Roja | Algo falla (míralo y te dice qué) |
| Gris | Apagado |
| Azul | En espera (de noche, sin viento, esperando una señal...) |

## Los controles

| Qué quieres hacer | Cómo |
|---|---|
| Colocar un aparato | Clic derecho en un bloque con él en la mano |
| Usarlo (encender, abrir, sentarte...) | Clic derecho |
| Ver su **menú** (estado, red, salud, ajustes) | Agachado + clic derecho |
| Recogerlo | Agachado + golpearlo |
| Unir dos aparatos | Carrete de cable en la mano: clic en una conexión y clic en otra |
| Arreglarlo | Clic derecho con un kit de reparación |
| Leer el manual en el juego | El *Manual del ingeniero*, o `/ingenieria guia` |

## Qué puedes construir

- **Energía**: paneles, aerogenerador, bici-dinamo y generador de gasolina, y tres baterías. Ver [Generar y guardar energía](/wiki.html?p=ingenieria-energia).
- **Cables, postes e interruptores**: [Cables y la red](/wiki.html?p=ingenieria-cables).
- **Automatizar**: palancas, botones, sensores, puertas lógicas y temporizadores. Ver [Señales y automatización](/wiki.html?p=ingenieria-logica).
- **Aparatos útiles**: luces, aspersores, horno, nevera, radiador... Ver [Aparatos](/wiki.html?p=ingenieria-aparatos).
- **Defensa y asaltos**: alarmas, puertas blindadas, torretas, radar, inhibidor y bomba EMP. Ver [Asaltos y defensa](/wiki.html?p=ingenieria-asaltos).

Empieza por [Tu primera luz](/wiki.html?p=ingenieria-primera-instalacion).', position = 0, updated_at = datetime('now') WHERE slug = 'ingenieria';

UPDATE wiki_pages SET title = 'Tu primera luz', content = '![Panel solar](/assets/wiki/ingenieria/panel_solar.webp) ![Batería pequeña](/assets/wiki/ingenieria/bateria_pequena.webp) ![Lámpara](/assets/wiki/ingenieria/lampara.webp) ![Carrete de cable](/assets/wiki/ingenieria/carrete.webp)

Vas a montar una luz que funciona de día y de noche. Necesitas:

1. Un **panel solar**.
2. Una **batería** (la pequeña sirve).
3. Una **lámpara**.
4. Un **carrete de cable**.

## 1. Colócalo todo

Pon el panel al aire libre (tiene que ver el cielo, nada encima). La batería y la lámpara, donde quieras: la lámpara también va en paredes y techos.

## 2. Únelos

Coge el carrete. Verás puntos de colores en los aparatos: son sus **conexiones**.

- **Amarillo**: energía.
- **Azul**: entrada de señal.
- **Naranja**: salida de señal.

Haz clic en el punto amarillo del panel y luego en el de la batería. Después, otro cable de la batería a la lámpara.

> [!TIP]
> Mientras tiendes un cable, solo se iluminan las conexiones donde puede terminar. Si haces clic en un bloque por el camino, el cable pasa por ahí (para llevarlo pegado a la pared).

## 3. Míralo

Mira la lámpara: si pone **Iluminando** y su luz está verde, ya está. De día el panel enciende la lámpara y carga la batería con lo que sobra; de noche, la batería da la energía.

> [!NOTE]
> Clic en la lámpara para encenderla o apagarla. Si quieres que se encienda sola al anochecer, mira [Señales y automatización](/wiki.html?p=ingenieria-logica).', position = 1, updated_at = datetime('now') WHERE slug = 'ingenieria-primera-instalacion';

UPDATE wiki_pages SET title = 'Generar y guardar energía', content = 'Todo lo que está unido por cables de energía forma una **red** y comparte la energía. Los generadores **dan**, los aparatos **gastan** y las baterías **guardan** lo que sobra y lo dan cuando falta.

## Generadores

![Panel solar](/assets/wiki/ingenieria/panel_solar.webp) ![Aerogenerador](/assets/wiki/ingenieria/aerogenerador.webp) ![Bici-dinamo](/assets/wiki/ingenieria/dinamo.webp) ![Generador de gasolina](/assets/wiki/ingenieria/generador_gasolina.webp)

| Generador | Da | Lo bueno | Lo malo |
|---|---|---|---|
| Panel solar | hasta 20 W | Gratis | Nada de noche, menos con lluvia o a la sombra |
| Aerogenerador | hasta 30 W | De día y de noche | Depende del viento; mejor en alto y despejado |
| Bici-dinamo | hasta 15 W | Siempre a mano | Tienes que pedalear tú (A y D alternas) |
| Generador de gasolina | 20 W | Siempre, llueva o sea de noche | Gasta combustible y echa humo |

> [!TIP]
> Pon el generador de gasolina en **Automático** (en su menú): solo arranca cuando a tu red le falta energía o las baterías bajan del 25 %, y se para al llenarlas. Así no gastas combustible de más.

> [!WARNING]
> El generador de gasolina **echa humo**. En un sitio cerrado marea a quien esté dentro. Déjale una salida al aire libre o pon un **purificador de aire** en esa sala.

## Baterías

![Batería pequeña](/assets/wiki/ingenieria/bateria_pequena.webp) ![Batería mediana](/assets/wiki/ingenieria/bateria_mediana.webp) ![Batería grande](/assets/wiki/ingenieria/bateria_grande.webp)

| Batería | Guarda | Da y carga hasta |
|---|---|---|
| Pequeña | 5 Wh | 10 W |
| Mediana | 20 Wh | 25 W |
| Grande | 80 Wh | 60 W |

No hay que tocar nada: cargan solas con lo que sobra y dan lo que falta. En su frente se ve la carga (rayas verdes). Al recogerla, se lleva su carga.

> [!NOTE]
> **1 Wh es 1 W durante una hora.** Una lámpara gasta 2 W: con la batería pequeña (5 Wh) aguanta dos horas y media. Su menú te dice cuánto aguantan tus baterías con lo que gastas ahora.

## ¿Y si falta energía?

Si tus aparatos piden más de lo que dan los generadores y las baterías, todos reciben la misma parte: las luces bajan, el horno va más lento y lo que necesita más de la mitad se para. El **monitor de energía** lo enseña en grande: lo que da tu red, lo que gasta y cómo van tus baterías.', position = 2, updated_at = datetime('now') WHERE slug = 'ingenieria-energia';

UPDATE wiki_pages SET title = 'Cables y la red', content = '![Carrete de cable](/assets/wiki/ingenieria/carrete.webp) ![Poste eléctrico](/assets/wiki/ingenieria/poste.webp) ![Interruptor de red](/assets/wiki/ingenieria/interruptor.webp) ![Monitor de energía](/assets/wiki/ingenieria/monitor.webp)

## El carrete de cable

Un solo carrete para todo. El cable sabe qué es por dónde empiezas:

- De una toma **amarilla** a otra amarilla: **cable de energía** (negro). Une los dos aparatos a la misma red.
- De una salida **naranja** a una entrada **azul**: **cable de señal** (azul). Ver [Señales y automatización](/wiki.html?p=ingenieria-logica).

| Qué quieres hacer | Cómo |
|---|---|
| Empezar un cable | Clic derecho en una conexión |
| Llevarlo por la pared | Clic derecho en bloques por el camino |
| Terminarlo | Clic derecho en otra conexión |
| Deshacer el último punto o cancelar | Clic izquierdo |
| Quitar un cable tuyo (te lo devuelve) | Agachado + clic izquierdo apuntando al cable |

Cada cable llega hasta **32 bloques** y gasta lo que mide del carrete. Con el carrete en la mano verás correr puntos verdes por los cables que llevan energía.

## Poste eléctrico

Para llevar la energía lejos o por encima de la cabeza: lleva cables a su punta. Todo lo que llega a un poste está en la misma red. Una toma admite hasta 8 cables.

## Interruptor de red

Tiene dos tomas, **A** y **B**. Encendido, las dos redes son una; apagado, cada una va por su lado. Sirve para apagar de golpe una parte de tu base. Clic para cambiarlo, o mándale una señal a su entrada.

## Monitor de energía

Cuélgalo en una pared y únelo a tu red: enseña lo que dan tus generadores, lo que gastan tus aparatos y cuánto les queda a tus baterías.', position = 3, updated_at = datetime('now') WHERE slug = 'ingenieria-cables';

UPDATE wiki_pages SET title = 'Señales y automatización', content = 'Las señales son como la redstone: **encendidas o apagadas**. Van por cables azules, de una **salida naranja** a una **entrada azul**. Nada de esto gasta energía.

> [!TIP]
> Si un aparato no tiene nada en su entrada, **funciona solo**: la alarma vigila sola, la torreta dispara sola y la lámpara luce sola. Las señales son para controlarlos tú.

## Para mandar señales

![Palanca](/assets/wiki/ingenieria/palanca.webp) ![Botón](/assets/wiki/ingenieria/pulsador.webp) ![Sensor de presencia](/assets/wiki/ingenieria/sensor_presencia.webp) ![Barrera láser](/assets/wiki/ingenieria/laser.webp) ![Placa de presión](/assets/wiki/ingenieria/placa_presion.webp) ![Sensor de luz](/assets/wiki/ingenieria/sensor_luz.webp)

| Aparato | Manda señal... |
|---|---|
| Palanca | mientras está encendida (clic para cambiarla) |
| Botón | un momento al pulsarlo (1 s; más en su menú) |
| Sensor de presencia | si hay alguien cerca (desconocidos, todos o tu clan; hasta 10 bloques) |
| Barrera láser | si alguien cruza su rayo (hasta 24 bloques) |
| Placa de presión | mientras alguien la pisa |
| Sensor de luz | de noche (o de día, si lo cambias) |

## Para pensar

![Puerta lógica](/assets/wiki/ingenieria/puerta_logica.webp) ![Temporizador](/assets/wiki/ingenieria/temporizador.webp) ![Memoria](/assets/wiki/ingenieria/memoria.webp) ![Emisor inalámbrico](/assets/wiki/ingenieria/emisor_rf.webp) ![Receptor inalámbrico](/assets/wiki/ingenieria/receptor_rf.webp)

- **Puerta lógica**: mira sus entradas A y B. Modos (clic para cambiar; se ve encima): **Y** (las dos), **O** (alguna), **NO** (al revés que A) y **SOLO UNA**.
- **Temporizador**: **Retraso** (igual que la entrada, pero más tarde), **Pulso** (un ratito cada vez que se enciende la entrada) e **Intermitente** (se enciende y apaga solo).
- **Memoria**: cada señal en CAMBIAR la cambia. Un botón + una memoria = un interruptor de un solo botón.
- **Inalámbricos**: el emisor manda la señal de su entrada por el aire y el receptor del mismo canal la saca, hasta a 160 bloques.

## Montajes útiles

> [!NOTE]
> **Luces que se encienden solas de noche:** sensor de luz → entrada de tus lámparas.

> [!NOTE]
> **Puerta que se abre sola a tu clan:** sensor de presencia en modo *Solo mi clan* → entrada ABRIR de la puerta blindada.

> [!NOTE]
> **Alarma con láser:** barrera láser cruzando la entrada → entrada de la alarma. Suena cuando alguien cruza el rayo.

> [!NOTE]
> **Botón de pánico:** botón → emisor inalámbrico. En la base, receptor del mismo canal → entrada TRANSMITIR de la estación de radio. Un clic y avisa por radio.', position = 4, updated_at = datetime('now') WHERE slug = 'ingenieria-logica';

UPDATE wiki_pages SET title = 'Aparatos', content = 'Lo que gasta energía y hace algo útil. Únelos a tu red con un cable y funcionan solos. Clic: encender o apagar (o abrir, en el horno y la nevera).

![Lámpara](/assets/wiki/ingenieria/lampara.webp) ![Foco](/assets/wiki/ingenieria/foco.webp) ![Aspersor](/assets/wiki/ingenieria/aspersor.webp) ![Horno eléctrico](/assets/wiki/ingenieria/horno.webp) ![Nevera](/assets/wiki/ingenieria/nevera.webp) ![Radiador](/assets/wiki/ingenieria/radiador.webp) ![Purificador de aire](/assets/wiki/ingenieria/ventilacion.webp)

| Aparato | Gasta | Qué hace |
|---|---|---|
| Lámpara | 2 W | Ilumina mucho; con poca energía, menos |
| Foco | 5 W | Ilumina hacia donde apunta, hasta 12 bloques |
| Aspersor | 1 W | Riega los cultivos de alrededor (necesita agua a 5 bloques o menos) |
| Horno eléctrico | 15 W | Funde la mena de metal sin fuego (unos 20 s cada una) |
| Nevera | 4 W | Guarda 27 huecos en frío |
| Radiador | 10 W | Calienta hasta su temperatura y se apaga solo; protege los cultivos de las heladas |
| Purificador de aire | 3 W | Quita el humo del generador de gasolina en una sala cerrada |

> [!TIP]
> Si un aparato no funciona, míralo: te dice exactamente qué le falta (energía, agua, algo que fundir...).', position = 5, updated_at = datetime('now') WHERE slug = 'ingenieria-aparatos';

UPDATE wiki_pages SET title = 'Salud, reparación y humo', content = '![Kit de reparación](/assets/wiki/ingenieria/kit_reparacion.webp)

## La salud de los aparatos

Cada aparato tiene su **estado**, del 100 % al 0 %. Baja poco a poco mientras trabaja y de golpe cuando le pegan o hay una explosión cerca. Míralo en su menú (agachado + clic).

- Cuando baja mucho, te llega un aviso.
- **Al 0 % se para.** Su luz se pone roja.
- Si alguien lo sigue golpeando estando al 0 %, se rompe del todo.

**Arreglarlo:** clic derecho con un **kit de reparación**. Vuelve al 100 %, aunque estuviera roto.

## El humo del generador

El generador de gasolina echa humo. Al aire libre no pasa nada, pero **en un sitio cerrado** el humo se queda dentro y quien esté ahí se marea (náuseas y lentitud).

Soluciones:

1. Ponlo fuera, o déjale una salida al aire libre.
2. Pon un **purificador de aire** en la pared o el techo de esa sala.

## El frío

El **radiador** calienta lo de alrededor hasta su temperatura (20 °C de serie) y se apaga solo. Bajo techo calienta de verdad; también protege tus cultivos de las heladas.', position = 6, updated_at = datetime('now') WHERE slug = 'ingenieria-calor-averias';

UPDATE wiki_pages SET title = 'Asaltos y defensa', content = '## Defender tu base

![Torreta de bobinas](/assets/wiki/ingenieria/torreta.webp) ![Alarma](/assets/wiki/ingenieria/alarma.webp) ![Puerta blindada](/assets/wiki/ingenieria/puerta_electrica.webp) ![Radar](/assets/wiki/ingenieria/radar.webp)

- **Torreta de bobinas** (10 W cargando): dispara dardos sola a los desconocidos a 14 bloques. Nunca a ti ni a tu clan. Clic con dardos para cargarla.
- **Alarma** (1 W): vigila sola y, si salta, avisa a tu clan esté donde esté.
- **Puerta blindada** (1 W): solo la abre tu clan, o quien sepa el código de su teclado.
- **Radar** (12 W): ve a los jugadores al aire libre a casi 100 bloques. Clic para coger su monitor (un mapa): verde tu clan, rojo los desconocidos. También dice cuándo va a llover.
- **Estación de radio y walkies**: hablad con `/radio <mensaje>` aunque estéis lejos.

> [!TIP]
> Para probar la torreta (a ti no te dispara), pon en su menú **Solo bichos** y acércale un zombi.

> [!WARNING]
> Todo esto necesita energía. Protege tus cables y baterías: sin energía, la puerta blindada se puede forzar a mano.

## Asaltar

![Alicates](/assets/wiki/ingenieria/alicates.webp) ![Inhibidor](/assets/wiki/ingenieria/inhibidor.webp) ![Bomba EMP](/assets/wiki/ingenieria/bomba_emp.webp)

- **Alicates**: cortan cualquier cable. Si cortas el de una puerta blindada, su cierre se suelta.
- **Inhibidor** (15 W): a 32 bloques no funcionan los walkies, las radios, los inalámbricos, el radar ni los avisos de alarma al clan. Los cables sí.
- **Bomba EMP**: clic para armarla; a los 10 segundos deja rotos los aparatos a 14 bloques (se arreglan con un kit) y quema walkies y monitores.

> [!NOTE]
> **Contra el EMP:** los bloques de metal entre la bomba y tus aparatos los protegen, como una jaula de Faraday.', position = 7, updated_at = datetime('now') WHERE slug = 'ingenieria-asaltos';

UPDATE wiki_pages SET title = 'Para curiosos: lo que hay debajo', content = 'No hace falta saber nada de esto para jugar, pero la ingeniería sigue leyes de verdad, aunque con números sencillos.

## La energía se conserva

Lo que entra en una batería es lo que luego sale. Si tus aparatos piden más de lo que hay, nadie se lo inventa: todos reciben la misma parte de lo que hay. El generador de gasolina solo quema el combustible de la energía que de verdad se usa.

## El sol

El panel da según lo alto que está el sol: a mediodía, sus 20 W; al amanecer y al atardecer, mucho menos (el sol está bajo y su luz atraviesa más aire). Con lluvia las nubes tapan la mayor parte. A la sombra solo le llega la luz del cielo.

## El viento

Sopla más cuanto más alto: por eso el aerogenerador rinde más en una colina. La energía del viento crece con su velocidad **al cubo**: con el doble de viento, ocho veces más energía (hasta el tope del generador). Con un temporal muy fuerte se frena para no romperse, como los de verdad.

## Las ondas

El inhibidor llena de ruido la radio a su alrededor, pero los cables no se enteran: por eso lo cableado sigue funcionando. Y el metal frena el pulso de la bomba EMP: es una jaula de Faraday.

## Los vatios

**1 W durante una hora es 1 Wh.** Todo va en tiempo real: una batería de 5 Wh con una lámpara de 2 W aguanta dos horas y media de verdad, aunque nadie esté cerca (la simulación sigue con tu base lejos).', position = 8, updated_at = datetime('now') WHERE slug = 'ingenieria-fisica';
