import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ProtocolSnapshot } from "@/lib/types";
import { PROTOCOL_TYPE_LABELS } from "@/lib/types";
import { LogoMark } from "./LogoMark";

function formatPl(dateIso: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 10,
    padding: 36,
    color: "#1a2332",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  companyBlock: { maxWidth: 260 },
  title: { fontSize: 15, fontWeight: "bold", marginBottom: 2, textAlign: "right" },
  meta: { fontSize: 9, color: "#5b6472", textAlign: "right" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 6,
  },
  partiesRow: { flexDirection: "row", gap: 16 },
  partyBox: { flex: 1, borderWidth: 1, borderColor: "#e1e5eb", padding: 8, borderRadius: 3 },
  partyLabel: { fontSize: 8, color: "#5b6472", marginBottom: 2, textTransform: "uppercase" },
  partyValue: { fontSize: 10, fontWeight: "bold" },
  table: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0f2f5",
    borderBottomWidth: 1,
    borderBottomColor: "#c9ced6",
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5eb",
    paddingVertical: 4,
  },
  colName: { flex: 3, paddingHorizontal: 4 },
  colQty: { flex: 1, paddingHorizontal: 4, textAlign: "center" },
  colInv: { flex: 2, paddingHorizontal: 4 },
  colSerial: { flex: 2, paddingHorizontal: 4 },
  colCondition: { flex: 2, paddingHorizontal: 4 },
  th: { fontSize: 9, fontWeight: "bold" },
  td: { fontSize: 9 },
  notesBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e1e5eb",
    borderRadius: 3,
    padding: 8,
    minHeight: 30,
  },
  confirmation: { marginTop: 14, fontSize: 9, lineHeight: 1.4, color: "#333" },
  signatures: {
    marginTop: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: { width: "45%" },
  signatureBoxThird: { width: "30%" },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#1a2332",
    marginTop: 40,
    paddingTop: 4,
  },
  signatureLabel: { fontSize: 9, fontWeight: "bold" },
  signatureName: { fontSize: 9, color: "#5b6472", marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#9aa2ad",
    textAlign: "center",
  },
});

function partyLabels(snapshot: ProtocolSnapshot): {
  issuerLabel: string;
  issuerName: string;
  receiverLabel: string;
  receiverName: string;
} {
  const company = `${snapshot.companyName} (reprezentowana przez: ${snapshot.issuedByName})`;
  if (snapshot.type === "zwrot") {
    return {
      issuerLabel: "Przekazujący (pracownik zwracający sprzęt)",
      issuerName: snapshot.previousEmployeeName ?? "—",
      receiverLabel: "Odbierający (w imieniu firmy)",
      receiverName: company,
    };
  }
  return {
    issuerLabel: "Przekazujący (w imieniu firmy)",
    issuerName: company,
    receiverLabel: "Odbierający",
    receiverName: snapshot.newEmployeeName ?? "—",
  };
}

export function ProtocolDocument({ snapshot }: { snapshot: ProtocolSnapshot }) {
  const parties = partyLabels(snapshot);

  return (
    <Document title={`Protokół ${snapshot.protocolNumber}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            <LogoMark width={100} />
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontWeight: "bold" }}>{snapshot.companyName}</Text>
              <Text>{snapshot.companyAddress}</Text>
              {snapshot.companyNip && <Text>NIP: {snapshot.companyNip}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.title}>{PROTOCOL_TYPE_LABELS[snapshot.type].toUpperCase()}</Text>
            <Text style={styles.meta}>Nr dokumentu: {snapshot.protocolNumber}</Text>
            <Text style={styles.meta}>
              {snapshot.city}, {formatPl(snapshot.issuedAt)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Strony protokołu</Text>
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{parties.issuerLabel}</Text>
            <Text style={styles.partyValue}>{parties.issuerName}</Text>
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{parties.receiverLabel}</Text>
            <Text style={styles.partyValue}>{parties.receiverName}</Text>
          </View>
        </View>

        {snapshot.type === "przekazanie" && snapshot.previousEmployeeName && (
          <Text style={{ fontSize: 8, color: "#5b6472", marginTop: 4 }}>
            Poprzedni użytkownik sprzętu: {snapshot.previousEmployeeName}
          </Text>
        )}
        {snapshot.handoverPersonName && (
          <Text style={{ fontSize: 8, color: "#5b6472", marginTop: 4 }}>
            Sprzęt fizycznie przekazał(a): {snapshot.handoverPersonName}
          </Text>
        )}

        <Text style={styles.sectionTitle}>Przekazywany sprzęt</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            <Text style={[styles.colName, styles.th]}>Nazwa</Text>
            <Text style={[styles.colQty, styles.th]}>Ilość</Text>
            <Text style={[styles.colInv, styles.th]}>Nr inwentarzowy</Text>
            <Text style={[styles.colSerial, styles.th]}>Nr seryjny</Text>
            <Text style={[styles.colCondition, styles.th]}>Stan techniczny</Text>
          </View>
          {snapshot.items.map((item, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <Text style={[styles.colName, styles.td]}>{item.name}</Text>
              <Text style={[styles.colQty, styles.td]}>{item.quantity}</Text>
              <Text style={[styles.colInv, styles.td]}>{item.inventoryNumber}</Text>
              <Text style={[styles.colSerial, styles.td]}>{item.serialNumber ?? "—"}</Text>
              <Text style={[styles.colCondition, styles.td]}>
                {item.technicalConditionLabel ?? snapshot.technicalConditionLabel}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Uwagi</Text>
        <View style={styles.notesBox}>
          <Text style={{ fontSize: 9 }}>{snapshot.notes || "Brak dodatkowych uwag."}</Text>
        </View>

        <Text style={styles.confirmation}>
          Przekazujący potwierdza wydanie wyżej wymienionego sprzętu w opisanym stanie
          technicznym. Odbierający potwierdza odbiór wyżej wymienionego sprzętu i przyjmuje go
          do użytkowania zgodnie z zasadami obowiązującymi w firmie.
        </Text>

        <View style={styles.signatures} wrap={false}>
          <View style={snapshot.handoverPersonName ? styles.signatureBoxThird : styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Przekazujący</Text>
              <Text style={styles.signatureName}>{parties.issuerName}</Text>
            </View>
          </View>
          {snapshot.handoverPersonName && (
            <View style={styles.signatureBoxThird}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>Osoba przekazująca sprzęt</Text>
                <Text style={styles.signatureName}>{snapshot.handoverPersonName}</Text>
              </View>
            </View>
          )}
          <View style={snapshot.handoverPersonName ? styles.signatureBoxThird : styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Odbierający</Text>
              <Text style={styles.signatureName}>{parties.receiverName}</Text>
            </View>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages} · ${snapshot.protocolNumber}`}
          fixed
        />
      </Page>
    </Document>
  );
}
