import { AngeSymbol } from '@styles/ange-symbol';
import React from 'react';

export interface AppConfig {
  symbol: React.ReactNode | null;
  applicationName: string;
}
export const appConfig: AppConfig = {
  symbol: symbolByMunicipalityId(),
  applicationName: process.env.NEXT_PUBLIC_APPLICATION_NAME || 'appen',
};

export function symbolByMunicipalityId(): React.ReactNode | null {
  if (typeof window !== 'undefined' && window.Cypress) return null;

  if (process.env.NEXT_PUBLIC_MUNICIPALITY_ID === '2260') {
    //Ånge
    // const modulePath = 'src/styles/ange-symbol';
    // const { AngeSymbol } = require(modulePath);
    // return React.createElement(AngeSymbol);
    return <AngeSymbol />;
  }
  //Sundsvall eller annat
  return null;
}
