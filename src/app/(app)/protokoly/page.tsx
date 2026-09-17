import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProtocols } from "@/lib/supabase/queries";
import { ProtokolyClient } from "./ProtokolyClient";

export default async function ProtokolyPage() {
  const supabase = await createSupabaseServerClient();
  const protocols = await getProtocols(supabase);

  return <ProtokolyClient protocols={protocols} />;
}
