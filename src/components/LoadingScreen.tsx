import React from 'react';
import GlobalLoader from './GlobalLoader';

export default function LoadingScreen({ title = "SJHL OPD" }: { title?: string }) {
  return (
    <GlobalLoader size="full" message={title} useCustomLogo={true} />
  );
}
