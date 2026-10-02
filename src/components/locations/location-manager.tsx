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
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  saveLocationAction,
  deleteLocationAction,
} from "@/actions/location.actions";
import { PageHeading } from "@/components/common/page-heading";
import type { listLocations } from "@/services/location.service";
type Row = Awaited<ReturnType<typeof listLocations>>[number];
export function LocationManager({
  rows,
  businesses,
}: {
  rows: Row[];
  businesses: { id: string; name: string }[];
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
    if (row) form.setFieldsValue({ ...row, address: row.address ?? "" });
    else if (businesses.length === 1)
      form.setFieldValue("businessId", businesses[0].id);
    setOpen(true);
  }
  async function save(values: unknown) {
    setBusy(true);
    try {
      const result = await saveLocationAction(editing?.id ?? null, values);
      if (result.success) {
        notification.success({
          title: editing
            ? "Location updated successfully"
            : "Location created successfully",
        });
        setOpen(false);
        router.refresh();
      } else
        notification.error({
          title: "Unable to save location",
          description: result.error,
        });
    } catch {
      notification.error({ title: "Unable to save location" });
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      const result = await deleteLocationAction(id);
      if (result.success) {
        notification.success({ title: "Location deleted" });
        router.refresh();
      } else notification.error({ title: result.error });
    } catch {
      notification.error({ title: "Failed to delete location" });
    }
  }
  return (
    <>
      <PageHeading
        title="Locations"
        description="Every branch has its own Google listing and review links."
        action={
          <Button
            type="primary"
            icon={<PlusOutlined aria-hidden />}
            aria-label="Add location"
            onClick={() => edit(null)}
            disabled={!businesses.length}
          >
            Add location
          </Button>
        }
      />
      <Card>
        <Table
          rowKey="id"
          dataSource={rows}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty
                description={
                  businesses.length
                    ? "No locations yet. Add your first branch."
                    : "Create a business before adding a location."
                }
              >
                {!businesses.length && (
                  <Link href="/businesses">
                    <Button type="primary">Create business</Button>
                  </Link>
                )}
              </Empty>
            ),
          }}
          columns={[
            {
              title: "Location",
              dataIndex: "name",
              render: (v, row) => (
                <Link href={`/locations/${row.id}`}>
                  <strong>{v}</strong>
                </Link>
              ),
            },
            { title: "Business", render: (_, r) => r.business.name },
            { title: "Address", dataIndex: "address", render: (v) => v || "—" },
            { title: "QR Codes", render: (_, r) => r._count.qrCodes },
            {
              title: "Actions",
              render: (_, r) => (
                <Space>
                  <Button type="link" onClick={() => edit(r)}>
                    Edit
                  </Button>
                  <Link href={`/qr-codes?locationId=${r.id}`}>Generate QR</Link>
                  <Popconfirm
                    title="Delete this location?"
                    description="Its QR codes and review sessions will also be deleted."
                    onConfirm={() => remove(r.id)}
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="link" danger>
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={editing ? "Edit location" : "Create location"}
        open={hydrated && open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={busy}
        okText="Save location"
        forceRender={hydrated}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={save}
          requiredMark={false}
        >
          <Form.Item
            name="businessId"
            label="Business"
            rules={[{ required: true }]}
          >
            <Select
              disabled={!!editing}
              options={businesses.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="Location Name"
            rules={[{ required: true, min: 2, max: 120 }]}
          >
            <Input placeholder="e.g. Downtown" />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="googleReviewUrl"
            label="Google Review URL"
            rules={[{ required: true, type: "url" }]}
            extra="Paste the HTTPS review link from this branch’s Google listing."
          >
            <Input placeholder="https://g.page/r/.../review" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
