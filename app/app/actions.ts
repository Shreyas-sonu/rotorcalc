"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canUse, requirePlan } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { ok?: boolean; id?: string; error?: string };

const Save = z.object({
  id: z.uuid().optional(),
  kind: z.enum(["power", "efficiency", "flow", "boiler"]),
  name: z.string().trim().min(1, "Give the calculation a name.").max(120),
  summary: z.string().max(200),
  inputs: z.record(z.string(), z.unknown()),
});

export async function saveCalculation(input: z.input<typeof Save>): Promise<SaveState> {
  const access = await requirePlan();
  const parsed = Save.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, kind, name, summary, inputs } = parsed.data;
  if (!canUse(access.plan, kind)) return { error: "Your plan does not include this calculator." };
  if (JSON.stringify(inputs).length > 8000) return { error: "This calculation is too large to save." };
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("calculations").update({ name, summary, inputs, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { error: "Could not save. Try again." };
    revalidatePath("/app/history");
    return { ok: true, id };
  }
  if (access.plan.savedLimit !== null) {
    const { count } = await supabase.from("calculations").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= access.plan.savedLimit)
      return { error: `Your ${access.plan.name} plan keeps ${access.plan.savedLimit} saved calculations. Delete one or upgrade to save more.` };
  }
  const { data, error } = await supabase.from("calculations").insert({ kind, name, summary, inputs }).select("id").single();
  if (error || !data) return { error: "Could not save. Try again." };
  revalidatePath("/app/history");
  return { ok: true, id: data.id };
}

export async function deleteCalculation(form: FormData): Promise<void> {
  await requirePlan();
  const id = z.uuid().safeParse(form.get("id"));
  if (id.success) {
    const supabase = await createClient();
    await supabase.from("calculations").delete().eq("id", id.data);
  }
  revalidatePath("/app/history");
}

export async function updateProfile(form: FormData): Promise<void> {
  await requirePlan();
  const parsed = z.object({ full_name: z.string().trim().min(2).max(120), company: z.string().trim().max(120) }).safeParse({
    full_name: form.get("full_name"),
    company: form.get("company") ?? "",
  });
  if (parsed.success) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update(parsed.data).eq("id", user.id);
      await supabase.auth.updateUser({ data: { full_name: parsed.data.full_name, company: parsed.data.company } });
    }
  }
  redirect("/app/account?saved=1");
}
