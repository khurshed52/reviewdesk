import Link from "next/link";
export default function ForgotPassword() {
  const support = process.env.SUPPORT_EMAIL;
  return (
    <>
      <h1 className="page-title">Need help signing in?</h1>
      <p className="page-description">
        Self-service password recovery is not available in this release. Contact
        your workspace administrator to restore access.
      </p>
      {support && (
        <p>
          <a href={`mailto:${support}`}>{support}</a>
        </p>
      )}
      <p className="mt-6">
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}
