"use client";
import Link from "next/link";
import { Button, Result, Skeleton, Card } from "antd";
export function LoadingState() {
  return (
    <div className="p-6">
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}
export function MissingState() {
  return (
    <Result
      status="404"
      title="Page not found"
      subTitle="This page may have moved, or you may not have access to it."
      extra={
        <Link href="/dashboard">
          <Button type="primary">Go to dashboard</Button>
        </Link>
      }
    />
  );
}
export function ErrorState({ reset }: { reset: () => void }) {
  return (
    <Result
      status="500"
      title="Something went wrong"
      subTitle="We couldn’t load this page. Please try again."
      extra={
        <Button type="primary" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
export function UnauthorizedState() {
  return (
    <Result
      status="403"
      title="Access restricted"
      subTitle="This page is not available for your account role."
      extra={
        <Link href="/dashboard">
          <Button type="primary">Go to dashboard</Button>
        </Link>
      }
    />
  );
}
