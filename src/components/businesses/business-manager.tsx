"use client";
import { useHydrated } from "@/components/common/use-hydrated";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { categories } from "@/lib/validations";
import {
  saveBusinessAction,
  deleteBusinessAction,
} from "@/actions/business.actions";
import { PageHeading } from "@/components/common/page-heading";
import type { listBusinesses } from "@/services/business.service";
type Row = Awaited<ReturnType<typeof listBusinesses>>[number];
export function BusinessManager({
  rows,
  canCreate = true,
  title = "Businesses",
  readOnly = false,
}: {
  rows: Row[];
  canCreate?: boolean;
  title?: string;
  readOnly?: boolean;
}) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const router = useRouter();
  function edit(row: Row | null) {
    setEditing(row);
    form.resetFields();
    if (row) form.setFieldsValue({ ...row, logoUrl: row.logoUrl ?? "" });
    setOpen(true);
  }
  async function save(values: unknown) {
    setBusy(true);
    try {
      const result = await saveBusinessAction(editing?.id ?? null, values);
      if (result.success) {
        notification.success({
          title: editing
            ? "Business updated successfully"
            : "Business created successfully",
        });
        setOpen(false);
        router.refresh();
      } else
        notification.error({
          title: "Unable to save business",
          description: result.error,
        });
    } catch {
      notification.error({ title: "Unable to save business" });
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      const result = await deleteBusinessAction(id);
      if (result.success) {
        notification.success({ title: "Business deleted" });
        router.refresh();
      } else notification.error({ title: result.error });
    } catch {
      notification.error({ title: "Failed to delete business" });
    }
  }
  return (
    <>
      <PageHeading
        title={title}
        description="Manage your brands and the places customers find them."
        action={
          canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined aria-hidden />}
              aria-label="Add business"
              onClick={() => edit(null)}
            >
              Add business
            </Button>
          )
        }
      />
      <Card>
        <Table
          rowKey="id"
          dataSource={rows}
          scroll={{ x: 700 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty
                description={
                  readOnly
                    ? "No businesses for these merchants yet."
                    : "No businesses yet. Create your first business to get started."
                }
              />
            ),
          }}
          columns={[
            {
              title: "Business Name",
              dataIndex: "name",
              render: (name, row) => (
                <Link
                  href={
                    readOnly
                      ? `/admin/merchants/${row.merchantId}`
                      : `/businesses/${row.id}`
                  }
                >
                  <strong>{name}</strong>
                </Link>
              ),
            },
            {
              title: "Category",
              dataIndex: "category",
              render: (value) => <Tag>{value}</Tag>,
            },
            { title: "Locations", render: (_, row) => row._count.locations },
            {
              title: "Created Date",
              dataIndex: "createdAt",
              render: (v) => new Date(v).toISOString().slice(0, 10),
            },
            {
              title: "Actions",
              render: (_, row) => (
                <Space>
                  {readOnly ? (
                    <Link href={`/admin/merchants/${row.merchantId}`}>
                      View merchant
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={
                          readOnly
                            ? `/admin/merchants/${row.merchantId}`
                            : `/businesses/${row.id}`
                        }
                      >
                        View
                      </Link>
                      <Button type="link" onClick={() => edit(row)}>
                        Edit
                      </Button>
                      <Popconfirm
                        title="Delete this business?"
                        description="All its locations, QR codes and review sessions will also be deleted."
                        onConfirm={() => remove(row.id)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                      >
                        <Button type="link" danger>
                          Delete
                        </Button>
                      </Popconfirm>
                    </>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={editing ? "Edit business" : "Create business"}
        open={hydrated && open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={busy}
        okText="Save business"
        forceRender={hydrated}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={save}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Business Name"
            rules={[{ required: true, min: 2, max: 120 }]}
          >
            <Input placeholder="e.g. Sunday Coffee" />
          </Form.Item>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true }]}
          >
            <Select
              options={categories.map((value) => ({ value, label: value }))}
              placeholder="Select a category"
            />
          </Form.Item>
          <Form.Item name="logoUrl" label="Logo URL" rules={[{ type: "url" }]}>
            <Input placeholder="https://example.com/logo.png" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
