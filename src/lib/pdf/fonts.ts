import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

// Domyślne czcionki PDF (Helvetica) nie obsługują polskich znaków diakrytycznych.
// Roboto (pliki w public/fonts, pobrane raz z Google Fonts) obsługuje pełny zestaw
// znaków łacińskich rozszerzonych, w tym polski.
export function registerProtocolFonts() {
  if (registered) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Roboto",
    fonts: [
      { src: path.join(dir, "Roboto-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(dir, "Roboto-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  registered = true;
}
