export interface LineState {
  text: string;
  justificationKind: "given" | "reflexive";
}

export type MacroVisibility = "hidden" | "collapsed" | "always";

export interface Settings {
  macroVisibility: MacroVisibility;
}
