
import React, {
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { View, StyleSheet } from 'react-native';

type CoordenadasMapa = {
  latitude: number;
  longitude: number;
};

type Props = {
  coordenadas: CoordenadasMapa;
  onChange: (coordenadas: CoordenadasMapa) => void;
};

export default function MapaAjuste({
  coordenadas,
  onChange,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const onChangeRef = useRef(onChange);

  const coordenadasIniciais = useRef({
    latitude: coordenadas.latitude,
    longitude: coordenadas.longitude,
  });

  // Mantém a função atualizada sem recarregar o mapa.
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Recebe a posição escolhida dentro do mapa.
  useEffect(() => {
    function receberMensagem(evento: MessageEvent) {
      if (
        evento.source !==
        iframeRef.current?.contentWindow
      ) {
        return;
      }

      const dados = evento.data;

      if (
        !dados ||
        dados.tipo !== 'healthsync-ajuste-mapa'
      ) {
        return;
      }

      const latitude = dados.latitude;
      const longitude = dados.longitude;

      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return;
      }

      onChangeRef.current({
        latitude,
        longitude,
      });
    }

    window.addEventListener(
      'message',
      receberMensagem
    );

    return () => {
      window.removeEventListener(
        'message',
        receberMensagem
      );
    };
  }, []);

  // O HTML é criado uma única vez para não reiniciar
  // o mapa toda vez que o marcador for movimentado.
  const html = useMemo(() => {
    const latitude =
      coordenadasIniciais.current.latitude;

    const longitude =
      coordenadasIniciais.current.longitude;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    #mapa {
      width: 100%;
      height: 100%;
    }

    .mensagem {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      z-index: 1000;
      background: white;
      padding: 8px;
      border-radius: 8px;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 12px;
      box-shadow: 0 2px 8px #0002;
      pointer-events: none;
    }
  </style>
</head>

<body>
  <div id="mapa"></div>

  <div class="mensagem">
    Arraste o marcador ou toque no mapa.
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    const latitudeInicial = ${latitude};
    const longitudeInicial = ${longitude};

    const mapa = L.map('mapa').setView(
      [latitudeInicial, longitudeInicial],
      17
    );

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; Contribuidores do OpenStreetMap',
        maxZoom: 19
      }
    ).addTo(mapa);

    const marcador = L.marker(
      [latitudeInicial, longitudeInicial],
      {
        draggable: true,
        autoPan: true
      }
    ).addTo(mapa);

    // Envia as novas coordenadas para o React Native Web.
    function enviarCoordenadas(latitude, longitude) {
      window.parent.postMessage(
        {
          tipo: 'healthsync-ajuste-mapa',
          latitude: latitude,
          longitude: longitude
        },
        '*'
      );
    }

    // Quando o marcador é arrastado.
    marcador.on('dragend', function () {
      const posicao = marcador.getLatLng();

      enviarCoordenadas(
        posicao.lat,
        posicao.lng
      );
    });

    // Quando o usuário toca ou clica no mapa.
    mapa.on('click', function (evento) {
      marcador.setLatLng(evento.latlng);

      enviarCoordenadas(
        evento.latlng.lat,
        evento.latlng.lng
      );
    });

    setTimeout(function () {
      mapa.invalidateSize();
    }, 200);
  </script>
</body>
</html>
`;
  }, []);

  return (
    <View style={styles.container}>
      {React.createElement('iframe', {
        ref: iframeRef,
        srcDoc: html,
        title: 'Ajustar localização da consulta',
        style: {
          width: '100%',
          height: 320,
          border: 'none',
          borderRadius: 12,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E7F8F4',
  },
});
