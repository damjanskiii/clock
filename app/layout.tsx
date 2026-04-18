import type { Metadata } from "next";
import "./globals.css";

function resolveSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;

  if (explicitUrl) {
    return explicitUrl.startsWith("http") ? explicitUrl : `https://${explicitUrl}`;
  }

  const vercelProductionUrl =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (vercelProductionUrl) {
    return `https://${vercelProductionUrl}`;
  }

  return "https://clock.damjanski.com";
}

const localTitleScript = `
(() => {
  const pad = (value) => String(value).padStart(2, "0");
  const update = () => {
    const now = new Date();
    document.title = \`\${pad(now.getHours())}:\${pad(now.getMinutes())}\`;
  };
  update();
})();
`;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = resolveSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: "Loading your clock...",
    description: "The DamjaskiOS Clock",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: "WHAT:TIME:IS:IT",
      description: "The DamjaskiOS Clock",
      url: siteUrl,
      siteName: "DamjanskiOS Clock",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "WHAT:TIME:IS:IT",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "WHAT:TIME:IS:IT",
      description: "The DamjaskiOS Clock",
      images: ["/twitter-image"],
    },
    icons: {
      icon: [
        {
          url: "https://www.damjanski.app/favicon.png",
          type: "image/png",
        },
      ],
      shortcut: ["https://www.damjanski.app/favicon.png"],
      apple: [
        {
          url: "https://www.damjanski.app/favicon.png",
        },
      ],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: localTitleScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
