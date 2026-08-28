/**
 * Image Editor tool strip — intentionally empty.
 * Circle 2edit is a standalone product at /studio/image/circle-remove,
 * not a tool inside Image Studio.
 */
type Tool = {
  id: string;
  label: string;
  prompt: string;
  uiOnly?: boolean;
};

type Props = {
  onSelectTool: (tool: Tool) => void;
  disabled?: boolean;
  hasImage?: boolean;
};

export function EditorToolCategories(_props: Props) {
  return null;
}
