import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Inject Farcaster Frame SDK via CDN for Mini App environments */}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `import { sdk } from 'https://esm.sh/@farcaster/frame-sdk'; window.sdk = sdk;`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 