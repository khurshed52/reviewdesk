"use client";
import { App, Button, Card, Empty, Form, Input, Modal, Table } from "antd";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMerchantAction } from "@/actions/merchant.actions";
import { PageHeading } from "@/components/common/page-heading";
import type { listMerchants } from "@/services/merchant.service";
export function Merchants({
  rows,
}: {
  rows: Awaited<ReturnType<typeof listMerchants>>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const router = useRouter();
  async function save(values: unknown) {
    setBusy(true);
    try {
      const result = await createMerchantAction(values);
      if (!result.success) {
        message.error(result.error);
        return;
      }
      message.success("Merchant created");
      setOpen(false);
      form.resetFields();
      router.refresh();
    } catch {
      message.error("Unable to create merchant. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Merchants"
        description="Merchant accounts across the platform."
        action={
          <Button type="primary" onClick={() => setOpen(true)}>
            Create merchant
          </Button>
        }
      />
      <Card>
        <Table
          rowKey="id"
          dataSource={rows}
          scroll={{ x: 600 }}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="No merchants yet" /> }}
          columns={[
            {
              title: "Company",
              render: (_, row) => (
                <Link href={`/admin/merchants/${row.id}`}>{row.name}</Link>
              ),
            },
            { title: "Owner", render: (_, r) => r.owner.email },
            { title: "Businesses", render: (_, r) => r._count.businesses },
            {
              title: "Created",
              dataIndex: "createdAt",
              render: (v) => new Date(v).toISOString().slice(0, 10),
            },
          ]}
        />
      </Card>
      <Modal
        title="Create merchant"
        open={open}
        onCancel={() => {
          if (!busy) setOpen(false);
        }}
        onOk={() => form.submit()}
        confirmLoading={busy}
        okText="Create merchant"
      >
        <Form form={form} layout="vertical" onFinish={save} disabled={busy}>
          <Form.Item
            name="name"
            label="Owner name"
            rules={[{ required: true, min: 2, max: 120 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="companyName"
            label="Company name"
            rules={[{ required: true, min: 2, max: 120 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, min: 12 }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm password"
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
        </Form>
      </Modal>
    </>
  );
}
