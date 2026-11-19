import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { MarcadorMapa } from './mapaconsultas.types';

interface Props {
  marcadores: MarcadorMapa[];
}

function montarHtml(marcadores: MarcadorMapa[]): string {
  // "<" escapado para que nenhum texto de consulta feche a tag <script>.
  const dados = JSON.stringify(marcadores).replace(
    /</g,
    '\\u003c'
  );

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#mapa{height:100%;margin:0}</style>
</head>
<body>
<div id="mapa"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var dados = ${dados};
var mapa = L.map('mapa');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; colaboradores do OpenStreetMap'
}).addTo(mapa);
var pontos = [];
dados.forEach(function (m) {
  var icone = L.divIcon({
    className: '',
    html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:' + m.cor + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22]
  });
  var marcador = L.marker([m.latitude, m.longitude], { icon: icone }).addTo(mapa);
  var caixa = document.createElement('div');
  var titulo = document.createElement('strong');
  titulo.textContent = m.titulo;
  caixa.appendChild(titulo);
  m.descricao.split('\\n').forEach(function (linha) {
    caixa.appendChild(document.createElement('br'));
    caixa.appendChild(document.createTextNode(linha));
  });
  marcador.bindPopup(caixa);
  pontos.push([m.latitude, m.longitude]);
});
if (pontos.length === 1) {
  mapa.setView(pontos[0], 16);
} else if (pontos.length > 1) {
  mapa.fitBounds(pontos, { padding: [40, 40] });
} else {
  mapa.setView([-8.05, -34.9], 11);
}
</script>
</body>
</html>`;
}

// Versão do navegador: Leaflet com OpenStreetMap dentro de um iframe
// (react-native-maps não roda na web).
export default function MapaConsultas({ marcadores }: Props) {
  return (
    <View style={styles.caixa}>
      {React.createElement('iframe', {
        srcDoc: montarHtml(marcadores),
        sandbox: 'allow-scripts',
        title: 'Mapa das consultas',
        style: { width: '100%', height: '100%', border: 0 },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    height: 420,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E0EAE8',
  },
});
