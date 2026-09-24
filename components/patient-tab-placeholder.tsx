import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Props = { title: string; description: string; icon: IoniconName };

export function PatientTabPlaceholder({ title, description, icon }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}><Ionicons name={icon} size={34} color="#079A91" /></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F5F7' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconContainer: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#E8FAF7', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { color: '#20283A', fontSize: 24, fontWeight: '800' },
  description: { color: '#6B7280', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
});