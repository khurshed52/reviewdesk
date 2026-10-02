"use client";
import Link from "next/link";
import { Button, Card, Empty, Progress, Table, Tag } from "antd";
import {
  ArrowRightOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  QrcodeOutlined,
  ScanOutlined,
  ExportOutlined,
  PercentageOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { PageHeading } from "@/components/common/page-heading";
import { StatCard } from "@/components/common/stat-card";
import type { getAnalytics } from "@/services/analytics.service";
type Data = Awaited<ReturnType<typeof getAnalytics>>;
export function Overview({
  data,
  analytics = false,
  isAdmin = false,
}: {
  data: Data;
  analytics?: boolean;
  isAdmin?: boolean;
}) {
  const stats = [
    {
      label: "User Confirmed Posted",
      value: data.confirmed,
      icon: <ExportOutlined />,
      hint: "Customer-reported completion · not Google-verified",
    },
    {
      label: "Total Businesses",
      value: data.businesses,
      icon: <ShopOutlined />,
    },
    {
      label: "Total Locations",
      value: data.locations,
      icon: <EnvironmentOutlined />,
    },
    { label: "QR Codes", value: data.qrCodes, icon: <QrcodeOutlined /> },
    {
      label: "QR Scans",
      value: data.scans,
      icon: <ScanOutlined />,
      hint: "Active QR page openings · all time",
    },
    {
      label: "Google Clicks",
      value: data.clicks,
      icon: <ExportOutlined />,
      hint: "Sessions continued to Google",
    },
    {
      label: "Conversion Rate",
      value: `${data.conversion.toFixed(1)}%`,
      icon: <PercentageOutlined />,
      hint: "Google clicks / engaged sessions",
    },
  ];
  const funnel = [
    { label: "QR Scans", count: data.scans },
    {
      label: "Ratings Submitted",
      count: data.ratings,
      rate: data.funnel.scanToRating,
      transition: "Scan → Rating",
    },
    {
      label: "Review Suggestions Generated",
      count: data.generated,
      rate: data.funnel.ratingToGenerated,
      transition: "Rating → Generated",
    },
    {
      label: "Reviews Selected",
      count: data.selected,
      rate: data.funnel.generatedToSelected,
      transition: "Generated → Selected",
    },
    {
      label: "Google Clicks",
      count: data.clicks,
      rate: data.funnel.selectedToGoogle,
      transition: "Selected → Google",
    },
  ];
  return (
    <>
      <PageHeading
        title={
          isAdmin
            ? analytics
              ? "System Usage"
              : "Platform overview"
            : analytics
              ? "Analytics"
              : "Your workspace at a glance"
        }
        description={
          analytics
            ? "Understand how customer feedback reaches Google."
            : "Keep track of your businesses and every customer connection."
        }
        action={
          <Link href={isAdmin ? "/admin/merchants" : "/qr-codes"}>
            <Button type="primary" icon={<PlusOutlined />}>
              {isAdmin ? "Manage merchants" : "Generate QR"}
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <Card
        title="Customer conversion funnel"
        className="mb-6"
        extra={<Tag>All time</Tag>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
          {funnel.map((step) => (
            <div key={step.label}>
              <div className="font-medium">{step.label}</div>
              <div className="text-2xl font-semibold my-2">
                {step.count.toLocaleString()}
              </div>
              <Progress
                percent={
                  data.scans
                    ? Math.min(100, (step.count / data.scans) * 100)
                    : 0
                }
                showInfo={false}
                strokeColor="#176b5b"
              />
              {step.rate !== undefined && (
                <div className="text-sm">
                  {step.transition}: {step.rate.toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-5">
          Scan → Confirmed: {data.confirmedConversion.scan.toFixed(1)}% · Google
          Click → Confirmed: {data.confirmedConversion.googleClick.toFixed(1)}%
        </p>
        <p className="page-description text-xs">
          Confirmed means the customer told us they finished posting, not that
          Google verified a review.
        </p>
        <p className="mt-5 font-medium">
          Overall Scan → Google: {data.funnel.scanToGoogle.toFixed(1)}%
        </p>
        <p className="page-description text-xs mt-2">
          Bars show each stage relative to scans. Percentages compare adjacent
          stages. Generated counts sessions, not individual suggestions. A zero
          denominator displays 0%.
        </p>
      </Card>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card
          title="Recent review activity"
          className="xl:col-span-2"
          extra={<Tag>All time</Tag>}
        >
          <Table
            rowKey="id"
            size="middle"
            dataSource={data.recent}
            pagination={false}
            scroll={{ x: 560 }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    isAdmin
                      ? "No review activity across the platform yet."
                      : "No activity yet. Share a QR code to collect your first rating."
                  }
                />
              ),
            }}
            columns={[
              {
                title: "Location",
                render: (_, row) => (
                  <div>
                    <strong>{row.qrCode.location.name}</strong>
                    <div style={{ color: "#647573", fontSize: 12 }}>
                      {row.qrCode.location.business.name}
                    </div>
                  </div>
                ),
              },
              {
                title: "QR code",
                render: (_, row) => row.qrCode.name || row.qrCode.slug,
              },
              {
                title: "Rating",
                dataIndex: "rating",
                render: (value) => (
                  <span style={{ color: "#936919" }}>★ {value ?? "—"}</span>
                ),
              },
              {
                title: "Status",
                dataIndex: "status",
                render: (value) => (
                  <Tag color={value === "GOOGLE_CLICKED" ? "green" : "default"}>
                    {value.replaceAll("_", " ")}
                  </Tag>
                ),
              },
              {
                title: "Created (UTC)",
                dataIndex: "createdAt",
                render: (value) =>
                  new Date(value).toISOString().slice(0, 16).replace("T", " "),
              },
            ]}
          />
        </Card>
        <Card title="Top locations by scans">
          {data.topLocations.length ? (
            data.topLocations.map((location, index) => (
              <div key={location.id} className="mb-5">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={
                      isAdmin
                        ? "/admin/businesses"
                        : `/locations/${location.id}`
                    }
                  >
                    <strong>
                      {index + 1}. {location.name}
                    </strong>
                  </Link>
                  <span>{location.scans}</span>
                </div>
                <div style={{ color: "#647573", fontSize: 12 }}>
                  {location.business}
                </div>
                <Progress
                  percent={data.scans ? (location.scans / data.scans) * 100 : 0}
                  showInfo={false}
                  strokeColor="#176b5b"
                />
              </div>
            ))
          ) : (
            <Empty description="Your locations will appear here" />
          )}
        </Card>
      </div>
      <Card title="Top QR codes by scans" className="mt-6">
        <Table
          rowKey="id"
          dataSource={data.topQRCodes}
          pagination={false}
          scroll={{ x: 520 }}
          locale={{
            emptyText: <Empty description="Your QR codes will appear here" />,
          }}
          columns={[
            { title: "QR code", render: (_, row) => row.name || row.slug },
            { title: "Location", render: (_, row) => row.location.name },
            {
              title: "Business",
              render: (_, row) => row.location.business.name,
            },
            {
              title: "Scans",
              align: "right",
              render: (_, row) => row._count.scans,
            },
          ]}
        />
      </Card>
      {!analytics && (
        <Card
          title="Recent businesses"
          className="mt-6"
          extra={
            <Link href={isAdmin ? "/admin/businesses" : "/businesses"}>
              View all <ArrowRightOutlined />
            </Link>
          }
        >
          {data.recentBusinesses.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {data.recentBusinesses.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <span className="stat-icon">
                    <ShopOutlined />
                  </span>
                  <div>
                    <Link
                      href={
                        isAdmin ? "/admin/businesses" : `/businesses/${b.id}`
                      }
                    >
                      <strong>{b.name}</strong>
                    </Link>
                    <div
                      className="mt-1"
                      style={{ color: "#647573", fontSize: 13 }}
                    >
                      {b.category.name} · {b._count.locations} locations
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              description={
                isAdmin
                  ? "No businesses have been created by merchants yet."
                  : "Create your first business to get started"
              }
            >
              <Link href={isAdmin ? "/admin/businesses" : "/businesses"}>
                <Button type="primary">
                  {isAdmin ? "View all businesses" : "Create business"}
                </Button>
              </Link>
            </Empty>
          )}
        </Card>
      )}
      <p className="page-description mt-5" style={{ fontSize: 12 }}>
        QR scans count active review page openings, including repeat visits and
        refreshes. They do not measure unique visitors or completed Google
        reviews. The existing Conversion Rate KPI measures Google clicks per
        engaged review session; the funnel shows scan-based overall conversion.
      </p>
    </>
  );
}
