import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function TafsirScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tafsir</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  title: { fontSize: 24, color: colors.accent },
});
