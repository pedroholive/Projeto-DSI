import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { MarcadorMapa } from './mapaconsultas.types';

interface Props {
  marcadores: MarcadorMapa[];
}

const MARGEM = { top: 70, right: 60, bottom: 70, left: 60 };

// Versão do celular (Expo Go): Apple Maps no iPhone e Google Maps no Android.
// Mostra um marcador de cor própria para cada local de consulta.
export default function MapaConsultas({ marcadores }: Props) {
  const mapa = useRef<MapView>(null);

  function ajustarVisao() {
    if (marcadores.length === 0) {
      return;
    }

    mapa.current?.fitToCoordinates(
      marcadores.map((m) => ({
        latitude: m.latitude,
        longitude: m.longitude,
      })),
      { edgePadding: MARGEM, animated: false }
    );
  }

  useEffect(() => {
    ajustarVisao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcadores]);

  const primeiro = marcadores[0];

  return (
    <View style={styles.caixa}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        onMapReady={ajustarVisao}
        initialRegion={
          primeiro
            ? {
                latitude: primeiro.latitude,
                longitude: primeiro.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : undefined
        }
      >
        {marcadores.map((m) => (
          <Marker
            key={m.id}
            coordinate={{
              latitude: m.latitude,
              longitude: m.longitude,
            }}
            title={m.titulo}
            description={m.descricao.replace(/\n/g, ' | ')}
            pinColor={m.cor}
          />
        ))}
      </MapView>
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
