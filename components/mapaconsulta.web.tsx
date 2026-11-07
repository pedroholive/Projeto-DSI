import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  latitude: number;
  longitude: number;
  titulo?: string;
}

// Versão do navegador: mapa do OpenStreetMap embutido (react-native-maps não roda na web)
export default function MapaConsulta({ latitude, longitude }: Props) {
  const d = 0.005;
  const caixa = `${longitude - d},${latitude - d},${longitude + d},${latitude + d}`;
  const src =
    'https://www.openstreetmap.org/export/embed.html' +
    `?bbox=${caixa}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <View style={styles.caixa}>
      {React.createElement('iframe', {
        src,
        style: { width: '100%', height: '100%', border: 0 },
        title: 'Mapa da consulta',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E0EAE8',
  },
});