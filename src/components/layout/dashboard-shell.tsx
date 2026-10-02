"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Avatar,
  Breadcrumb,
  Button,
  Drawer,
  Dropdown,
  Layout,
  Menu,
  Tag,
} from "antd";
import {
  AppstoreOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  QrcodeOutlined,
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
  DatabaseOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Brand } from "@/components/common/brand";
import { logoutAction } from "@/actions/auth.actions";
const base = [
  { key: "/dashboard", label: "Dashboard", icon: <AppstoreOutlined /> },
  { key: "/businesses", label: "Businesses", icon: <ShopOutlined /> },
  { key: "/locations", label: "Locations", icon: <EnvironmentOutlined /> },
  { key: "/qr-codes", label: "QR Codes", icon: <QrcodeOutlined /> },
  { key: "/analytics", label: "Analytics", icon: <BarChartOutlined /> },
  { key: "/settings", label: "Settings", icon: <SettingOutlined /> },
];
const admin = [
  { key: "/admin/merchants", label: "Merchants", icon: <TeamOutlined /> },
  { key: "/admin/businesses", label: "All Businesses", icon: <ShopOutlined /> },
  { key: "/admin/usage", label: "System Usage", icon: <DatabaseOutlined /> },
];
export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    name: string | null;
    email: string;
    role: string;
    merchant: { name: string } | null;
  };
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const items = user.role === "ADMIN" ? [base[0], ...admin, base[5]] : base;
  const current = items.find(
    (i) => pathname === i.key || pathname.startsWith(i.key + "/"),
  );
  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[current?.key ?? "/dashboard"]}
      items={items.map((i) => ({
        ...i,
        label: (
          <Link href={i.key} onClick={() => setMobile(false)}>
            {i.label}
          </Link>
        ),
      }))}
      style={{ border: 0, padding: "0 10px" }}
    />
  );
  return (
    <Layout style={{ minHeight: "100dvh" }}>
      <Layout.Sider
        className="desktop-sidebar"
        width={244}
        collapsed={collapsed}
        collapsedWidth={84}
      >
        <div className="sidebar-brand">
          {collapsed ? (
            <QrcodeOutlined style={{ fontSize: 28, color: "#c9f07b" }} />
          ) : (
            <Brand />
          )}
        </div>
        {!collapsed && <div className="sidebar-label">WORKSPACE</div>}
        {menu}
      </Layout.Sider>
      <Drawer
        title={<Brand />}
        placement="left"
        open={mobile}
        onClose={() => setMobile(false)}
        styles={{ body: { padding: 0, background: "#102e2a" } }}
      >
        {menu}
      </Drawer>
      <Layout>
        <Layout.Header
          style={{
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            height: 76,
            borderBottom: "1px solid #e5ece9",
          }}
        >
          <div className="flex items-center gap-3">
            <Button
              className="mobile-menu"
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            />
            <Button
              className="desktop-toggle"
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Toggle sidebar"
            />
            <span className="header-company" style={{ fontWeight: 600 }}>
              {user.role === "ADMIN"
                ? "Administration"
                : (user.merchant?.name ?? "Merchant workspace")}
            </span>
            <Tag color="green">
              {user.role === "ADMIN" ? "Admin" : "Workspace"}
            </Tag>
          </div>
          <Dropdown
            menu={{
              items: [
                {
                  key: "settings",
                  label: <Link href="/settings">Account settings</Link>,
                  icon: <SettingOutlined />,
                },
                {
                  key: "logout",
                  label: "Log out",
                  icon: <LogoutOutlined />,
                  onClick: () => {
                    void logoutAction();
                  },
                },
              ],
            }}
            trigger={["click"]}
          >
            <Button type="text">
              <Avatar
                size="small"
                style={{ background: "#e8f0ed", color: "#176b5b" }}
              >
                {(user.name || user.email).slice(0, 1).toUpperCase()}
              </Avatar>
              <span>{user.name || "Account"}</span>
              <DownOutlined />
            </Button>
          </Dropdown>
        </Layout.Header>
        <Layout.Content>
          <div className="dashboard-content">
            <Breadcrumb
              style={{ marginBottom: 24 }}
              items={[
                { title: <Link href="/dashboard">Workspace</Link> },
                { title: current?.label ?? "Details" },
                ...(pathname.split("/").length > 2 &&
                !pathname.startsWith("/admin")
                  ? [{ title: "Details" }]
                  : []),
              ]}
            />
            {children}
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
