import type { RdfMap, DfRow, XidMap } from "./types";

const SLICE_SIZE = 5000;

const reBlankBracket = /(<_:\S+>)/g;
const reTriple = /(<\S+>)\s+(<\S+>)\s+(.*)\s+([.*])$/;
const reColumn = /(\[[\w .,|]+\])/g;
const reUid = /<_:[^>]*?(\[[^\]]+\])(?:[^>]*?(\[[^\]]+\]))?[^>]*?>/g;
const reFunctions = /(^[^"]*)=(\w+)\(([^)]+)?\)(.*)$/;

export function substituteXid(
  matchObj: RegExpMatchArray,
  xidmap: XidMap,
): string {
  const bn = matchObj[1];
  if (bn in xidmap) {
    return xidmap[bn];
  } else {
    return bn;
  }
}

export function rdfMapToRdf(
  rdfMap: RdfMap,
  func: (body: string) => void,
): void {
  const rdfBuffer: string[] = [];

  for (const k in rdfMap) {
    const value = rdfMap[k];
    if (Array.isArray(value)) {
      for (const e of value) {
        const line = `${k} ${e} .`;
        addToRdfBuffer(line, rdfBuffer, func, true);
      }
    } else {
      const line = `${k} ${value} .`;
      addToRdfBuffer(line, rdfBuffer, func);
    }
  }

  flushRdfBuffer(rdfBuffer, func);
}

export function rdfMapToString(rdfMap: RdfMap, xidmap: XidMap): string {
  let result = "";
  const f = (body: string) => {
    const substituted = body.replace(reBlankBracket, (match, ...args) => {
      const matchObj = [match, args[0], ...args.slice(1)];
      return substituteXid(matchObj as RegExpMatchArray, xidmap);
    });

    // Ensure each triple ends with a newline
    result += substituted;
  };

  rdfMapToRdf(rdfMap, f);
  return result;
}

export function addToRdfBuffer(
  rdf: string,
  rdfBuffer: string[],
  func: (body: string) => void,
  isList = false,
): void {
  rdfBuffer.push(rdf + "\n");
  if (rdfBuffer.length > SLICE_SIZE && !isList) {
    func(rdfBuffer.join(""));
    rdfBuffer.length = 0;
  }
}

export function flushRdfBuffer(
  rdfBuffer: string[],
  func: (body: string) => void,
): void {
  if (rdfBuffer.length > 0) {
    func(rdfBuffer.join(""));
    rdfBuffer.length = 0;
  }
}
export function addRdfToMap(rdfMap: RdfMap, rdf: string): void {
  if (!rdf.includes('"nan"')) {
    const m = rdf.match(reTriple);
    if (m) {
      const parts = m.slice(1);
      const key = `${parts[0]} ${parts[1]}`;

      if (parts[3] === "*") {
        if (key in rdfMap) {
          (rdfMap[key] as string[]).push(parts[2]);
        } else {
          rdfMap[key] = [parts[2]];
        }
      } else {
        rdfMap[key] = parts[2];
      }
    }
  }
}

export function substitute(
  matchObj: RegExpMatchArray,
  row: DfRow,
  nospace = false,
): string {
  let replaced = matchObj[0];

  for (let i = 1; i <= matchObj.length - 1; i++) {
    const matchGroup = matchObj[i];

    if (!matchGroup || typeof matchGroup !== "string") {
      continue;
    }

    const fieldAndFunc = matchGroup.slice(1, -1).split(",");
    const field = fieldAndFunc[0];

    let val = String(row[field] ?? "")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");

    if (nospace) {
      val = val.replace(/\W/g, "_");
    }

    if (fieldAndFunc.length > 1) {
      const func = fieldAndFunc[1];
      if (func === "nospace") {
        val = val.replace(/\s/g, "_");
      } else if (func === "toUpper") {
        val = val.toUpperCase();
      } else if (func === "toLower") {
        val = val.toLowerCase();
      } else {
        throw new Error(`unsupported function ${func}`);
      }
    }

    replaced = replaced.replace(matchGroup, val);
  }

  return replaced;
}

export function substituteInUid(
  matchObj: RegExpMatchArray,
  row: DfRow,
): string {
  return substitute(matchObj, row, true); // The 'true' parameter ensures IDs are properly sanitized
}

export function substituteInValue(
  matchObj: RegExpMatchArray,
  row: DfRow,
): string {
  return substitute(matchObj, row, false);
}

export function substituteFunctions(matchObj: RegExpMatchArray): string {
  const func = matchObj[2];
  const params = matchObj[3]?.split(",") || [];

  if (func === "geoloc") {
    const lat = parseFloat(params[0]);
    const lng = parseFloat(params[1]);
    return `${matchObj[1]}"{'type':'Point','coordinates':[${lng.toFixed(8)},${lat.toFixed(8)}]}"^^<geo:geojson>${matchObj[4]}`;
  }

  if (func === "datetime") {
    const dateString = params[0];
    // Simple date parsing - for more complex formats, use date-fns
    const date = new Date(dateString);
    return `${matchObj[1]}"${date.toISOString()}"${matchObj[4]}`;
  }

  if (func === "randomDate") {
    const start = new Date(params[0]);
    const end = new Date(params[1]);
    const randomTime =
      start.getTime() + Math.random() * (end.getTime() - start.getTime());
    const randomDate = new Date(randomTime);
    return `${matchObj[1]}"${randomDate.toISOString().split("T")[0]}"${matchObj[4]}`;
  }

  if (func === "split") {
    const paramString = params[0]?.trim() || "";
    let result = "";

    if (paramString.startsWith("[") && paramString.endsWith("]")) {
      const values = JSON.parse(paramString.replace(/'/g, '"'));
      for (const v of values) {
        result += `${matchObj[1]}"${v.trim()}"${matchObj[4]}\n`;
      }
    } else {
      result = `${matchObj[1]}"${paramString}"${matchObj[4]}\n`;
    }

    return result;
  }

  throw new Error(`unsupported function ${func}`);
}

export function substituteInTemplate(
  template: string,
  row: DfRow,
): string | null {
  const fields = template.match(reColumn) || [];

  for (const field of fields) {
    const column = field.slice(1, -1).split(",")[0];
    if (String(row[column]) === "nan") {
      return null;
    }
  }

  let result = template;
  result = result.replace(reUid, (match, ...args) => {
    const matchObj = [match, ...args];
    return substituteInUid(matchObj as RegExpMatchArray, row);
  });

  result = result.replace(reColumn, (match, ...args) => {
    const matchObj = [match, ...args];
    return substituteInValue(matchObj as RegExpMatchArray, row);
  });

  result = result.replace(reFunctions, (match, ...args) => {
    const matchObj = [match, ...args];
    return substituteFunctions(matchObj as RegExpMatchArray);
  });

  return result;
}

export function transformDataFrame(df: DfRow[], template: string): RdfMap {
  const validTemplates = template
    .split("\n")
    .filter((line) => !line.startsWith("#"));

  const rdfMap: RdfMap = {};

  df.forEach((row, index) => {
    row.LINE_NUMBER = index;

    validTemplates.forEach((rdftemplate) => {
      const rdf = substituteInTemplate(rdftemplate, row);
      if (rdf !== null) {
        rdf.split("\n").forEach((r) => {
          if (r.trim()) {
            addRdfToMap(rdfMap, r);
          }
        });
      }
    });
  });

  return rdfMap;
}

export function dfToRdfMap(df: DfRow[], template: string): RdfMap {
  return transformDataFrame(df, template);
}

export function dfToRdf(
  df: DfRow[],
  template: string,
  outputCallback: (rdf: string) => void,
  xidmap: XidMap = {},
): XidMap {
  const rdfMap = dfToRdfMap(df, template);
  const rdfString = rdfMapToString(rdfMap, xidmap);
  outputCallback(rdfString);
  return xidmap;
}
