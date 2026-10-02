import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { publicError } from "@/lib/errors";
export async function mutate(fn: () => Promise<unknown>) {
  try {
    await fn();
    revalidatePath("/", "layout");
    return { success: true as const };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false as const, error: publicError(error) };
  }
}
