const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src/screens/HomeScreen.tsx');
const lines = fs.readFileSync(p, 'utf8').split('\n');

const newLines = [
  ...lines.slice(0, 1357),
  '  return (',
  '    <Screen>',
  '      <ScrollView contentContainerStyle={{ paddingBottom: scrollPadBottom }} keyboardShouldPersistTaps="handled">',
  '        <View style={styles.headerRow}>',
  '          <View style={styles.headerLeft}>',
  '            <Ionicons name="sparkles" size={20} color={colors.neon} />',
  '            <GoldTitle>Inicio</GoldTitle>',
  '          </View>',
  '        </View>',
  '',
  '        <Card style={styles.card}>',
  '          <View style={styles.welcomeRow}>',
  '            <Ionicons name="sparkles" size={18} color={colors.neon} />',
  '            <Text style={styles.title}>Bienvenido {displayName}</Text>',
  '          </View>',
  '',
  '          <View style={styles.infoRow}>',
  '            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />',
  '            <Text style={styles.line}>Rol no reconocido o en validación...</Text>',
  '          </View>',
  '        </Card>',
  '',
  '        <View style={{ height: 14 }} />',
  '        <PrimaryButton label="Cerrar sesión" onPress={() => void auth.logout()} />',
  '      </ScrollView>',
  '',
  '      <Pressable style={styles.floatingHelpBtn} onPress={() => void openOperator()}>',
  '        <Ionicons name="headset-outline" size={28} color="#FFFFFF" />',
  '      </Pressable>',
  '    </Screen>',
  '  );',
  '}',
  ...lines.slice(2093)
];

fs.writeFileSync(p, newLines.join('\n'));
