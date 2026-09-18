import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ShieldAlert } from "lucide-react";

export default function BrakDostepuPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert size={40} className="text-warning" />
      <div>
        <h1 className="text-lg font-semibold">Brak dostępu</h1>
        <p className="mt-1 max-w-md text-sm text-muted">
          Twoje konto nie ma dostępu do tej zakładki. Jeśli to pomyłka, poproś administratora
          o zmianę uprawnień w zakładce Użytkownicy.
        </p>
      </div>
      <Link href="/pulpit">
        <Button variant="secondary">Wróć do pulpitu</Button>
      </Link>
    </div>
  );
}
