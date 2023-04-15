export const routerPathConcat = (...paths: (string | undefined)[]) => {
  let res = '';
  for (const path of paths) {
    if (!path) {
      continue;
    }
    const path_ = path.trim() as string;

    if (path_.startsWith('/')) {
      res = path_;
    } else {
      res = pathConcat(res, path_);
    }
  }
  if (!res.startsWith('/')) {
    res = '/' + res;
  }
  return res;
};

export function pathConcat(path1: string, path2: string) {
  if (path1.endsWith('/')) {
    path1 = path1.slice(0, -1);
  }
  if (path2.startsWith('/')) {
    path2 = path2.slice(1);
  }
  return path1 + '/' + path2;
}
