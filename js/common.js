/**
 * Common utilities for Tork AR
 */

(function() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let clickBuffer = null;

    // Precargamos el sonido para evitar latencia (sonido inmediato)
    fetch('public/assets/sounds/boton.mp3')
        .then(response => response.arrayBuffer())
        .then(data => audioContext.decodeAudioData(data))
        .then(buffer => {
            clickBuffer = buffer;
        })
        .catch(e => console.error("Error cargando sonido del botón:", e));

    window.playClick = () => {
        if (clickBuffer) {
            // Aseguramos que el AudioContext esté activo (necesario en iPhone)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const source = audioContext.createBufferSource();
            source.buffer = clickBuffer;

            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0.25; // Volumen reducido al 25%

            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            source.start(0);
        }
    };

    // Agregar listener global para clics en botones y enlaces
    document.addEventListener('DOMContentLoaded', () => {
        document.body.addEventListener('click', (e) => {
            const clickable = e.target.closest('button, a');
            if (clickable && !clickable.hasAttribute('data-no-click-sound')) {
                window.playClick();
            }
        });
    });
})();
