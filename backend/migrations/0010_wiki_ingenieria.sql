INSERT OR IGNORE INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES ('ingenieria', 'Ingeniería: lo esencial', 'Ingeniería', '![Instalación eléctrica de ingeniería](/assets/wiki/ingenieria/portada.webp)

> [!NOTE]
> **En 30 segundos:** coloca una fuente de energía, una batería y algo que gaste. Únelos con un carrete de cable. Ya tienes luz. Todo lo demás (lógica, sensores, torretas, puertas blindadas) se construye encima de esa misma idea.

La ingeniería es la parte técnica de Desafío Xtremo: generar electricidad, guardarla, llevarla por cables y usarla para iluminar, calentar, fundir metal, abrir puertas o defender tu base. Funciona con **física de verdad** (vatios, voltios, calor), pero no hace falta saber nada de electricidad para empezar.

## Lo que necesitas para empezar

![Generador de gasolina](/assets/wiki/ingenieria/generador_gasolina.webp) ![Panel solar](/assets/wiki/ingenieria/panel_solar.webp) ![Batería mediana](/assets/wiki/ingenieria/bateria_mediana.webp) ![Lámpara LED](/assets/wiki/ingenieria/lampara.webp)

1. **Una fuente**: un generador de gasolina o un panel solar.
2. **Una batería**: guarda lo que sobra y lo da cuando falta.
3. **Algo que gaste**: una lámpara es lo más sencillo.
4. **Un carrete de cable de cobre** para unirlo todo.

La página [Tu primera instalación](/wiki.html?p=ingenieria-primera-instalacion) lo explica paso a paso.

## Los controles

| Qué quieres hacer | Cómo |
|---|---|
| Colocar un aparato | Clic derecho en un bloque con el aparato en la mano |
| Usarlo (encender, abrir, montarte...) | Clic derecho en el aparato |
| Ver su **ficha** (estado, ajustes, averías) | Agachado + clic derecho |
| Tender un cable | Carrete en la mano: clic en un borne, clic en otro borne |
| Recogerlo | Caja de herramientas en la mano: agachado + clic izquierdo |
| Leer el manual en el juego | Clic derecho con el *Manual del ingeniero*, o `/ingenieria guia` |

> [!TIP]
> Con un carrete en la mano ves los **bornes** de cada aparato: **rojo** es energía, **azul** es una entrada de señal y **naranja** una salida de señal. Si dudas de dónde va un cable, mira el color.

## Qué puedes construir

- **Energía**: generador de gasolina, paneles solares, aerogenerador y una dinamo de pedales para emergencias. Tres tamaños de batería. Más en [Generar y guardar energía](/wiki.html?p=ingenieria-energia).
- **Cables y protección**: regletas, interruptores, disyuntores, relés. Ver [Cables y protección](/wiki.html?p=ingenieria-cables).
- **Automatización**: puertas lógicas, memorias, temporizadores, comparadores y sensores para que tu base funcione sola. Ver [Lógica y automatización](/wiki.html?p=ingenieria-logica).
- **Aparatos útiles**: luces, horno que funde metal, nevera, radiadores, aspersores, radio, radar. Ver [Aparatos](/wiki.html?p=ingenieria-aparatos).
- **Defensa y asalto**: puerta blindada con teclado, alarmas, torretas, inhibidores y bombas EMP. Ver [Asaltos y defensa](/wiki.html?p=ingenieria-asaltos).

## Tres ideas que conviene saber

1. **Todo lo unido por cables forma una red.** La energía se reparte sola: no hay que elegir qué alimenta a qué.
2. **El tiempo es real.** Un panel carga la batería aunque estés al otro lado del mapa, y una batería grande puede tener una lámpara encendida un mes.
3. **Las cosas se gastan y se rompen.** El calor, el uso y los golpes provocan averías. Se diagnostican con el multímetro y se reparan con la caja de herramientas. Ver [Calor y averías](/wiki.html?p=ingenieria-calor-averias).
', 1, '761238124470337576');

INSERT OR IGNORE INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES ('ingenieria-primera-instalacion', 'Tu primera instalación', 'Ingeniería', '> [!NOTE]
> **En corto:** coloca generador, batería y lámpara. Con el carrete: clic en el punto rojo del generador, clic en el rojo de la batería. Otro cable de la batería a la lámpara. Llena el generador de combustible y arráncalo con un clic.

![Esquema de la primera instalación](/assets/wiki/ingenieria/esquema-primera.webp)

## 1. Coloca los aparatos

Clic derecho en el suelo con cada aparato en la mano. Los grandes (generador, baterías) solo van en el suelo y se colocan mirando hacia ti. Los pequeños (lámparas, sensores, lógica) también se pueden poner en paredes y techos.

> [!WARNING]
> El generador de gasolina echa **monóxido de carbono**. Ponlo al aire libre, nunca dentro de una habitación cerrada sin ventilación.

## 2. Tiende los cables

Coge el **carrete de cable de cobre**. Al tenerlo en la mano verás los bornes de todos los aparatos cercanos:

- **Rojo**: energía. Es donde va el cable de cobre.
- **Azul** y **naranja**: señales (para automatizar' || char(59) || ' de momento, ignóralos).

Haz clic en el borne rojo del generador y después en el borne rojo de la batería. Ya están unidos. Repite de la batería a la lámpara.

> [!TIP]
> Entre un borne y otro puedes hacer clic en paredes y suelos: son **puntos de paso** para llevar el cable pegado a la pared en vez de cruzando la habitación. Clic izquierdo quita el último punto' || char(59) || ' agachado + clic derecho cancela el cable.

## 3. Pon en marcha el generador

1. Clic derecho en el generador con **combustible** en la mano para repostar (agachado, mete todo lo que lleves).
2. Clic derecho sin nada para arrancarlo (es un tirón: con frío o con la bujía gastada cuesta más).
3. La lámpara se enciende y lo que sobra carga la batería.

Con el carrete en la mano verás **la corriente circulando** por los cables: puntos verdes si va bien, rojos si el cable va sobrecargado.

## 4. Mira la ficha

Agachado + clic derecho en cualquier aparato abre su **ficha**: si está encendido, cuánta potencia da o gasta, su temperatura, sus conexiones y sus averías. En la batería verás la carga y cuánto tiempo te queda.

## Y ahora qué

- Cambia el generador por **paneles solares** para no depender del combustible (de noche tira de la batería).
- Añade un **disyuntor** en la línea para que un fallo no queme el cable.
- Haz que las luces se enciendan solas al anochecer: es el primer montaje de [Lógica y automatización](/wiki.html?p=ingenieria-logica).

> [!NOTE]
> Cada borne admite hasta 4 cables. Si necesitas más, usa una **regleta** (hasta 12).
', 2, '761238124470337576');

INSERT OR IGNORE INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES ('ingenieria-energia', 'Generar y guardar energía', 'Ingeniería', '> [!NOTE]
> **En corto:** gasolina da mucho a cualquier hora pero gasta y contamina' || char(59) || ' el sol es gratis pero solo de día' || char(59) || ' el viento va día y noche si sopla' || char(59) || ' la dinamo es para emergencias. La batería guarda lo que sobra. La mejor base combina varias fuentes.

## Las fuentes

![Generador de gasolina](/assets/wiki/ingenieria/generador_gasolina.webp) ![Panel solar](/assets/wiki/ingenieria/panel_solar.webp) ![Aerogenerador](/assets/wiki/ingenieria/aerogenerador.webp) ![Dinamo de pedales](/assets/wiki/ingenieria/dinamo.webp)

| Fuente | Potencia | Lo bueno | Lo malo |
|---|---|---|---|
| Generador de gasolina | 2,2 kW | A cualquier hora, mucha potencia | Combustible, aceite y monóxido |
| Panel solar | 210 W pico (~180 W a mediodía) | Gratis y silencioso | Solo de día' || char(59) || ' nubes, sombra y polvo lo bajan |
| Aerogenerador | 1,5 kW nominal | Día y noche | Necesita viento y altura |
| Dinamo de pedales | Hasta 300 W | Siempre disponible | Te cansa (gasta hambre) |

### Generador de gasolina

Clic con combustible para repostar (depósito de 5 L) y clic sin nada para arrancarlo. Gasta unos 0,3 L/h solo por estar en marcha, así que **no lo dejes encendido sin nada que alimentar**. Necesita aceite cada 12 horas de uso aproximadamente (clic con el aceite de motor)' || char(59) || ' sin aceite, el motor se gripa.

### Panel solar

Rinde según el sol: mucho a mediodía, poco al amanecer, nada de noche. Nublado da un 28 %, con tormenta un 12 %. El polvo lo va tapando: clic para limpiarlo (la lluvia también lo limpia). Que no le dé sombra ningún bloque.

### Aerogenerador

La potencia va con el **cubo** del viento: el doble de viento son ocho veces más energía. Arranca con 3 m/s y se frena solo con tormenta. Ponlo **en alto y lejos de otros bloques**: cuanto más alto, más sopla, y los obstáculos crean turbulencias.

### Dinamo de pedales

Clic para montarte y pulsa **A** y **D** alternándolas. Si aparece **W** o **SALTA** en pantalla, púlsalo a tiempo: pedalada triple. Agáchate para bajar. Da unos 100 W sostenidos: suficiente para una emergencia, no para una base.

> [!TIP]
> Paneles para el día, aerogenerador para la noche y una batería grande en medio: casi nunca te quedarás a oscuras. Deja el generador de gasolina de reserva y haz que arranque solo cuando la batería baje (montaje 2 de [Lógica y automatización](/wiki.html?p=ingenieria-logica)).

## Las baterías

![Batería pequeña](/assets/wiki/ingenieria/bateria_pequena.webp) ![Batería mediana](/assets/wiki/ingenieria/bateria_mediana.webp) ![Batería grande](/assets/wiki/ingenieria/bateria_grande.webp)

| Batería | Energía | Química | En pocas palabras |
|---|---|---|---|
| Pequeña | 480 Wh | Ión-litio | Ligera, conserva su carga al recogerla. No la calientes |
| Mediana | 2,4 kWh | Plomo-ácido | Barata. Sufre con el frío y si la dejas vacía |
| Grande | 9,6 kWh | Litio-ferrofosfato | Miles de ciclos, segura, la mejor para una base |

La batería se carga sola con lo que sobra en su red y da lo que falta. Para saber cuánto te dura: **energía ÷ potencia**. Una mediana (2400 Wh) con 120 W de luces encendidas aguanta 20 horas.

### Cómo cuidarlas

- **Frío**: les quita capacidad (al plomo, muchísima: a -20 °C rinde la mitad). Las de litio **no cargan bajo 0 °C**.
- **Calor**: las envejece. La pequeña, de litio, puede incendiarse y reventar si pasa de 130 °C: no la pongas pegada al generador.
- **Vacía**: la de plomo se estropea si pasa horas por debajo del 20 %.

> [!TIP]
> Guárdalas a cubierto y en una sala templada. Un radiador con termostato en la sala de baterías es una buena inversión en zonas frías.
', 3, '761238124470337576');

INSERT OR IGNORE INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES ('ingenieria-cables', 'Cables y protección', 'Ingeniería', '> [!NOTE]
> **En corto:** el cable de cobre aguanta unos 38 A' || char(59) || ' el grueso, unos 100 A. Si pasa más corriente, se calienta y se quema. Pon un disyuntor de calibre menor que el cable y salta él antes. Para distancias largas, cable grueso o una batería cerca de lo que gasta.

## Los tres cables

| Carrete | Aguanta | Para qué |
|---|---|---|
| Cable de cobre (4 mm²) | ~38 A | Casi todo |
| Cable grueso (16 mm²) | ~100 A | Hornos, radiadores, baterías grandes. Pierde 4 veces menos |
| Cable de señal | Sin energía | Solo lógica: de una salida naranja a una entrada azul |

Todo funciona a **48 voltios**. La corriente que pide un aparato es su potencia entre la tensión: un horno de 3000 W pide unos 62 A, más de lo que aguanta el cable de cobre. Por eso existe el grueso.

### Quitar y cortar

- **Quitar un cable tuyo**: con el carrete en la mano, agachado + clic izquierdo en el cable. Recuperas el cobre.
- **Cortar cualquier cable**: alicates, clic derecho apuntando al cable. Si lleva carga salta un **arco eléctrico**.

## Cuando un cable se calienta

Todo cable tiene resistencia: con mucha corriente pierde energía en forma de calor. Pasados **90 °C** el aislante se daña y a **150 °C** el cable se quema (humo, chispas, y la línea se corta).

> [!WARNING]
> Un cable quemado no avisa dos veces. Si ves la corriente en **rojo** con el carrete en la mano, ese cable va sobrecargado: cámbialo por uno grueso o reparte la carga.

## La distancia también cuenta

Cuanto más largo el cable, más resistencia y más tensión se pierde por el camino. Si algo lejano recibe menos de unos **41 V**, se apaga aunque la batería esté llena. Soluciones: cable grueso, un recorrido más corto o una batería cerca de lo que gasta. El **multímetro** te dice la caída de cada cable.

## Piezas de distribución

![Regleta](/assets/wiki/ingenieria/regleta.webp) ![Interruptor](/assets/wiki/ingenieria/interruptor.webp) ![Disyuntor](/assets/wiki/ingenieria/disyuntor.webp) ![Relé](/assets/wiki/ingenieria/rele.webp) ![Combinador de fuentes](/assets/wiki/ingenieria/combinador.webp) ![Limitador de corriente](/assets/wiki/ingenieria/limitador.webp) ![Vatímetro](/assets/wiki/ingenieria/vatimetro.webp)

Las que van **en medio de un cable** tienen una entrada detrás y una salida delante (con el carrete en la mano lo ves).

- **Regleta**: caja de empalmes. Todo lo que conectes queda unido. Úsala cuando un borne se quede sin sitio (cada borne admite 4 cables' || char(59) || ' la regleta, 12).
- **Interruptor**: corta o deja pasar. Clic para cambiarlo, o cablea su entrada «control» para que lo mande una señal.
- **Disyuntor**: protege el cable. Con 5 veces su calibre salta al momento' || char(59) || ' con el doble, en unos 20 segundos. Clic para rearmarlo. Elige un calibre **menor** que lo que aguanta el cable.
- **Relé**: un interruptor que manda una señal. Es el puente entre la lógica y la potencia: una señal de nada enciende un horno de 3 kW.
- **Combinador de fuentes**: une dos fuentes con diodos. Manda la de más tensión y ninguna se descarga en la otra (por ejemplo, el solar de día y la batería de noche).
- **Limitador de corriente**: deja pasar como mucho los amperios que le digas. Lo que frena lo convierte en calor: ponle un ventilador.
- **Vatímetro**: mide la potencia que pasa y la da como señal. Útil para apagar cosas si la casa pide demasiado.

> [!TIP]
> Esquema seguro para cualquier base: fuentes → batería → **disyuntor** → regleta → todo lo demás. Si algo falla aguas abajo, salta el disyuntor y el resto de la base sigue viva.
', 4, '761238124470337576');

INSERT OR IGNORE INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES ('ingenieria-logica', 'Lógica y automatización', 'Ingeniería', '> [!NOTE]
> **En corto:** las señales van por el cable de señal, de una salida (naranja) a una entrada (azul). 0 es apagado y cualquier otro número es encendido. Los sensores miden, el comparador decide y el relé enciende la potencia. Abajo tienes cinco montajes listos para copiar.

## Cómo funcionan las señales

- Una señal va **de una salida naranja a una entrada azul**, siempre con el carrete de cable de señal.
- Una salida puede ir a muchas entradas.
- **0 = apagada**. Cualquier otro número = encendida.
- Los sensores y las baterías dan **números**: personas, porcentaje de carga, grados, vatios... El **comparador** los convierte en sí o no, y la **pantalla** los enseña.
- Cada pieza tarda un tick en responder.

> [!TIP]
> Casi todos los aparatos tienen una entrada **«control»**. Sin cable, funcionan con su clic. Con un cable de señal en «control», funcionan mientras llegue señal. Así puedes automatizar cualquier cosa.

## Las piezas

![Puerta lógica](/assets/wiki/ingenieria/puerta_logica.webp) ![Inversor](/assets/wiki/ingenieria/inversor.webp) ![Memoria](/assets/wiki/ingenieria/memoria.webp) ![Temporizador](/assets/wiki/ingenieria/temporizador.webp) ![Contador](/assets/wiki/ingenieria/contador.webp) ![Comparador](/assets/wiki/ingenieria/comparador.webp)

| Pieza | Qué hace |
|---|---|
| Puerta lógica | Combina señales. Modos: **Y** (todas), **O** (alguna), **O exclusiva** (un número impar), **No-Y**, **No-O** e **Igualdad** |
| Inversor | El «no»: encendido si no le llega nada |
| Memoria | Recuerda sí o no: «activar», «desactivar» y «alternar». Se mantiene aunque reinicie el servidor |
| Temporizador | **Retardo** (copia la entrada N segundos tarde), **pulso** (N segundos encendido) o **reloj** (parpadea). De 0,05 s a una hora |
| Contador | Cuenta pulsos y se enciende al llegar al objetivo. «reiniciar» lo pone a cero |
| Comparador | Convierte un número en sí o no: mayor, menor, igual... que el valor que elijas |

![Pulsador](/assets/wiki/ingenieria/pulsador.webp) ![Palanca](/assets/wiki/ingenieria/palanca.webp) ![Pantalla](/assets/wiki/ingenieria/pantalla.webp) ![Emisor de radio-enlace](/assets/wiki/ingenieria/emisor_rf.webp) ![Receptor de radio-enlace](/assets/wiki/ingenieria/receptor_rf.webp)

| Pieza | Qué hace |
|---|---|
| Pulsador | Da señal un momento al pulsarlo (1 s, o lo que le pongas) |
| Palanca | Encendida o apagada: la señal más sencilla |
| Pantalla | Enseña el número que le llegue (vatios, %, grados, personas) |
| Emisor y receptor de radio-enlace | Un cable de señal invisible de hasta 160 m entre la misma frecuencia. Un inhibidor enemigo lo deja mudo |

El modo de cada pieza se cambia en su **ficha** (agachado + clic derecho).

## Cinco montajes para copiar

### 1. Luces que se encienden solas de noche

![Montaje de luces de noche](/assets/wiki/ingenieria/esquema-luces.webp)

**Sensor de luz → comparador (menor que 50) → relé.** La energía de las lámparas pasa por el relé: al anochecer, el sensor baja de 50 W/m² y las luces se encienden.

### 2. Generador que arranca solo

- Batería «carga» → comparador (**menor que 20**) → memoria «activar».
- Batería «carga» → comparador (**mayor que 90**) → memoria «desactivar».
- Memoria → «arranque» del generador.

El generador arranca cuando la batería baja del 20 % y se apaga al llegar al 90 %. Sin desperdiciar combustible.

### 3. Puerta que se abre sola a tu clan

![Montaje de la puerta del clan](/assets/wiki/ingenieria/esquema-puerta.webp)

**Sensor de presencia (modo: solo tu clan) → «abrir» de la puerta blindada.** Añade un temporizador en modo retardo en medio para que no se te cierre en las narices.

### 4. Alarma que avisa a tu clan

**Barrera láser en la entrada → contador (objetivo 1) → alarma.** Un pulsador a «reiniciar» del contador la rearma. La alarma avisa a tu clan... si no hay un inhibidor cerca.

### 5. Calefacción automática

**Termómetro → comparador (menor que 18) → relé → radiadores.** En una casa de madera o lana basta con un radiador' || char(59) || ' la piedra se come el calor.

> [!TIP]
> ¿Algo no responde? Con el carrete de señal en la mano, los cables de señal se ven **azules** cuando están encendidos y **naranjas** cuando no. Sigue el color hasta encontrar dónde se corta.
', 5, '761238124470337576');

INSERT OR IGNORE INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES ('ingenieria-aparatos', 'Sensores y aparatos', 'Ingeniería', '> [!NOTE]
> **En corto:** los sensores miden algo (personas, luz, temperatura, viento) y lo dan como número por su salida naranja. Los aparatos gastan energía y hacen el trabajo: luz, calor, frío, riego, fundir metal o hablar por radio. Clic para encender o apagar' || char(59) || ' agachado + clic para su ficha.

## Sensores

![Sensor de presencia](/assets/wiki/ingenieria/sensor_presencia.webp) ![Barrera láser](/assets/wiki/ingenieria/laser.webp) ![Placa de presión](/assets/wiki/ingenieria/placa_presion.webp) ![Sensor de luz](/assets/wiki/ingenieria/sensor_luz.webp) ![Termómetro](/assets/wiki/ingenieria/termostato.webp) ![Anemómetro](/assets/wiki/ingenieria/anemometro.webp)

| Sensor | Da | Detalles |
|---|---|---|
| Presencia | Número de personas | Hasta 12 m. Modos: solo desconocidos, todos o solo tu clan. Ve a quien va invisible (detecta calor) |
| Barrera láser | Encendido si algo corta el haz | Hasta 24 m, hacia fuera de donde la pongas. Haz invisible por defecto |
| Placa de presión | Lo que tiene encima | Jugadores y bichos. No gasta energía |
| Sensor de luz | Irradiancia del sol (W/m²) | ~1000 a mediodía despejado, 0 de noche. No gasta |
| Termómetro | Temperatura del aire (°C) | La de la sala si está en una cerrada |
| Anemómetro | Viento (m/s) a su altura | Útil para frenar el aerogenerador con tormenta |

## Luz

![Lámpara LED](/assets/wiki/ingenieria/lampara.webp) ![Foco](/assets/wiki/ingenieria/foco.webp)

- **Lámpara LED** (12 W): luz máxima a su alrededor. En suelo, pared o techo. Con una batería grande podría estar encendida un mes.
- **Foco** (60 W): ilumina hasta 12 bloques hacia donde apunta. Perfecto con un sensor de presencia en la entrada.

## Calor, frío y aire

![Radiador](/assets/wiki/ingenieria/radiador.webp) ![Nevera](/assets/wiki/ingenieria/nevera.webp) ![Ventilación y filtrado](/assets/wiki/ingenieria/ventilacion.webp) ![Ventilador](/assets/wiki/ingenieria/ventilador.webp) ![Refrigeración líquida](/assets/wiki/ingenieria/refrigeracion.webp)

- **Radiador** (1,5 kW): calienta la sala cerrada en la que esté, con termostato. Fuera, protege de las heladas los cultivos de al lado.
- **Nevera** (27 huecos): mantiene dentro la temperatura que le digas' || char(59) || ' bajo 0 °C es un congelador. Echa su calor a la habitación.
- **Ventilación y filtrado** (60 W): renueva el aire de una sala y se lleva el monóxido y el humo. Cambia el filtro de vez en cuando (clic con un filtro de aire).
- **Ventilador** (25 W): enfría unas 3 veces más los aparatos que tenga cerca.
- **Refrigeración líquida** (40 W): enfría muchísimo lo de alrededor. Necesita agua cerca.

## Trabajo

![Horno de inducción](/assets/wiki/ingenieria/horno.webp) ![Aspersor eléctrico](/assets/wiki/ingenieria/aspersor.webp)

- **Horno de inducción** (hasta 3 kW): funde la mena de metal y la convierte en metal, unos 4 minutos por unidad a tope. Clic para abrirlo: a la izquierda lo que fundir, a la derecha lo fundido. La bobina se calienta: con un ventilador al lado trabaja sin pararse.
- **Aspersor** (80 W): riega los bancales y la tierra de cultivo de alrededor (radio de 1 a 4 bloques). Necesita agua a menos de 5 bloques' || char(59) || ' cuanto más alto está sobre el agua, menos riega.

> [!TIP]
> El horno pide unos 62 A a plena potencia: llévale **cable grueso**. Con cable de cobre se quemará.

## Comunicación y vigilancia

![Estación de radio](/assets/wiki/ingenieria/radio.webp) ![Radar](/assets/wiki/ingenieria/radar.webp)

- **Estación de radio** (15 W escuchando, 40 W hablando, 1,5 km): a menos de 4 bloques, escribe `/radio` seguido de tu mensaje. Te oyen las estaciones del mismo canal y las radios portátiles encendidas en ese canal. También carga las radios portátiles (clic con una).
- **Radio portátil**: clic para encender o apagar, agachado + clic para cambiar de canal. Se carga en una estación.
- **Radar** (400 W, 128 m): ve a los jugadores a cielo abierto (no bajo tierra ni bajo techo) y da el tiempo y la previsión de lluvia. Tu clan sale en verde. Clic para coger su monitor.

Las alarmas, la puerta blindada, las torretas, el inhibidor y la bomba EMP están en [Asaltos y defensa](/wiki.html?p=ingenieria-asaltos).
', 6, '761238124470337576');

INSERT OR IGNORE INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES ('ingenieria-calor-averias', 'Calor, aire y averías', 'Ingeniería', '> [!NOTE]
> **En corto:** todo se calienta al trabajar y se gasta con el uso. Si un aparato se pasa de temperatura o está muy gastado, se avería. Ventiladores para el calor, kit de mantenimiento para el desgaste, y si algo falla: síntoma en la ficha, diagnóstico con el multímetro y reparación en el taller.

## Temperatura

Cada aparato se calienta con la energía que pierde y se enfría con el aire de alrededor. Si pasa de su temperatura máxima, se avería. Lo que más calienta: el generador, el horno, los limitadores y las baterías trabajando a tope.

- Un **ventilador** al lado lo enfría unas 3 veces más.
- La **refrigeración líquida**, mucho más (y su calor no va a la sala).

## Salas cerradas

Cualquier sitio cerrado es una **sala**: guarda el calor, el frío y el humo. Las paredes importan:

| Material | Aislamiento |
|---|---|
| Lana | Excelente |
| Madera | Muy bueno |
| Tierra | Regular |
| Piedra | Malo: se come el calor |
| Cristal | Casi nulo |

En una casa de madera o lana basta un radiador' || char(59) || ' en una de piedra harán falta varios. El multímetro, con clic al aire, te dice cómo está la sala en la que estás.

## Monóxido de carbono

> [!DANGER]
> El generador de gasolina echa **monóxido**. En una sala cerrada se acumula: primero mareo, luego lentitud, después daño... y la muerte. Ponlo fuera o con **ventilación**. El multímetro mide cuánto hay en el aire.

## Averías

Los aparatos se desgastan con las horas de uso, y el doble cuanto más calientes trabajan. Cuanto más gastados, más fallan. Las averías también llegan por golpes, por sobrecalentamiento o por un EMP.

![Multímetro](/assets/wiki/ingenieria/multimetro.webp) ![Caja de herramientas](/assets/wiki/ingenieria/caja_herramientas.webp) ![Kit de mantenimiento](/assets/wiki/ingenieria/kit_mantenimiento.webp)

**Cómo arreglar algo:**

1. **Síntoma**: lo ves en la ficha del aparato (agachado + clic derecho).
2. **Diagnóstico**: clic con el **multímetro** en el aparato. Te dice qué pieza ha fallado y qué repuestos necesitas.
3. **Reparación**: clic con la **caja de herramientas** para abrir el taller. Es un trabajo de unos segundos junto al aparato, con los repuestos en el inventario.

**Repuestos**: aceite de motor, bujía, filtro de aire y placa de circuito (esta última también repara lo quemado por un EMP).

> [!TIP]
> Más vale prevenir: un **kit de mantenimiento** en el taller baja el desgaste un 60 %. Y no olvides el aceite del generador: sin él se gripa.
', 7, '761238124470337576');

INSERT OR IGNORE INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES ('ingenieria-asaltos', 'Asaltos y defensa', 'Ingeniería', '> [!NOTE]
> **En corto:** para atacar una base, corta su energía: alicates, golpes, explosivos, un inhibidor que corta sus avisos o una bomba EMP que quema su electrónica. Sin corriente, la puerta blindada se puede forzar. Para defenderte: cables por dentro, batería de reserva en la puerta, metal alrededor de lo importante, alarmas y torretas.

## Defensa

![Puerta blindada](/assets/wiki/ingenieria/puerta_electrica.webp) ![Alarma](/assets/wiki/ingenieria/alarma.webp) ![Torreta de bobinas](/assets/wiki/ingenieria/torreta.webp)

### Puerta blindada

Corredera de 2 × 3 bloques con motor y cerradura magnética. **Tu clan la abre con un clic**' || char(59) || ' los demás necesitan el código del teclado (lo pones en su ficha). Cablea su entrada «abrir» para automatizarla.

> [!WARNING]
> La cerradura necesita corriente. Si te cortan los cables o te lanzan un EMP, la puerta **se puede forzar a mano** con clics seguidos. Una batería pequeña junto a la puerta es un buen seguro.

### Alarma

Sirena y luz giratoria. Lo más fácil: ponla y dale corriente' || char(59) || ' salta con desconocidos a 6 bloques y **avisa a tu clan** aunque estéis lejos. Para algo más fino, cablea su «control» con láseres, placas o contadores.

### Torreta de bobinas

Un cañón Gauss: carga sus condensadores de la red (800 W) y dispara dardos de acero a los desconocidos, uno cada 3,5 segundos aproximadamente. **No apunta a tu clan.** Cárgala con dardos (clic' || char(59) || ' agachado, todos).

## Ataque

![Inhibidor](/assets/wiki/ingenieria/inhibidor.webp) ![Bomba EMP](/assets/wiki/ingenieria/bomba_emp.webp) ![Alicates](/assets/wiki/ingenieria/alicates.webp)

- **Cortar cables** con alicates (si llevan carga, salta un arco).
- **Romper aparatos** a golpes (las hachas y los picos hacen más daño) o con explosivos. Lo que pierde su apoyo, cae.
- **Inhibidor** (32 m de radio): llena de ruido radios, radio-enlaces, radar y avisos de alarma. La alarma sonará, pero **no avisará a nadie lejos**. Lo cableado no se puede inhibir.
- **Bomba EMP** (14 m de radio): clic para armarla, 10 segundos de cuenta atrás. Quema la electrónica cercana hasta que la reparen. Se puede romper a golpes antes de que estalle.

## Cómo defenderte bien

1. **Cables por dentro**, no a la vista ni por fuera de los muros.
2. **Batería de reserva** junto a la puerta y a lo importante.
3. **Metal alrededor** de lo que no puede fallar: cada bloque de metal entre la bomba y el aparato divide el pulso entre 10 (jaula de Faraday).
4. **Sensores cableados** en lugar de radio-enlaces: un inhibidor no los calla.
5. **Repuestos guardados**: placas de circuito para reparar lo quemado.

> [!TIP]
> Un buen asalto empieza por el inhibidor y sigue por los cables. Una buena defensa da por hecho que eso va a pasar.
', 8, '761238124470337576');

INSERT OR IGNORE INTO wiki_pages (slug, title, category, content, position, updated_by) VALUES ('ingenieria-fisica', 'Para curiosos: la física', 'Ingeniería', '> [!NOTE]
> **Página opcional.** No hace falta leerla para jugar. Es para quien quiera saber por qué las cosas se comportan como se comportan.

Toda la ingeniería funciona en unidades reales y en **tiempo real**: un vatio es un julio por segundo de verdad. Si algo te sorprende, probablemente pase lo mismo en la vida real.

## Electricidad

La red es un bus de **corriente continua a 48 V**, el de las instalaciones aisladas reales (las fuentes cargan a 56 V y la electrónica se apaga por debajo de 40,8 V). Cada red se resuelve con las **leyes de Kirchhoff y de Ohm**, como en un simulador de circuitos.

- Ohm: **V = I · R**
- Potencia: **P = V · I = I² · R**
- Resistencia de un cable: **R = ρ · 2L / S** (ρ del cobre = 1,68 · 10⁻⁸ Ω·m, y sube con la temperatura)

Por eso un cable largo y fino pierde tensión, y por eso un cable sobrecargado se calienta.

## Baterías

Cada química tiene su curva de tensión real. Incluyen el **efecto Peukert** (descargar deprisa da menos energía), la pérdida de capacidad con el frío, el envejecimiento por ciclos y por calor (**ley de Arrhenius**: la vida se divide entre dos por cada 10 °C de más), la sulfatación del plomo y la fuga térmica del litio.

## Sol y viento

- Sol: **G = 1098 · sen α · e^(−0,057 / sen α)** (modelo de Haurwitz con la altura del sol de Minecraft), más nubes, sombra, temperatura de la célula y suciedad.
- Viento: **P = ½ · ρ · A · v³ · Cp**, con el viento creciendo con la altura según la **ley de Hellmann**: v = v₁₀ · (h / 10)^0,14.

## Calor y aire

- Cada aparato es un cuerpo que se calienta y se enfría según la **ley de enfriamiento de Newton**: C · dT/dt = Q − h·A·ΔT.
- Las salas cerradas se calculan con su volumen, la transmitancia de cada material de pared (lana 0,04' || char(59) || ' madera 0,13' || char(59) || ' tierra 0,85' || char(59) || ' piedra 1,3' || char(59) || ' cristal 5,8 W/m²·K), la renovación del aire y el calor de aparatos y personas.
- El **monóxido** se acumula en la sala y se mide en ppm' || char(59) || ' sus efectos siguen el nivel de carboxihemoglobina en sangre (algo acelerado para que se note en una partida).

## Lo demás

- Bomba del aspersor: **Q = η · P / (ρ · g · H)**
- Fundir metal: **E = m · (c · ΔT + L)**. Fundir medio kilo de hierro son 464 kJ.
- Nevera: rendimiento limitado por el ciclo de **Carnot**.
- Radar: el alcance crece con la **raíz cuarta** de la potencia.
- Inhibidor: el ruido cae con el **cuadrado** de la distancia.
- EMP: el campo cae con **1/r** y cada bloque de metal lo atenúa 20 dB.
- Torreta: 2,5 kJ por disparo con un 3 % de rendimiento: 75 J, un dardo de 20 g a 87 m/s.
', 9, '761238124470337576');
