// Only Al-Fatiha (page 1) ships inside the app: the first-run tour reads it before anything is downloaded.
// Every other page comes from the downloaded resource pack (src/lib/localResources.ts).
import type { PagePolygon } from '../lib/cropSvg';

export const TOUR_PAGE = { svg: require('../../assets/pages/001.svg.br') as number, json: require('../../assets/pages/001.json') as PagePolygon[] };
