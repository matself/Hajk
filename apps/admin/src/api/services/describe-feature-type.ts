export interface DescribeFeatureProperty {
  index: number;
  name: string;
  localType: string;
  type: string;
  hidden?: boolean;
  nillable?: boolean;
  maxOccurs?: number;
  minOccurs?: number;
}

function parseDescribeFeatureTypeXml(xmlText: string): DescribeFeatureProperty[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  const elements = Array.from(
    xmlDoc.getElementsByTagNameNS("*", "element"),
  ).filter((el) => el.getAttribute("name"));

  return elements.map((el, index) => {
    const name = el.getAttribute("name") ?? "";
    const type = el.getAttribute("type") ?? "";
    const localType = type.includes(":") ? type.split(":")[1] : type;
    return {
      index,
      name,
      localType,
      type,
      hidden: el.getAttribute("hidden") === "true",
      nillable: el.getAttribute("nillable") === "true",
      maxOccurs: Number.parseInt(el.getAttribute("maxOccurs") ?? "1", 10) || 1,
      minOccurs: Number.parseInt(el.getAttribute("minOccurs") ?? "0", 10) || 0,
    };
  });
}

function parseDescribeFeatureTypeJson(data: unknown): DescribeFeatureProperty[] {
  const rec = data as {
    featureTypes?: { properties?: DescribeFeatureProperty[] }[];
  };
  const properties = rec.featureTypes?.[0]?.properties;
  if (!Array.isArray(properties)) return [];
  return properties.map((p, index) => ({
    index,
    name: p.name,
    localType: p.localType ?? p.type ?? "string",
    type: p.type ?? p.localType ?? "string",
    hidden: Boolean(p.hidden),
    nillable: Boolean(p.nillable),
    maxOccurs: p.maxOccurs ?? 1,
    minOccurs: p.minOccurs ?? 0,
  }));
}

export async function fetchDescribeFeatureType(
  baseUrl: string,
  typeName: string,
): Promise<DescribeFeatureProperty[]> {
  const url = new URL(baseUrl);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("request", "describeFeatureType");
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("typename", typeName);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `DescribeFeatureType failed with status ${response.status}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    const data: unknown = await response.json();
    return parseDescribeFeatureTypeJson(data);
  }

  const xmlText = await response.text();
  if (xmlText.trim().startsWith("{")) {
    return parseDescribeFeatureTypeJson(JSON.parse(xmlText) as unknown);
  }

  return parseDescribeFeatureTypeXml(xmlText);
}
