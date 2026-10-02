"use server";
import {
  createBusiness,
  updateBusiness,
  deleteBusiness,
} from "@/services/business.service";
import { mutate } from "./helpers";
export async function saveBusinessAction(id: string | null, input: unknown) {
  return mutate(() => (id ? updateBusiness(id, input) : createBusiness(input)));
}
export async function deleteBusinessAction(id: string) {
  return mutate(() => deleteBusiness(id));
}
