import { commonMethodGen } from './util.mjs';
import { Method } from '../enum.mjs';
import 'reflect-metadata';

export function Get(path = ''): any {
  return commonMethodGen(path, Method.GET);
}

export function Post(path = ''): any {
  return commonMethodGen(path, Method.POST);
}

export function Put(path = ''): any {
  return commonMethodGen(path, Method.PUT);
}

export function Delete(path = ''): any {
  return commonMethodGen(path, Method.DELETE);
}

export function Options(path = ''): any {
  return commonMethodGen(path, Method.OPTIONS);
}

export function Patch(path = ''): any {
  return commonMethodGen(path, Method.PATCH);
}

export function Head(path = ''): any {
  return commonMethodGen(path, Method.HEAD);
}
