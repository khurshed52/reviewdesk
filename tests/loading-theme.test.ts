import assert from "node:assert/strict";
import { test } from "node:test";
import { Heart, Scissors, ConciergeBell } from "lucide-react";
import { getReviewLoadingTheme } from "../src/components/review/loading-theme";

test("QR loader uses category imagery with a neutral unknown-category fallback", () => {
  assert.equal(getReviewLoadingTheme(" Salon ").Icon, Scissors);
  assert.equal(getReviewLoadingTheme("Salon").label, "Personal care");
  assert.equal(getReviewLoadingTheme("Cafe").Icon, ConciergeBell);
  for (const category of [undefined, "Custom business", "Other"]) {
    assert.equal(getReviewLoadingTheme(category).Icon, Heart);
    assert.equal(getReviewLoadingTheme(category).label, "Your experience");
  }
  for (const category of ["Clinic", "Gym", "Hotel", "Retail", "Car Wash", "Real Estate", "Repair Service", "Coaching & Classes", "Car & Bike Service"]) {
    assert.notEqual(getReviewLoadingTheme(category).Icon, ConciergeBell);
    assert.notEqual(getReviewLoadingTheme(category).label, "Great food");
  }
});
