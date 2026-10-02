"use client";
import { Card, Descriptions, Tag } from "antd";
import { PageHeading } from "@/components/common/page-heading";
export function Account({
  user,
}: {
  user: {
    name: string | null;
    email: string;
    role: string;
    merchant: { name: string } | null;
  };
}) {
  return (
    <>
      <PageHeading
        title="Settings"
        description="Your account and workspace details."
      />
      <Card title="Account">
        <Descriptions
          column={{ xs: 1, md: 2 }}
          items={[
            { key: "name", label: "Name", children: user.name || "—" },
            { key: "email", label: "Email", children: user.email },
            {
              key: "company",
              label: "Workspace",
              children: user.merchant?.name || "Administration",
            },
            {
              key: "role",
              label: "Role",
              children: <Tag color="green">{user.role}</Tag>,
            },
          ]}
        />
      </Card>
    </>
  );
}
