L.Map.include({
    _getNewPixelBounds: function(center, zoom) {
        center = center || this.getCenter();
        zoom = zoom || this.getZoom();
        if (!this._rotate && this.options.mapProto && this.options.mapProto._getNewPixelBounds) {
            return this.options.mapProto._getNewPixelBounds.apply(this, arguments);
        }
        var mapZoom = this._animatingZoom ? Math.max(this._animateToZoom, this.getZoom()) : this.getZoom(),
            scale = this.getZoomScale(mapZoom, zoom),
            pixelCenter = this.project(center, zoom).floor(),
            size = this.getSize(),
            padding = this.options.padding || [0, 0],
            halfSize = new L.Bounds([
                this.containerPointToLayerPoint([0, 0]).floor(),
                this.containerPointToLayerPoint([size.x, 0]).floor(),
                this.containerPointToLayerPoint([0, size.y]).floor(),
                this.containerPointToLayerPoint([size.x, size.y]).floor()
            ]).getSize().divideBy(scale * 2),
            expandFactor = 3.1; // Увеличен коэффициент для более заметного эффекта

        // Увеличиваем halfSize с учётом коэффициента и нормализованного padding
        halfSize = halfSize.multiplyBy(expandFactor).add(new L.Point(padding[0], padding[1]).divideBy(scale * expandFactor));

       // console.log('HalfSize:', halfSize, 'PixelCenter:', pixelCenter, 'Scale:', scale); // Логирование для диагностики

        return new L.Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
    }
});


          // Инициализация карты с вращением
        const map = L.map('map', {
            rotate: true,
            rotateControl: false, // Отключаем контрол вращения
           // padding: 4.0, // Увеличиваем область загрузки тайлов
            center: [49.084295954105094, 33.42003302328799], // Начальный центр (будет скорректирован)
            zoom: 16,
            minZoom: 0,
            maxZoom: 18,
            scrollWheelZoom: true, // Зум колесом мыши
            touchZoom: true, // Зум пальцами
            dragging: true // Перетаскивание
        });



        // Добавляем тайловый слой с увеличенным padding
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            noWrap:false,
            //keepbufe:5,
            //padding: 4, // Увеличиваем область загрузки тайлов
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);




// Переменные для геолокации и вращения
let userLocation = L.latLng([49.084295954105094, 33.42003302328799]);
let userMarker = null;
let lastPosition = null;
let currentBearing = 0;
let targetBearing = 0;
const rotationSpeed = 0.05; // Уменьшили для более плавного вращения
const minSpeed = 1.0; // Минимальная скорость для вращения (м/с)
const minDistance = 15; // Увеличили минимальное изменение координат для вращения (метры)
const headingHistory = []; // История значений heading для усреднения
const maxHistoryLength = 5; // Количество значений для усреднения
const minHeadingChange = 10; // Минимальное изменение угла для обновления targetBearing (градусы)

// Функция для вычисления расстояния между двумя точками (в метрах)
function calculateDistance(from, to) {
    const R = 6371000;
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLon = ((to.lng - from.lng) * Math.PI) / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Функция для вычисления направления между двумя точками
function calculateBearing(from, to) {
    const lat1 = (from.lat * Math.PI) / 180;
    const lon1 = (from.lng * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const lon2 = (to.lng * Math.PI) / 180;

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;
    return bearing;
}

// Функция для усреднения истории направлений
function averageHeading(history) {
    let sum = 0;
    history.forEach(h => sum += h);
    return sum / history.length;
}

// Функция для нормализации разницы углов (кратчайший путь)
function normalizeAngleDiff(diff) {
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
}

// Функция для обновления позиции пользователя и направления
function updateUserLocation(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    userLocation = L.latLng([lat, lng]);

    if (!userMarker) {
        userMarker = L.circleMarker(userLocation, {
            radius: 8,
            color: 'blue',
            fillColor: 'blue',
            fillOpacity: 0.8
        }).addTo(map).bindPopup("Ти тут 👤");
    } else {
        userMarker.setLatLng(userLocation);
    }

    // Отключаем компас: не используем position.coords.heading
    let shouldRotate = false;
    let heading = null;

    // Проверяем скорость, если доступна
    if (position.coords.speed != null && position.coords.speed >= minSpeed) {
        shouldRotate = true;
    }

    // Если скорость низкая или недоступна, проверяем расстояние
    if (lastPosition && !shouldRotate) {
        const distance = calculateDistance(lastPosition, userLocation);
        if (distance >= minDistance) {
            shouldRotate = true;
        }
    }

    if (shouldRotate && lastPosition) {
        heading = calculateBearing(lastPosition, userLocation);
        // Добавляем в историю и усредняем
        headingHistory.push(heading);
        if (headingHistory.length > maxHistoryLength) {
            headingHistory.shift();
        }
        const averagedHeading = averageHeading(headingHistory);
        const newTarget = -averagedHeading;

        // Проверяем минимальное изменение угла
        const angleDiff = Math.abs(newTarget - targetBearing);
        if (angleDiff >= minHeadingChange) {
            targetBearing = newTarget;
        }
    }

    // Если неподвижен, сохраняем текущий угол
    if (!shouldRotate) {
        targetBearing = currentBearing;
    }

    lastPosition = userLocation;

    // Фиксируем позицию пользователя внизу по центру
    map.setView(userLocation, map.getZoom(), { animate: false });
}

// Функция плавного вращения карты с нормализацией
function animateRotation() {
    let diff = targetBearing - currentBearing;
    diff = normalizeAngleDiff(diff);
    currentBearing += diff * rotationSpeed;
    currentBearing = (currentBearing + 360) % 360; // Нормализация угла
    map.setBearing(currentBearing);
    requestAnimationFrame(animateRotation);
}

// Обработчик события moveend для фиксации позиции пользователя
let fixing = false;
map.on('moveend', function () {
    if (fixing) return;

    fixing = true;
    map.setView(userLocation, map.getZoom(), { animate: false });
    fixing = false;

   // console.log(map.getCenter());
});

// Запускаем начальную фиксацию и анимацию
setTimeout(function () {
    map.setView(userLocation, map.getZoom(), { animate: false });
    requestAnimationFrame(animateRotation);
}, 100);

// --- Геолокация ---
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(updateUserLocation, (err) => {
        console.warn("Геолокація не доступна:", err.message);
        alert("Не вдалося отримати геолокацію. Використовується початкова точка.");
        map.setView(userLocation, map.getZoom(), { animate: false });
    }, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
    });
} else {
    alert("Геолокація не підтримується в цьому браузері.");
    map.setView(userLocation, map.getZoom(), { animate: false });
}


let lights = []; // масив світлофорів, завантажиться з JSON

// Функція визначення фази світлофора
function getLightPhase(currentMs, light) {
  const elapsedMs = currentMs - light._startUnixMs;
  if (elapsedMs < 0) {
    return { color: "off", remainingMs: -elapsedMs };
  }

  const { green, yellow, red } = light.phases;
  const totalCycleMs = (green + yellow + red) * 1000;
  const tMs = elapsedMs % totalCycleMs;

  if (tMs < green * 1000) {
    return { color: "green", remainingMs: green * 1000 - tMs };
  }
  if (tMs < (green + yellow) * 1000) {
    return { color: "yellow", remainingMs: (green + yellow) * 1000 - tMs };
  }
  return { color: "red", remainingMs: totalCycleMs - tMs };
}



// Отримуємо дату та час старту, повертаємо кількість Unix мс дати та часу старту + добові зсуви 
function parseStartTime(dateTimeStr, light) {
  const baseDate = new Date(dateTimeStr);
  const now = new Date();

   // Сегодняшняя дата + стартовое время
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    baseDate.getHours(),
    baseDate.getMinutes(),
    baseDate.getSeconds(),
    baseDate.getMilliseconds()
  );

  // Сколько календарных суток прошло (без учёта времени)
  const baseDateOnly = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const daysPassed = Math.floor((nowDateOnly - baseDateOnly) / 86400000);

  // Сдвиг в мс: каждые сутки + ежедневный сдвиг
  const dailyOffsetMs = daysPassed * light.dailyStartOffset  * 1000;

  return todayStart.getTime() + dailyOffsetMs;
}




// Створення маркера світлофора на карті
function createLightMarker(light) {
  const div = document.createElement('div');
  div.className = 'traffic-light';
  const marker = L.marker(light.coords, {
    icon: L.divIcon({
      className: 'custom-icon',
      html: div.outerHTML
    })
  }).addTo(map);
  light._marker = marker;
  light._startUnixMs = parseStartTime(light.startDateTime, light);
}









// Оновлення стану світлофорів на карті ()
function updateLights() {
    const nowMs = Date.now();
    lights.forEach(light => {
      const { color, remainingMs } = getLightPhase(nowMs, light);

      let htmlContent;
      if (color === 'off') {
        htmlContent = `<div class="traffic-light" style="background:gray">
          <div class="timer">Старт через ${(remainingMs / 1000).toFixed(1)}s</div>
        </div>`;
      } else {
        htmlContent = `
        <div class="traffic-light" style="background:black">
            ${light.description || 'Без названия'}
          <div class="timer" style="color:${color}">
            ${Math.ceil(remainingMs / 1000)}s
          </div>
        </div>`;
      }

      light._marker.setIcon(L.divIcon({
        className: 'custom-icon',
        html: htmlContent
      }));
    });
}

// Ініціалізація світлофорів після завантаження даних
/*function loopLights() {
  updateLights();
  setInterval(loopLights, 100);
}
*/

// 1 функция - инициализация! Вызываются ф-ии createLightMarker и в них передаются объекты свет
function initializeLights() {
  lights.forEach(createLightMarker);
  updateLights(); // первый вызов сразу
  setInterval(updateLights, 100);   // дальше — синхронно с секундами
}

// Завантаження даних світлофорів з JSON
fetch('lights.json')
  .then(response => {
    if (!response.ok) throw new Error('Не вдалося завантажити lights.json');
    return response.json();
  })
  .then(data => {
    lights = data;
    initializeLights();
  })
  .catch(err => console.error(err));

/*// --- Користувач на карті ---
let userMarker = null;

function updateUserLocation(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  if (!userMarker) {
    userMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: 'blue',
      fillColor: 'blue',
      fillOpacity: 0.8
    }).addTo(map).bindPopup("Ти тут 👤");
  } else {
    userMarker.setLatLng([lat, lng]);
  }
}

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(updateUserLocation, (err) => {
    console.warn("Геолокація не доступна:", err.message);
  }, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 10000
  });
} else {
  alert("Геолокація не підтримується в цьому браузері.");
}*/
