"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { App, Button, Form, Input, Typography } from "antd";
import { loginAction, registerAction } from "@/actions/auth.actions";
export function AuthForm({ register = false }: { register?: boolean }) {
  const [loading, setLoading] = useState(false);
  const { notification } = App.useApp();
  const router = useRouter();
  async function submit(values: Record<string, string>) {
    setLoading(true);
    try {
      const result = await (register
        ? registerAction(values)
        : loginAction(values));
      if (!result.success)
        notification.error({
          title: "Unable to continue",
          description: result.error,
        });
      else if (register) {
        notification.success({
          title: "Account created successfully",
          description: "Sign in to your new workspace.",
        });
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      notification.error({
        title: "Unable to connect",
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Typography.Title level={2} style={{ marginTop: 0 }}>
        {register ? "Create your workspace" : "Welcome back"}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        {register
          ? "Bring every business and branch together."
          : "Sign in to manage your customer feedback."}
      </Typography.Paragraph>
      <Form layout="vertical" onFinish={submit} requiredMark={false}>
        {register && (
          <>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, min: 2, max: 120 }]}
            >
              <Input autoComplete="name" />
            </Form.Item>
            <Form.Item
              name="companyName"
              label="Merchant / Company Name"
              rules={[{ required: true, min: 2, max: 120 }]}
            >
              <Input autoComplete="organization" />
            </Form.Item>
          </>
        )}
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email" }]}
        >
          <Input autoComplete="email" placeholder="you@company.com" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, min: register ? 12 : 1, max: 72 }]}
          extra={register ? "Use 12 or more characters." : undefined}
        >
          <Input.Password
            autoComplete={register ? "new-password" : "current-password"}
          />
        </Form.Item>
        {register && (
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={["password"]}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return value === getFieldValue("password")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        )}
        {!register && (
          <div className="mb-5 text-right">
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        )}
        <Button htmlType="submit" type="primary" block loading={loading}>
          {register ? "Create account" : "Sign in"}
        </Button>
      </Form>
      <div className="mt-6 text-center">
        {register ? "Already have an account? " : "New to Reviewdesk? "}
        <Link href={register ? "/login" : "/register"}>
          {register ? "Sign in" : "Create an account"}
        </Link>
      </div>
    </>
  );
}
