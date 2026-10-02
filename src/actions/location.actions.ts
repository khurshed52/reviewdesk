"use server";
import {
  createLocation,
  updateLocation,
  deleteLocation,
} from "@/services/location.service";
import { mutate } from "./helpers";
export async function saveLocationAction(id: string | null, input: unknown) {
  return mutate(() => (id ? updateLocation(id, input) : createLocation(input)));
}
export async function deleteLocationAction(id: string) {
  return mutate(() => deleteLocation(id));
}
