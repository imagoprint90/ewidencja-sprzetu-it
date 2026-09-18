import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTabAccess } from "@/lib/supabase/require-tab";
import { getProtocols } from "@/lib/supabase/queries";
import { ProtokolyClient } from "./ProtokolyClient";

export default async function ProtokolyPage() {
  await requireTabAccess("protokoly");
  const supabase = await createSupabaseServerClient();
  const protocols = await getProtocols(supabase);

  return <ProtokolyClient protocols={protocols} />;
}
