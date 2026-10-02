"use client";
import { useHydrated } from "@/components/common/use-hydrated";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Image,
} from "antd";
import {
  PlusOutlined,
  DownloadOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { sources } from "@/lib/validations";
import { createQRAction, setQRStatusAction } from "@/actions/qr.actions";
import { PageHeading } from "@/components/common/page-heading";
import type { listQRCodes } from "@/services/qr.service";
type Row = Awaited<ReturnType<typeof listQRCodes>>[number];
export function QRManager({
  rows,
  locations,
  origin,
  initialLocation,
}: {
  rows: Row[];
  locations: { id: string; name: string; business: { name: string } }[];
  origin: string;
  initialLocation?: string;
}) {
  const validInitial = locations.some((l) => l.id === initialLocation)
    ? initialLocation
    : undefined;
  const hydrated = useHydrated();
  const [open, setOpen] = useState(!!validInitial);
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ row: Row; image: string } | null>(
    null,
  );
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const router = useRouter();
  const url = (slug: string) => `${origin}/r/${slug}`;
  async function save(values: unknown) {
    setBusy(true);
    try {
      const result = await createQRAction(values);
      if (result.success) {
        notification.success({ title: "QR generated successfully" });
        setOpen(false);
        form.resetFields();
        if (validInitial) router.replace("/qr-codes");
        else router.refresh();
      } else notification.error({ title: result.error });
    } catch {
      notification.error({ title: "Failed to generate QR" });
    } finally {
      setBusy(false);
    }
  }
  async function status(row: Row, isActive: boolean) {
    setChanging(row.id);
    try {
      const result = await setQRStatusAction({ id: row.id, isActive });
      if (result.success) {
        notification.success({
          title: isActive ? "QR reactivated" : "QR deactivated",
        });
        router.refresh();
      } else notification.error({ title: result.error });
    } catch {
      notification.error({ title: "Unable to change status" });
    } finally {
      setChanging(null);
    }
  }
  async function show(row: Row) {
    try {
      setPreview({
        row,
        image: await QRCode.toDataURL(url(row.slug), {
          width: 1024,
          margin: 4,
          errorCorrectionLevel: "M",
        }),
      });
    } catch {
      notification.error({ title: "Unable to preview QR" });
    }
  }
  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(url(slug));
      notification.success({ title: "QR copied successfully" });
    } catch {
      notification.error({
        title: "Unable to copy",
        description: "Copy the URL from the QR preview.",
      });
    }
  }
  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.image;
    a.download = `reviewdesk-${preview.row.slug}.png`;
    a.click();
    notification.success({ title: "QR downloaded successfully" });
  }
  return (
    <>
      <PageHeading
        title="QR Codes"
        description="Turn everyday touchpoints into customer feedback."
        action={
          <Button
            type="primary"
            icon={<PlusOutlined aria-hidden />}
            aria-label="Generate QR"
            disabled={!locations.length}
            onClick={() => setOpen(true)}
          >
            Generate QR
          </Button>
        }
      />
      <Card>
        <Table
          rowKey="id"
          dataSource={rows}
          scroll={{ x: 850 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty
                description={
                  locations.length
                    ? "No QR codes yet. Generate one for your first touchpoint."
                    : "Add a location before generating a QR code."
                }
              >
                {!locations.length && (
                  <Link href="/locations">
                    <Button type="primary">Add location</Button>
                  </Link>
                )}
              </Empty>
            ),
          }}
          columns={[
            {
              title: "QR Name",
              render: (_, r) => <strong>{r.name || "Untitled QR"}</strong>,
            },
            {
              title: "Location",
              render: (_, r) => (
                <div>
                  {r.location.name}
                  <div style={{ fontSize: 12, color: "#647573" }}>
                    {r.location.business.name}
                  </div>
                </div>
              ),
            },
            {
              title: "Source",
              dataIndex: "source",
              render: (v) => <Tag>{v}</Tag>,
            },
            { title: "Sessions", render: (_, r) => r._count.sessions },
            {
              title: "Active",
              render: (_, r) => (
                <Switch
                  aria-label={`Activate ${r.name || r.slug}`}
                  checked={r.isActive}
                  loading={changing === r.id}
                  onChange={(value) => void status(r, value)}
                />
              ),
            },
            {
              title: "Actions",
              render: (_, r) => (
                <Space>
                  <Button type="link" onClick={() => void show(r)}>
                    Preview
                  </Button>
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    aria-label="Copy review URL"
                    onClick={() => void copy(r.slug)}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title="Generate QR code"
        open={hydrated && open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={busy}
        okText="Generate QR"
        forceRender={hydrated}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={save}
          initialValues={{ source: "COUNTER", locationId: validInitial }}
          requiredMark={false}
        >
          <Form.Item
            name="locationId"
            label="Location"
            rules={[{ required: true }]}
          >
            <Select
              options={locations.map((l) => ({
                value: l.id,
                label: `${l.business.name} · ${l.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="name" label="QR Name" rules={[{ max: 120 }]}>
            <Input placeholder="e.g. Front Counter" />
          </Form.Item>
          <Form.Item name="source" label="Source" rules={[{ required: true }]}>
            <Select
              options={sources.map((value) => ({
                value,
                label: value.replaceAll("_", " "),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={preview?.row.name || "QR preview"}
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={
          <Space>
            <Button
              icon={<CopyOutlined />}
              onClick={() => preview && void copy(preview.row.slug)}
            >
              Copy URL
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={download}
            >
              Download PNG
            </Button>
          </Space>
        }
      >
        {preview && (
          <div className="text-center">
            <Image
              src={preview.image}
              alt={`Review QR for ${preview.row.location.name}`}
              width={260}
              preview={false}
            />
            <p>
              {preview.row.location.business.name} · {preview.row.location.name}
            </p>
            <Input
              readOnly
              value={url(preview.row.slug)}
              aria-label="Public review URL"
            />
            <p>
              <a href={url(preview.row.slug)} target="_blank" rel="noreferrer">
                Open review page
              </a>
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
