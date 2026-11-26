import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface Props {
  latitude: number;
  longitude: number;
  titulo?: string;
}

// Versão do celular (Expo Go): Apple Maps no iPhone e Google Maps no Android
export default function MapaConsulta({ latitude, longitude, titulo }: Props) {
  return (
    <View style={styles.caixa}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        scrollEnabled
        zoomEnabled
      >
        <Marker coordinate={{ latitude, longitude }} title={titulo} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    height: 300,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E0EAE8',
  },
});