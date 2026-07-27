import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { GoldTitle } from "../components/GoldTitle";
import { TextField } from "../components/TextField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ReadOnlyField } from "../components/ReadOnlyField";
import { colors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";
import { apiDeleteMyAccount, apiGetMyProfile, apiUpdateMyProfile } from "../profile/profile.api";
import { clearSavedPasswordForUser, getSavedPasswordForUser } from "../lib/credentials";

export function ProfileScreen({ navigation }: any) {
  const auth = useAuth();
  const token = auth.token;
  const role = auth.user?.role;
  const userId = auth.user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [mobilePayBank, setMobilePayBank] = useState("");
  const [mobilePayDocument, setMobilePayDocument] = useState("");
  const [mobilePayPhone, setMobilePayPhone] = useState("");
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [savedPasswordLoading, setSavedPasswordLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [driverReadonly, setDriverReadonly] = useState<any | null>(null);

  const isPassenger = role === "USER";
  const isDriver = role === "DRIVER";

  const canEditPhone = isPassenger || isDriver;
  const canEditEmail = false;

  const phoneEditable = isEditing && canEditPhone;
  const emailEditable = isEditing && canEditEmail;
  const nameEditable = isEditing;

  async function load(opts?: { showLoading?: boolean }) {
    if (!token) return;
    const showLoading = opts?.showLoading ?? true;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await apiGetMyProfile(token);

      setEmail(res.profile.user.email);

      if (res.profile.passenger) {
        setFirstName(res.profile.passenger.firstName ?? "");
        setLastName(res.profile.passenger.lastName ?? "");
        setPhone(res.profile.passenger.phone ?? "");
        setDriverReadonly(null);
      }

      if (res.profile.driver) {
        setFirstName(res.profile.driver.firstName ?? "");
        setLastName(res.profile.driver.lastName ?? "");
        setPhone(res.profile.driver.phone ?? "");
        setMobilePayBank(res.profile.driver.mobilePayBank ?? "");
        setMobilePayDocument(res.profile.driver.mobilePayDocument ?? "");
        setMobilePayPhone(res.profile.driver.mobilePayPhone ?? "");
        setDriverReadonly(res.profile.driver);
      }

      // Luego de una carga correcta, volvemos a modo lectura.
      setIsEditing(false);

      if (userId) {
        setSavedPasswordLoading(true);
        try {
          const pw = await getSavedPasswordForUser(userId);
          setSavedPassword(pw && pw.trim().length ? pw : null);
        } catch {
          setSavedPassword(null);
        } finally {
          setSavedPasswordLoading(false);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar tu perfil");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    void load({ showLoading: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!userId) {
        setSavedPassword(null);
        return;
      }

      setSavedPasswordLoading(true);
      try {
        const pw = await getSavedPasswordForUser(userId);
        if (!alive) return;
        setSavedPassword(pw && pw.trim().length ? pw : null);
      } catch {
        if (!alive) return;
        setSavedPassword(null);
      } finally {
        if (!alive) return;
        setSavedPasswordLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId]);

  const passwordValue = useMemo(() => {
    if (savedPassword && savedPassword.trim().length) return savedPassword;
    return "********";
  }, [savedPassword]);

  async function ensurePasswordLoaded() {
    if (!userId) return null;
    if (savedPassword && savedPassword.trim().length) return savedPassword;

    setSavedPasswordLoading(true);
    try {
      const pw = await getSavedPasswordForUser(userId);
      const normalized = pw && pw.trim().length ? pw : null;
      setSavedPassword(normalized);
      return normalized;
    } catch {
      setSavedPassword(null);
      return null;
    } finally {
      setSavedPasswordLoading(false);
    }
  }

  async function save() {
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      if (isPassenger) {
        await apiUpdateMyProfile(token, {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        });
      } else if (isDriver) {
        await apiUpdateMyProfile(token, {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          mobilePayBank: mobilePayBank.trim() ? mobilePayBank.trim() : null,
          mobilePayDocument: mobilePayDocument.trim() ? mobilePayDocument.trim() : null,
          mobilePayPhone: mobilePayPhone.trim() ? mobilePayPhone.trim() : null,
        });
      }

      Alert.alert("Listo", "Perfil actualizado.");
      await load({ showLoading: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el perfil");
    } finally {
      setSaving(false);
    }
  }

  async function onMainButtonPress() {
    if (!isEditing) {
      setError(null);
      setIsEditing(true);
      return;
    }

    await save();
  }

  function confirmDeleteAccount() {
    if (!token || !userId) return;

    Alert.alert(
      "Eliminar cuenta",
      "Esta acción eliminará tu cuenta y los datos asociados que puedan borrarse automáticamente. No se puede deshacer.\n\n¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setDeleting(true);
                setError(null);
                await apiDeleteMyAccount(token);
                await clearSavedPasswordForUser(userId);
                await auth.logout();
                Alert.alert("Cuenta eliminada", "Tu cuenta fue eliminada correctamente.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo eliminar la cuenta");
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ]
    );
  }

  function confirmLogout() {
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que deseas salir de tu cuenta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
          onPress: () => {
            void auth.logout();
          },
        },
      ]
    );
  }

  function openPrivacyPolicy() {
    Linking.openURL("https://www.gochospeed.com/privacy").catch(() => {
      Alert.alert("Error", "No se pudo abrir el enlace de política y privacidad.");
    });
  }

  function openAccountDeletionInfo() {
    Linking.openURL("https://www.gochospeed.com/account-deletion").catch(() => {
      Alert.alert("Error", "No se pudo abrir el enlace de información de eliminación de cuentas.");
    });
  }

  if (role === "ADMIN") {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                <Ionicons name="chevron-back" size={24} color={colors.neon} />
              </Pressable>
              <GoldTitle>Perfil Admin</GoldTitle>
            </View>
          </View>

          <Card style={{ marginTop: 16, gap: 12 }}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.neon} />
              <Text style={styles.sectionTitle}>Cuenta Administrador</Text>
            </View>

            <ReadOnlyField
              label="Correo Administrador"
              labelIconName="at-outline"
              value={auth.user?.email ?? "admin@gs.com"}
            />
            <ReadOnlyField
              label="Rol"
              labelIconName="key-outline"
              value="ADMINISTRADOR GLOBAL"
            />
          </Card>

          <Card style={{ marginTop: 16, gap: 12 }}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="options-outline" size={18} color={colors.neon} />
              <Text style={styles.sectionTitle}>Opciones y Políticas</Text>
            </View>

            <View style={styles.actionsZone}>
              <Pressable
                onPress={openPrivacyPolicy}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.text} />
                <Text style={styles.actionButtonText}>Política y Privacidad</Text>
              </Pressable>

              <Pressable
                onPress={openAccountDeletionInfo}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <Ionicons name="information-circle-outline" size={18} color={colors.text} />
                <Text style={styles.actionButtonText}>Información de eliminación de cuentas</Text>
              </Pressable>

              <Pressable
                onPress={confirmLogout}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionButtonText, { color: colors.danger }]}>Cerrar sesión</Text>
              </Pressable>
            </View>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen keyboardAvoiding>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={24} color={colors.neon} />
            </Pressable>
            <GoldTitle>Perfil</GoldTitle>
          </View>

          <Pressable
            style={[styles.refreshBtn, isEditing ? styles.refreshBtnDisabled : null]}
            onPress={isEditing ? undefined : () => void load({ showLoading: false })}
          >
            <Ionicons name="refresh" size={18} color={colors.text} />
          </Pressable>
        </View>

        {loading ? (
          <Card style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={colors.neon} />
              <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando...</Text>
            </View>
          </Card>
        ) : null}

        {!!error ? (
          <Card style={{ marginTop: 16, borderColor: colors.danger, borderWidth: 1 }}>
            <Text style={{ color: colors.danger, fontWeight: "900" }}>{error}</Text>
          </Card>
        ) : null}

        <Card style={{ marginTop: 16, gap: 12 }}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="person-outline" size={18} color={colors.neon} />
            <Text style={styles.sectionTitle}>Datos</Text>
          </View>

          <ReadOnlyField
            label="Usuario"
            labelIconName="at-outline"
            value={auth.user?.email ?? auth.user?.username ?? email}
            emptyText="-"
          />

          {nameEditable ? (
            <TextField
              label="Nombres"
              labelIconName="text-outline"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              editable
            />
          ) : (
            <ReadOnlyField label="Nombres" labelIconName="text-outline" value={firstName} emptyText="Sin cargar" />
          )}

          {nameEditable ? (
            <TextField
              label="Apellidos"
              labelIconName="text-outline"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              editable
            />
          ) : (
            <ReadOnlyField label="Apellidos" labelIconName="text-outline" value={lastName} emptyText="Sin cargar" />
          )}

          {phoneEditable ? (
            <TextField
              label="Teléfono"
              labelIconName="call-outline"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable
            />
          ) : (
            <ReadOnlyField label="Teléfono" labelIconName="call-outline" value={phone} emptyText="Sin cargar" />
          )}

          {emailEditable ? (
            <TextField
              label="Correo"
              labelIconName="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              editable
            />
          ) : (
            <ReadOnlyField label="Correo" labelIconName="mail-outline" value={email} emptyText="Sin cargar" />
          )}

          <TextField
            label="Contraseña"
            labelIconName="lock-closed-outline"
            value={passwordValue}
            onChangeText={() => void 0}
            secureTextEntry={!passwordVisible}
            editable={false}
            rightIconName={passwordVisible ? "eye-off-outline" : "eye-outline"}
            onPressRightIcon={() => {
              void (async () => {
                // Si está visible, siempre podemos ocultarla.
                if (passwordVisible) {
                  setPasswordVisible(false);
                  return;
                }

                // Si todavía no cargó, intentamos leerla justo ahora.
                const pw = await ensurePasswordLoaded();
                if (!pw) {
                  Alert.alert(
                    "No disponible",
                    "Para poder ver tu contraseña, cerrá sesión e ingresá nuevamente una vez.\n\n(La app no puede leer tu contraseña desde el servidor.)"
                  );
                  return;
                }

                setPasswordVisible(true);
              })();
            }}
            rightIconAccessibilityLabel={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          />

          {savedPasswordLoading ? <Text style={[styles.readLine, { color: colors.mutedText }]}>Cargando contraseña...</Text> : null}

          <PrimaryButton
            label={isEditing ? (saving ? "Guardando..." : "Guardar") : "Editar"}
            onPress={() => void onMainButtonPress()}
            disabled={saving || deleting}
          />

          {isDriver ? (
            <View style={{ marginTop: 14, gap: 12 }}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="wallet-outline" size={18} color={colors.neon} />
                <Text style={styles.sectionTitle}>Pago móvil</Text>
              </View>

              {isEditing ? (
                <>
                  <TextField
                    label="Banco"
                    labelIconName="business-outline"
                    value={mobilePayBank}
                    onChangeText={setMobilePayBank}
                    autoCapitalize="words"
                    editable
                    placeholder="Ej: Banesco"
                  />
                  <TextField
                    label="Documento"
                    labelIconName="document-text-outline"
                    value={mobilePayDocument}
                    onChangeText={setMobilePayDocument}
                    autoCapitalize="characters"
                    editable
                    placeholder="Ej: V-12345678"
                  />
                  <TextField
                    label="Teléfono"
                    labelIconName="call-outline"
                    value={mobilePayPhone}
                    onChangeText={setMobilePayPhone}
                    keyboardType="phone-pad"
                    editable
                    placeholder="Ej: 0412XXXXXXX"
                  />
                </>
              ) : (
                <>
                  <ReadOnlyField label="Banco" labelIconName="business-outline" value={mobilePayBank} emptyText="Sin cargar" />
                  <ReadOnlyField label="Documento" labelIconName="document-text-outline" value={mobilePayDocument} emptyText="Sin cargar" />
                  <ReadOnlyField label="Teléfono" labelIconName="call-outline" value={mobilePayPhone} emptyText="Sin cargar" />
                </>
              )}
            </View>
          ) : null}

          {isDriver && driverReadonly ? (
            <View style={{ marginTop: 10, gap: 10 }}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="car-outline" size={18} color={colors.neon} />
                <Text style={styles.sectionTitle}>Vehículo (solo ver)</Text>
              </View>

              <Text style={styles.readLine}>Tipo: {driverReadonly.serviceType}</Text>
              {driverReadonly.vehicle ? (
                <>
                  <Text style={styles.readLine}>Marca: {driverReadonly.vehicle.brand}</Text>
                  <Text style={styles.readLine}>Modelo: {driverReadonly.vehicle.model}</Text>
                  <Text style={styles.readLine}>Placa: {driverReadonly.vehicle.plate ?? "-"}</Text>
                  <Text style={styles.readLine}>Año: {driverReadonly.vehicle.year}</Text>
                  <Text style={styles.readLine}>Color: {driverReadonly.vehicle.color}</Text>
                </>
              ) : (
                <Text style={styles.readLine}>Sin vehículo cargado.</Text>
              )}

              <View style={styles.sectionTitleRow}>
                <Ionicons name="image-outline" size={18} color={colors.neon} />
                <Text style={styles.sectionTitle}>Foto (solo admin)</Text>
              </View>
              <Text style={styles.readLine}>{driverReadonly.photoUrl}</Text>
            </View>
          ) : null}

          <View style={styles.actionsZone}>
            <Pressable
              onPress={isEditing || saving || deleting ? undefined : openPrivacyPolicy}
              style={({ pressed }) => [
                styles.actionButton,
                (isEditing || saving || deleting) && styles.actionButtonDisabled,
                pressed && !(isEditing || saving || deleting) ? styles.actionButtonPressed : null,
              ]}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.text} />
              <Text style={styles.actionButtonText}>Política y Privacidad</Text>
            </Pressable>

            {(!isPassenger && !isDriver) ? (
              <Pressable
                onPress={openAccountDeletionInfo}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed ? styles.actionButtonPressed : null,
                ]}
              >
                <Ionicons name="information-circle-outline" size={18} color={colors.text} />
                <Text style={styles.actionButtonText}>Información de eliminación de cuentas</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={isEditing || saving || deleting ? undefined : confirmLogout}
              style={({ pressed }) => [
                styles.actionButton,
                (isEditing || saving || deleting) && styles.actionButtonDisabled,
                pressed && !(isEditing || saving || deleting) ? styles.actionButtonPressed : null,
              ]}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.text} />
              <Text style={styles.actionButtonText}>Cerrar sesión</Text>
            </Pressable>
          </View>

          {(isPassenger || isDriver) && (
            <View style={styles.dangerZone}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} />
                <Text style={[styles.sectionTitle, { color: colors.danger }]}>Eliminar cuenta</Text>
              </View>

              <Text style={styles.readLine}>
                Si eliminas tu cuenta, se borrarán tu acceso y los datos asociados que el sistema pueda eliminar automáticamente.
              </Text>
              <Text style={styles.readLine}>
                También puedes consultar el recurso web de eliminación en /account-deletion.
              </Text>

              <Pressable
                onPress={isEditing || saving || deleting ? undefined : confirmDeleteAccount}
                style={({ pressed }) => [
                  styles.deleteButton,
                  (isEditing || saving || deleting) && styles.deleteButtonDisabled,
                  pressed && !(isEditing || saving || deleting) ? styles.deleteButtonPressed : null,
                ]}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteButtonText}>{deleting ? "Eliminando..." : "Eliminar cuenta"}</Text>
              </Pressable>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  refreshBtnDisabled: {
    opacity: 0.5,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  readLine: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  actionsZone: {
    marginTop: 18,
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonPressed: {
    opacity: 0.85,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  actionButtonText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  dangerZone: {
    marginTop: 18,
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonPressed: {
    opacity: 0.85,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
});
