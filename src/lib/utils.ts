export function appOrigin() {
  const url = new URL(process.env.AUTH_URL || "http://localhost:3000");
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  )
    throw new Error("AUTH_URL must use HTTPS in production");
  return url.origin;
}
