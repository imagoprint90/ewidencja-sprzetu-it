import { renderToBuffer } from "@react-pdf/renderer";
import { registerProtocolFonts } from "./fonts";
import { ProtocolDocument } from "./ProtocolDocument";
import type { ProtocolSnapshot } from "@/lib/types";

export async function renderProtocolPdf(snapshot: ProtocolSnapshot): Promise<Buffer> {
  registerProtocolFonts();
  return renderToBuffer(ProtocolDocument({ snapshot }));
}

export function protocolPdfStoragePath(protocolNumber: string): string {
  return `${protocolNumber}.pdf`;
}
