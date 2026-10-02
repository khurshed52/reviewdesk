"use client";
import { App, ConfigProvider } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <StyleProvider layer>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#176b5b",
            colorInfo: "#176b5b",
            colorText: "#142a29",
            colorTextSecondary: "#647573",
            colorBgLayout: "#f3f6f6",
            borderRadius: 10,
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 14,
            controlHeight: 42,
          },
          components: {
            Layout: {
              headerBg: "#ffffff",
              siderBg: "#102e2a",
              bodyBg: "#f3f6f6",
            },
            Menu: {
              darkItemBg: "#102e2a",
              darkItemSelectedBg: "#245249",
              darkItemHoverBg: "#1c413a",
              itemHeight: 46,
            },
            Card: { headerFontSize: 16 },
            Table: { headerBg: "#f6f8f8" },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  );
}
