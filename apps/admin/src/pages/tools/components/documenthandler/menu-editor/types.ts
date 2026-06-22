export interface MenuIcon {
  materialUiIconName: string;
  fontSize: string;
}

export interface MenuConfigItem {
  title: string;
  folder?: string;
  document: string;
  color: string;
  icon: MenuIcon;
  maplink: string;
  link: string;
  expandedSubMenu?: boolean;
  menu: MenuConfigItem[];
}

export interface MenuConfig {
  menu: MenuConfigItem[];
}

export interface MenuTreeNode {
  id: string;
  data: MenuConfigItem;
  /**
   * Tracks which optional fields were present on the original input so fromTree
   * can emit them exactly as-is and avoid polluting clean configs.
   */
  hadFolder: boolean;
  hadExpandedSubMenu: boolean;
  userTouchedFolder: boolean;
  userTouchedExpandedSubMenu: boolean;
  /**
   * Original key order of the raw input object; used by fromTree to preserve
   * byte-identical round-trips for existing configs.
   */
  originalKeyOrder: string[] | null;
  children: MenuTreeNode[];
}
