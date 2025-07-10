import React from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";
import NavComponent from "./components/Nav";

export interface UserInfo {
  email: string;
  port_start: number;
  port_end: number;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// eslint-disable-next-line react-refresh/only-export-components
export async function clientLoader() {
  const res = await fetch(`${backendUrl}/me`, { credentials: "include" });
  const userInfo = await res.json();
  if (!res.ok) return;
  return userInfo;
}

// HydrateFallback is rendered while the client loader is running
export function HydrateFallback() {
  return <div className="h-screen flex items-center justify-center">
    <div className="lum-loading animate-spin w-8 h-8 border-3" />
  </div>;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const userInfo = useLoaderData() as UserInfo | undefined;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <Meta />
        <Links />
        <title>3Compute</title>
      </head>
      <body className="bg-bg text-lum-text mt-20">
        <NavComponent userInfo={userInfo} />
        {children}
        <Scripts />
        <ScrollRestoration />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <Outlet />
  );
}