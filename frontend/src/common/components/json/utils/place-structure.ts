import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';

/**
 * Platsvalet skrivs av web-app-katla-sm som namn ur labelstrukturen: `orgName` är den valda noden och
 * `parentOrgName` dess förälder. Vilken nivå namnen ligger på framgår inte av den sparade datan, så
 * strukturen måste slås upp för att veta vad som är anläggning och vad som är avdelning. Nivåerna
 * speglar Katlas frontend/src/utils/label-structure.ts och måste hållas i takt med den.
 */
const PLACE_STRUCTURE_ROOT_NAMES = ['platsstruktur', 'place_structure', 'placestructure'];
const PLACE_STRUCTURE_ROOT_LEVEL = 2;
const PLACE_LEVEL = 6;
const DEPARTMENT_LEVEL = 7;

export interface PlaceNode {
  /** Labelnoden själv */
  label: Label;
  /** Kedjan från platsstrukturens rot ner till och med noden */
  path: Label[];
}

export interface PlacePresentation {
  place: string;
  department?: string;
}

const normalizeName = (value: string | undefined): string => (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const labelName = (label: Label): string => label.displayName || label.resourceName;

const isSameLabel = (left: Label | undefined, right: Label | undefined): boolean => {
  if (!left || !right) return false;
  if (left.id && right.id) return left.id === right.id;
  if (left.resourcePath && right.resourcePath) return left.resourcePath === right.resourcePath;
  return normalizeName(left.resourceName) === normalizeName(right.resourceName);
};

const getPlaceStructureRoot = (labelStructure: readonly Label[] | undefined): Label | undefined =>
  labelStructure?.find(
    (label) =>
      PLACE_STRUCTURE_ROOT_NAMES.includes(normalizeName(label.resourceName)) ||
      PLACE_STRUCTURE_ROOT_NAMES.includes(normalizeName(label.displayName))
  );

/** Alla noder under platsstrukturens rot, var och en med sin väg från roten */
export const getPlaceNodes = (labelStructure: readonly Label[] | undefined): PlaceNode[] => {
  const root = getPlaceStructureRoot(labelStructure);
  if (!root) return [];

  const nodes: PlaceNode[] = [];
  const traverse = (label: Label, ancestors: Label[]) => {
    const path = [...ancestors, label];
    nodes.push({ label, path });
    label.labels?.forEach((child) => traverse(child, path));
  };

  root.labels?.forEach((child) => traverse(child, [root]));

  return nodes;
};

const placeName = (node: PlaceNode): string => labelName(node.label);

/** Föräldern inom platsstrukturen. Roten räknas inte som förälder. */
const placeParentName = (node: PlaceNode): string | undefined => {
  const parent = node.path[node.path.length - 2];
  return parent && !isSameLabel(parent, node.path[0]) ? labelName(parent) : undefined;
};

const labelAtLevel = (node: PlaceNode, level: number): Label | undefined =>
  node.path[level - PLACE_STRUCTURE_ROOT_LEVEL];

/**
 * Nivå 6 är platsen som visas. Nivå 7 är en valfri avdelning under platsen. Ett ofullständigt val på
 * nivå 3–5 visas som noden själv, precis som i Katla.
 */
export const getPlacePresentation = (node: PlaceNode): PlacePresentation => {
  const place = labelAtLevel(node, PLACE_LEVEL) ?? node.label;
  const department = labelAtLevel(node, DEPARTMENT_LEVEL);

  return {
    place: labelName(place),
    ...(department ? { department: labelName(department) } : {}),
  };
};

/**
 * Slår upp en nod på visningsnamn. Sista nivån är inte unik i sig — "Blå" finns under flera enheter —
 * så föräldern används som kvalificerare. Flera träffar räknas som ingen träff, då visas namnen som de
 * sparades i stället för att en gissad nivåtolkning presenteras som fakta.
 */
export const findPlaceNode = (
  nodes: readonly PlaceNode[],
  name: string | undefined,
  parentName?: string
): PlaceNode | undefined => {
  const wanted = normalizeName(name);
  if (!wanted) return undefined;

  const matches = nodes.filter((node) => normalizeName(placeName(node)) === wanted);
  if (matches.length <= 1) return matches[0];

  const wantedParent = normalizeName(parentName);
  if (!wantedParent) return undefined;

  const withParent = matches.filter((node) => normalizeName(placeParentName(node)) === wantedParent);
  return withParent.length === 1 ? withParent[0] : undefined;
};
