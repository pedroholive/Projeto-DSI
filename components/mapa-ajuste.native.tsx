
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import MapView, {
  Marker,
  type MapPressEvent,
  type MarkerDragStartEndEvent,
} from 'react-native-maps';

export type CoordenadasMapa = {
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
  const mapaRef = useRef<MapView>(null);

  useEffect(() => {
    mapaRef.current?.animateToRegion(
      {
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      250
    );
  }, []);

  // Verifica se a localização possui coordenadas válidas.
  function pontoValido(ponto: CoordenadasMapa) {
    return (
      Number.isFinite(ponto.latitude) &&
      Number.isFinite(ponto.longitude) &&
      ponto.latitude >= -90 &&
      ponto.latitude <= 90 &&
      ponto.longitude >= -180 &&
      ponto.longitude <= 180
    );
  }

  // Atualiza a posição selecionada.
  function atualizar(ponto: CoordenadasMapa) {
    if (pontoValido(ponto)) {
      onChange(ponto);
    }
  }

  // Permite tocar em qualquer lugar do mapa para posicionar o pino.
  function tocarMapa(evento: MapPressEvent) {
    atualizar(evento.nativeEvent.coordinate);
  }

  // Permite arrastar o marcador e soltar na posição desejada.
  function arrastarPino(evento: MarkerDragStartEndEvent) {
    atualizar(evento.nativeEvent.coordinate);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapaRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        }}
        onPress={tocarMapa}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        showsCompass
      >
        <Marker
          coordinate={coordenadas}
          draggable
          pinColor="#0E766D"
          title="Localização da consulta"
          description="Arraste o marcador para ajustar o ponto"
          onDragEnd={arrastarPino}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E0EAE8',
  },
});
