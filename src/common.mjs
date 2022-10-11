import * as path from 'path';
import { fileURLToPath } from "url";


export function dirname() {
  return path.dirname(filename());
}

export function filename() {
  return fileURLToPath(import.meta.url);
}