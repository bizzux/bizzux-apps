import "./globals.css";

export const metadata = {
  title: "Bizzux: Apps for your business",
  description: "Sign up, start a free trial, and manage your Bizzux apps.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
