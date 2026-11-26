
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
    MarcadorMapa,
} from './mapaconsultas.types';

interface Props {
  marcadores: MarcadorMapa[];
}

export default function MapaConsultas({
  marcadores,
}: Props) {
  const htmlMapa = useMemo(() => {
    // Evita que dados das consultas sejam interpretados
    // como código HTML ou JavaScript.
    const dados = JSON.stringify(marcadores)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <meta
    name="referrer"
    content="origin"
  />

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #E8F2F0;
    }

    #mapa {
      width: 100%;
      height: 100%;
    }

    .marcador {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      box-sizing: border-box;
    }

    .leaflet-popup-content {
      font-family: Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #333E3C;
    }

    .leaflet-popup-content strong {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      color: #0E766D;
    }

    .aviso {
      position: absolute;
      z-index: 1000;
      bottom: 25px;
      left: 10px;
      right: 10px;
      padding: 10px;
      border-radius: 8px;
      background: white;
      color: #333E3C;
      font-family: Arial, sans-serif;
      font-size: 12px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
  </style>
</head>

<body>
  <div id="mapa"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    (function () {
      const marcadores = ${dados};

      const elemento = document.getElementById('mapa');

      if (typeof L === 'undefined') {
        elemento.innerHTML =
          '<div class="aviso">Não foi possível carregar o Leaflet.</div>';
        return;
      }

      // Centro inicial do mapa.
      // Será substituído pelas coordenadas das consultas.
      const mapa = L.map('mapa', {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([-8.0476, -34.8770], 12);

      // =============================================
      // CAMADA DO OPENSTREETMAP
      // =============================================

      const camada = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          minZoom: 3,

          // Permite enviar a origem da aplicação
          // como referência para o servidor de mapas.
          referrerPolicy: 'origin',

          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
        }
      );

      camada.addTo(mapa);

      // =============================================
      // MARCADORES
      // =============================================

      const limites = [];

      function criarConteudoPopup(marcador) {
        const container = document.createElement('div');

        const titulo = document.createElement('strong');
        titulo.textContent =
          marcador.titulo || 'Local de consulta';

        container.appendChild(titulo);

        if (marcador.descricao) {
          const descricao = document.createElement('div');

          descricao.style.whiteSpace = 'pre-line';
          descricao.textContent = marcador.descricao;

          container.appendChild(descricao);
        }

        return container;
      }

      marcadores.forEach(function (marcador) {
        const latitude = Number(marcador.latitude);
        const longitude = Number(marcador.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return;
        }

        const cor = /^#[0-9a-fA-F]{6}$/.test(marcador.cor)
          ? marcador.cor
          : '#0E766D';

        const icone = L.divIcon({
          className: '',
          html:
            '<div class="marcador" style="background-color:' +
            cor +
            '"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12]
        });

        const pino = L.marker(
          [latitude, longitude],
          { icon: icone }
        ).addTo(mapa);

        pino.bindPopup(criarConteudoPopup(marcador));

        limites.push([latitude, longitude]);
      });

      // =============================================
      // AJUSTE AUTOMÁTICO DA VISUALIZAÇÃO
      // =============================================

      if (limites.length === 1) {
        mapa.setView(limites[0], 15);
      } else if (limites.length > 1) {
        mapa.fitBounds(limites, {
          padding: [40, 40],
          maxZoom: 15
        });
      }

      // Corrige dimensões caso o iframe seja
      // redimensionado depois do carregamento.
      setTimeout(function () {
        mapa.invalidateSize();
      }, 250);

    })();
  </script>
</body>
</html>
`;
  }, [marcadores]);

  return (
    <View style={styles.container}>
      {React.createElement('iframe', {
        srcDoc: htmlMapa,
        title: 'Mapa geral das consultas',
        referrerPolicy: 'origin',
        style: {
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: 12,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 350,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E0EAE8',
  },
});
