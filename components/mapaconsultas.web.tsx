
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
    // Mantém os dados seguros ao inseri-los no iframe.
    const dados = JSON.stringify(marcadores)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <meta name="referrer" content="origin" />

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

    /* =========================================
       MARCADOR NO ESTILO DO FIGMA
    ========================================= */

    .marcador-pino {
      width: 36px;
      height: 46px;
      filter: drop-shadow(
        0 3px 3px rgba(0, 0, 0, 0.24)
      );
    }

    .marcador-pino svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* =========================================
       POPUP DAS CONSULTAS
    ========================================= */

    .leaflet-popup-content-wrapper {
      border-radius: 15px;
      padding: 0;
      box-shadow:
        0 5px 24px rgba(30, 60, 55, 0.18);
    }

    .leaflet-popup-content {
      margin: 0;
      width: 270px !important;
      max-width: 270px;
      font-family:
        Arial, Helvetica, sans-serif;
      color: #333E3C;
      font-size: 13px;
    }

    .popup-container {
      padding: 15px;
    }

    .popup-cabecalho {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      margin-bottom: 10px;
    }

    .popup-pino {
      flex: 0 0 auto;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-top: 3px;
      border: 2px solid #FFFFFF;
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.1);
    }

    .popup-local {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      line-height: 1.45;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .popup-resumo {
      margin-bottom: 12px;
      padding: 7px 10px;
      border-radius: 8px;
      background: #E8F2F0;
      color: #0E766D;
      font-size: 11px;
      font-weight: 700;
    }

    .popup-lista {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
      padding-right: 3px;
    }

    .popup-consulta {
      padding: 10px;
      border: 1px solid #E0EAE8;
      border-left: 3px solid #0E766D;
      border-radius: 8px;
      background: #FAFCFB;
    }

    .popup-data {
      font-size: 12px;
      font-weight: 700;
      color: #333E3C;
      line-height: 1.5;
    }

    .popup-pessoa {
      margin-top: 4px;
      font-size: 12px;
      color: #63736F;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .popup-extra {
      margin-top: 4px;
      font-size: 11px;
      color: #8A9A96;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .popup-rodape {
      margin-top: 12px;
      padding-top: 9px;
      border-top: 1px solid #E0EAE8;
      font-size: 11px;
      line-height: 1.5;
      color: #8A9A96;
    }

    .popup-sem-dados {
      font-size: 12px;
      color: #8A9A96;
    }

    .aviso {
      padding: 16px;
      font-family: Arial, sans-serif;
      color: #333E3C;
      font-size: 13px;
      text-align: center;
    }
  </style>
</head>

<body>
  <div id="mapa"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    (function () {
      const marcadores = ${dados};

      const elemento =
        document.getElementById('mapa');

      if (typeof L === 'undefined') {
        elemento.innerHTML =
          '<div class="aviso">' +
          'Não foi possível carregar o mapa.' +
          '</div>';

        return;
      }

      // =========================================
      // MAPA
      // =========================================

      const mapa = L.map('mapa', {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([-8.0476, -34.8770], 12);

      // Mantém a configuração que corrigiu
      // o erro 403 do OpenStreetMap.

      L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          minZoom: 3,
          referrerPolicy: 'origin',
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
        }
      ).addTo(mapa);

      const limites = [];

      // =========================================
      // ÍCONE NO ESTILO DO FIGMA
      // =========================================

      function criarIcone(cor) {
        const svg =
          '<div class="marcador-pino">' +
            '<svg viewBox="0 0 36 46" ' +
              'xmlns="http://www.w3.org/2000/svg">' +
              '<path ' +
                'd="M18 2 ' +
                  'C9.16 2 2 9.16 2 18 ' +
                  'C2 30.3 18 44 18 44 ' +
                  'S34 30.3 34 18 ' +
                  'C34 9.16 26.84 2 18 2Z" ' +
                'fill="' + cor + '" ' +
                'stroke="#FFFFFF" ' +
                'stroke-width="1.5"' +
              '/>' +
              '<circle ' +
                'cx="18" ' +
                'cy="18" ' +
                'r="6.5" ' +
                'fill="rgba(0,0,0,0.22)"' +
              '/>' +
            '</svg>' +
          '</div>';

        return L.divIcon({
          className: '',
          html: svg,
          iconSize: [36, 46],
          iconAnchor: [18, 44],
          popupAnchor: [0, -39]
        });
      }

      // =========================================
      // POPUP ORGANIZADO
      // =========================================

      function criarElemento(
        tag,
        classe,
        texto
      ) {
        const elemento =
          document.createElement(tag);

        if (classe) {
          elemento.className = classe;
        }

        if (texto !== undefined) {
          elemento.textContent = String(texto);
        }

        return elemento;
      }

      function criarPopup(marcador, cor) {
        const container = criarElemento(
          'div',
          'popup-container'
        );

        // Cabeçalho
        const cabecalho = criarElemento(
          'div',
          'popup-cabecalho'
        );

        const pino = criarElemento(
          'div',
          'popup-pino'
        );

        pino.style.backgroundColor = cor;

        const nomeLocal = criarElemento(
          'div',
          'popup-local',
          marcador.titulo || 'Local da consulta'
        );

        cabecalho.appendChild(pino);
        cabecalho.appendChild(nomeLocal);

        container.appendChild(cabecalho);

        // O campo descricao pode conter várias
        // consultas separadas por quebra de linha.
        const linhas = String(
          marcador.descricao || ''
        )
          .split('\\n')
          .map(function (linha) {
            return linha.trim();
          })
          .filter(Boolean);

        const total = linhas.length;

        const resumo = criarElemento(
          'div',
          'popup-resumo',
          total === 1
            ? '1 consulta neste local'
            : total + ' consultas neste local'
        );

        container.appendChild(resumo);

        const lista = criarElemento(
          'div',
          'popup-lista'
        );

        if (total === 0) {
          lista.appendChild(
            criarElemento(
              'div',
              'popup-sem-dados',
              'Sem detalhes adicionais.'
            )
          );
        }

        linhas.forEach(function (linha) {
          const item = criarElemento(
            'div',
            'popup-consulta'
          );

          item.style.borderLeftColor = cor;

          // Formato atualmente enviado pelo app:
          // 17/11/2026 às 08:30 · Nome
          //
          // Também aceita descrições diferentes,
          // sem esconder informações.

          const encontrado = linha.match(
            /^(\\d{2}\\/\\d{2}\\/\\d{4})\\s+às\\s+(\\d{2}:\\d{2})\\s*·\\s*(.*)$/
          );

          if (encontrado) {
            const data = encontrado[1];
            const horario = encontrado[2];
            const pessoa = encontrado[3];

            item.appendChild(
              criarElemento(
                'div',
                'popup-data',
                data + ' às ' + horario
              )
            );

            if (pessoa) {
              item.appendChild(
                criarElemento(
                  'div',
                  'popup-pessoa',
                  pessoa
                )
              );
            }
          } else {
            item.appendChild(
              criarElemento(
                'div',
                'popup-pessoa',
                linha
              )
            );
          }

          lista.appendChild(item);
        });

        container.appendChild(lista);

        // Rodapé informativo
        container.appendChild(
          criarElemento(
            'div',
            'popup-rodape',
            'Use "Abrir rota" na lista abaixo do mapa para navegar até este local.'
          )
        );

        return container;
      }

      // =========================================
      // ADICIONAR MARCADORES
      // =========================================

      marcadores.forEach(function (marcador) {
        const latitude =
          Number(marcador.latitude);

        const longitude =
          Number(marcador.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return;
        }

        // Preserva a cor de cada marcador.
        const cor =
          /^#[0-9a-fA-F]{6}$/.test(marcador.cor)
            ? marcador.cor
            : '#0E766D';

        const pino = L.marker(
          [latitude, longitude],
          {
            icon: criarIcone(cor),
            title:
              marcador.titulo || 'Local da consulta'
          }
        ).addTo(mapa);

        pino.bindPopup(
          criarPopup(marcador, cor),
          {
            maxWidth: 300,
            minWidth: 260,
            autoPan: true,
            closeButton: true
          }
        );

        limites.push([latitude, longitude]);
      });

      // =========================================
      // ZOOM AUTOMÁTICO
      // =========================================

      if (limites.length === 1) {
        mapa.setView(limites[0], 15);
      } else if (limites.length > 1) {
        mapa.fitBounds(limites, {
          padding: [40, 40],
          maxZoom: 15
        });
      }

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
