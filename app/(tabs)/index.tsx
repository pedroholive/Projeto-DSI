import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TelaInicial() {
  return (
    <SafeAreaView style={styles.main}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/logo-healthsync.png')}
          style={styles.logoImagem}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.nomeApp}>HealthSync</Text>

      <Text style={styles.fraseImpacto}>
        Sua vida em equilíbrio. Comece hoje a acompanhar sua saúde.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
        <Ionicons name="arrow-forward" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F8F7",
    gap: 8,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: "#DCEAE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoImagem: {
    width: 80,
    height: 80,
  },
  nomeApp: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0E766D",
  },
  button: {
    width: 64,
    height: 64,
    backgroundColor: "#0E766D",
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  textbutton: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "bold",
  },
  fraseImpacto: {
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 18,
    color: "#5A6D69",
    paddingHorizontal: 30,
    lineHeight: 26,
  },
});