import "./globals.css";

export const metadata = {
  title: "TrueERP 跨境电商管理系统",
  description: "采购、库存、订单和发货一体化管理",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
