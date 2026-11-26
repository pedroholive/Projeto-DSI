
import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type CoordenadasMapa = {
  latitude: number;
  longitude: number;
};

export type PropsMapaAjuste = {
  coordenadas: CoordenadasMapa;
  onChange: (coordenadas: CoordenadasMapa) => void;
};

export default function MapaAjuste({
  coordenadas,
}: PropsMapaAjuste) {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>
        Mapa interativo indisponível nesta plataforma.
      </Text>

      <Text style={styles.coordenadas}>
        Latitude: {coordenadas.latitude.toFixed(6)}
      </Text>

      <Text style={styles.coordenadas}>
        Longitude: {coordenadas.longitude.toFixed(6)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#F4F8F7',
    borderWidth: 1,
    borderColor: '#E0EAE8',
  },

  texto: {
    color: '#52615E',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },

  coordenadas: {
    color: '#0E766D',
    fontSize: 12,
    textAlign: 'center',
  },
});
