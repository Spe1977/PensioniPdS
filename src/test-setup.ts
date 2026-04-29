import '@angular/compiler';
import 'zone.js';
import 'zone.js/testing';
import { ReadableStream } from 'node:stream/web';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

if (!globalThis.ReadableStream) {
  Object.defineProperty(globalThis, 'ReadableStream', {
    configurable: true,
    value: ReadableStream,
  });
}
