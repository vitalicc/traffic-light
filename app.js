
const trafficLightCycle = [
  { color: '🟥', duration: 10 },
  { color: '🟨', duration: 3 },
  { color: '🟢', duration: 7 }
];
let currentIndex = 0;
let remaining = trafficLightCycle[currentIndex].duration;

function updateDisplay() {
  const current = trafficLightCycle[currentIndex];
  document.getElementById('colorDisplay').innerHTML =
    `Цвет: ${current.color} <br/> До смены: ${remaining} с`;
}

/*setInterval(() => {
  remaining--;
  if (remaining <= 0) {
    currentIndex = (currentIndex + 1) % trafficLightCycle.length;
    remaining = trafficLightCycle[currentIndex].duration;
  }
  updateDisplay();
}, 1000);*/

// Инициализация карты
const map = L.map('map').setView([49.083798038160786, 33.4204394941353], 17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Светофор
/*L.circleMarker([49.083798038160786, 33.4204394941353], {
  radius: 10,
  color: 'black',
  fillColor: 'lime',
  fillOpacity: 1
}).addTo(map).bindPopup('Светофор');

// Отображение местоположения пользователя
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const marker = L.circleMarker([lat, lon], {
        radius: 8,
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 0.7
      }).addTo(map).bindPopup("Вы здесь");
      map.setView([lat, lon], 17);
    },
    (err) => {
      console.warn("Не удалось получить геолокацию:", err.message);
    }
  );
} else {
  alert("Ваш браузер не поддерживает геолокацию");
}*/
