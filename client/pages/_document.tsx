import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Preload resources */}
          <link rel="preload" href="/styles/main.css" as="style" />
          <link rel="preload" href="/scripts/main.js" as="script" />
          <link rel="preload" href="/images/logo.png" as="image" />
          {/* Add other global styles or meta tags here */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;